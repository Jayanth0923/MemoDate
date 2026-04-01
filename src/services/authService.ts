import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';

export const loginWithGoogle = async (forceSelect = false) => {
  try {
    if (forceSelect) {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
    } else {
      googleProvider.setCustomParameters({ prompt: 'consent' });
    }
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Store access token for Google Drive
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      sessionStorage.setItem('google_drive_token', credential.accessToken);
    }
    
    // Check if user profile exists
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const newUser: UserProfile = {
        uid: user.uid,
        username: user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`,
        email: user.email || '',
        photoURL: user.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, newUser);
    }
    
    return user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const reconnectGoogleDrive = async () => {
  try {
    // Force consent to ensure we get a fresh access token
    googleProvider.setCustomParameters({ prompt: 'consent' });
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      sessionStorage.setItem('google_drive_token', credential.accessToken);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Reconnection error:', error);
    throw error;
  }
};

export const logout = () => {
  sessionStorage.removeItem('google_drive_token');
  return signOut(auth);
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

export const searchUsers = async (searchTerm: string): Promise<UserProfile[]> => {
  try {
    const usersRef = collection(db, 'users');
    // Simple search: filter by username start
    const q = query(usersRef, where('username', '>=', searchTerm), where('username', '<=', searchTerm + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
};
