export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  themePreference?: 'system' | 'light' | 'dark';
}

export interface Memory {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  text: string;
  mediaUrls: string[];
  taggedUserIds: string[];
  createdAt: string;
}
