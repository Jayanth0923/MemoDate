const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3';

export const getAccessToken = () => {
  return sessionStorage.getItem('google_drive_token');
};

export const checkDriveConnection = async (): Promise<boolean> => {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const response = await fetch(`${DRIVE_API_URL}/about?fields=user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const shareFileWithEmails = async (fileId: string, emails: string[]): Promise<void> => {
  const token = getAccessToken();
  if (!token || emails.length === 0) return;

  try {
    const promises = emails.map(async (email) => {
      const response = await fetch(`${DRIVE_API_URL}/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'user',
          emailAddress: email,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.warn(`Failed to share file ${fileId} with ${email}:`, data);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error sharing file:', error);
  }
};

export const getOrCreateFolder = async (folderName: string): Promise<string> => {
  const token = getAccessToken();
  if (!token) throw new Error('Not connected to Google Drive');

  // Search for the folder
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchResponse = await fetch(
    `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const searchData = await searchResponse.json();
  if (!searchResponse.ok) {
    console.error('Drive Search Error:', searchData);
    if (searchResponse.status === 401) {
      sessionStorage.removeItem('google_drive_token');
      throw new Error('Google Drive session expired.');
    }
    if (searchResponse.status === 403) {
      sessionStorage.removeItem('google_drive_token');
      throw new Error('Google Drive permission denied. Please ensure you granted access during login.');
    }
    throw new Error(searchData.error?.message || 'Failed to search for folder');
  }

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create the folder if not found
  const createResponse = await fetch(`${DRIVE_API_URL}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const createData = await createResponse.json();
  if (!createResponse.ok) {
    console.error('Drive Create Error:', createData);
    if (createResponse.status === 401) {
      sessionStorage.removeItem('google_drive_token');
      throw new Error('Google Drive session expired.');
    }
    if (createResponse.status === 403) {
      sessionStorage.removeItem('google_drive_token');
      throw new Error('Google Drive permission denied. Please ensure you granted access during login.');
    }
    throw new Error(createData.error?.message || 'Failed to create folder');
  }
  return createData.id;
};

export const uploadFileToDrive = async (file: File, folderId: string): Promise<string> => {
  const token = getAccessToken();
  if (!token) throw new Error('Not connected to Google Drive');

  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileData = await new Promise<string>((resolve) => {
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 data
      resolve(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  });

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${file.type}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    fileData +
    closeDelimiter;

  const response = await fetch(`${UPLOAD_API_URL}/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Drive API Error:', data);
    if (response.status === 401) {
      sessionStorage.removeItem('google_drive_token');
      throw new Error('Google Drive session expired.');
    }
    if (response.status === 403) {
      sessionStorage.removeItem('google_drive_token');
      throw new Error('Google Drive permission denied. Please ensure you granted access during login.');
    }
    throw new Error(data.error?.message || 'Failed to upload to Google Drive');
  }

  // Always return a consistent direct thumbnail URL using the file ID
  // This makes it easy to extract the ID later for sharing
  return `https://lh3.googleusercontent.com/d/${data.id}=s1000`;
};

export const getDirectDriveUrl = (url: string): string => {
  if (!url) return url;
  
  let fileId = '';
  
  // Handle drive.google.com/file/d/[ID]/view or /edit
  if (url.includes('drive.google.com/file/d/')) {
    const idMatch = url.match(/\/file\/d\/([^/?]+)/);
    if (idMatch) fileId = idMatch[1];
  }
  
  // Handle drive.google.com?id=[ID] or drive.google.com/open?id=[ID] or /uc?id=[ID]
  if (!fileId && url.includes('drive.google.com') && url.includes('id=')) {
    const idMatch = url.match(/[?&]id=([^&]+)/);
    if (idMatch) fileId = idMatch[1];
  }
  
  if (fileId) {
    // This endpoint is more reliable for public embedding
    return `https://lh3.googleusercontent.com/d/${fileId}=s1000`;
  }
  
  // If it's already a thumbnail link but with small size, upgrade it
  if (url.includes('googleusercontent.com') && url.includes('=s')) {
    return url.replace(/=s\d+$/, '=s1000');
  }
  
  return url;
};
