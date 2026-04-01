import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, X, UserPlus, Save, Loader2, Upload } from 'lucide-react';
import { addMemory, updateMemory } from '../services/memoryService';
import { searchUsers, loginWithGoogle, getUserProfile, reconnectGoogleDrive } from '../services/authService';
import { getOrCreateFolder, uploadFileToDrive, getAccessToken, getDirectDriveUrl, shareFileWithEmails } from '../services/driveService';
import { checkFirestoreConnection } from '../lib/firebase';
import { UserProfile, Memory } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface MemoryFormProps {
  userId: string;
  date: Date;
  editingMemory?: Memory | null;
  onSuccess: () => void;
}

export function MemoryForm({ userId, date, editingMemory, onSuccess }: MemoryFormProps) {
  const [text, setText] = useState(editingMemory?.text || '');
  const [mediaUrls, setMediaUrls] = useState<string[]>(editingMemory?.mediaUrls || []);
  const [taggedUsers, setTaggedUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (editingMemory) {
      setText(editingMemory.text);
      setMediaUrls(editingMemory.mediaUrls || []);
      
      // Fetch tagged user profiles
      const fetchTaggedProfiles = async () => {
        const profiles = await Promise.all(
          editingMemory.taggedUserIds.map(id => getUserProfile(id))
        );
        setTaggedUsers(profiles.filter((p): p is UserProfile => p !== null));
      };
      fetchTaggedProfiles();
    } else {
      setText('');
      setMediaUrls([]);
      setTaggedUsers([]);
    }
  }, [editingMemory]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleReconnect = async () => {
    try {
      setIsUploading(true);
      await reconnectGoogleDrive();
      setDriveError(null);
      // After reconnection, we don't auto-trigger upload because we don't have the files anymore
      // We just tell the user they are connected
    } catch (error: any) {
      setDriveError(`Reconnection failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setDriveError(null);

    if (!getAccessToken()) {
      setDriveError('Drive connection required. Please connect your Google Drive to upload media.');
      return;
    }

    setIsUploading(true);
    try {
      const folderId = await getOrCreateFolder('Memo Data');
      const uploadPromises = Array.from(files).map(async (file) => {
        const url = await uploadFileToDrive(file, folderId);
        return url;
      });
      const urls = await Promise.all(uploadPromises);
      setMediaUrls([...mediaUrls, ...urls]);
    } catch (error: any) {
      console.error('Upload failed:', error);
      const isAuthError = error.message.includes('expired') || error.message.includes('permission denied') || error.message.includes('Not connected');
      
      if (isAuthError) {
        setDriveError(error.message.includes('permission') 
          ? '🚨 Google Drive permission denied. Please ensure you granted access during login.'
          : 'Your Google Drive session has expired. Please reconnect to continue uploading.');
      } else {
        setDriveError(`Upload failed: ${error.message || 'Please try again.'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddMedia = () => {
    document.getElementById('file-upload')?.click();
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchUsers(query);
    setSearchResults(results.filter(u => u.uid !== userId && !taggedUsers.find(t => t.uid === u.uid)));
    setIsSearching(false);
  };

  const handleTagUser = (user: UserProfile) => {
    setTaggedUsers([...taggedUsers, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      // Check Firestore connection first
      const isOnline = await checkFirestoreConnection();
      if (!isOnline) {
        alert("🚨 Firestore is OFFLINE. Please create the database in your Firebase Console (memodate-f33b9) to save memories.");
        setIsSubmitting(false);
        return;
      }

      // Share files with tagged users if any
      if (taggedUsers.length > 0 && mediaUrls.length > 0) {
        const emails = taggedUsers.map(u => u.email).filter(Boolean);
        if (emails.length > 0) {
          const sharePromises = mediaUrls.map(async (url) => {
            // Extract file ID from lh3.googleusercontent.com/d/[ID]=s1000
            const idMatch = url.match(/\/d\/([^=]+)/);
            if (idMatch) {
              await shareFileWithEmails(idMatch[1], emails);
            }
          });
          await Promise.all(sharePromises);
        }
      }

      const memoryData = {
        userId,
        date: format(date, 'yyyy-MM-dd'),
        text,
        mediaUrls,
        taggedUserIds: taggedUsers.map(u => u.uid),
      };

      if (editingMemory) {
        await updateMemory(editingMemory.id, memoryData);
      } else {
        await addMemory(memoryData);
      }
      
      onSuccess();
      if (!editingMemory) {
        setText('');
        setMediaUrls([]);
        setTaggedUsers([]);
      }
    } catch (error) {
      console.error('Failed to add memory:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-6 transition-colors duration-300">
      <div className="space-y-2">
        <label className="text-xs font-sans font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {editingMemory ? 'Edit Memory' : 'New Memory'} for {format(date, 'MMMM d, yyyy')}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What happened today? 🌸"
          className="w-full min-h-[120px] p-4 bg-rose-50/50 dark:bg-gray-800/50 border-none rounded-2xl focus:ring-2 focus:ring-rose-400 dark:focus:ring-rose-700 resize-none text-gray-800 dark:text-gray-100 font-sans font-medium placeholder-gray-400 dark:placeholder-gray-500 transition-all"
        />
      </div>

      {/* Media Preview */}
      <AnimatePresence>
        {driveError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                {driveError}
              </p>
              <button
                type="button"
                onClick={handleReconnect}
                className="flex items-center gap-2 px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3 h-3 ${isUploading ? 'animate-spin' : ''}`} />
                {isUploading ? 'Connecting...' : 'Reconnect Google Drive'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mediaUrls && mediaUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {mediaUrls.map((url, idx) => (
            <div key={idx} className="relative flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden group bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
              <img 
                src={getDirectDriveUrl(url)} 
                alt="Media" 
                className="w-full h-full object-cover transition-opacity duration-300 opacity-0" 
                referrerPolicy="no-referrer"
                onLoad={(e) => {
                  (e.target as HTMLImageElement).classList.add('opacity-100');
                  (e.target as HTMLImageElement).classList.remove('opacity-0');
                }}
                onError={(e) => {
                  console.error('Media load error:', url);
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/1920/1080?blur=4';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 -z-10">
                <Loader2 className="w-4 h-4 text-rose-200 dark:text-rose-900/50 animate-spin" />
              </div>
              <button
                type="button"
                onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tagged Users */}
      <div className="flex flex-wrap gap-2">
        {taggedUsers.map((user) => (
          <div key={user.uid} className="flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 px-3 py-1 rounded-full text-sm font-medium border border-rose-100 dark:border-rose-900/30">
            <span>@{user.username}</span>
            <button type="button" onClick={() => setTaggedUsers(taggedUsers.filter(u => u.uid !== user.uid))}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddMedia}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <ImageIcon className="w-4 h-4" />
            Add Media
          </button>
          
          <div className="relative">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium cursor-pointer">
              <UserPlus className="w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Tag user..."
                className="bg-transparent border-none focus:ring-0 p-0 w-24 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50"
                >
                  {searchResults.map((user) => (
                    <button
                      key={user.uid}
                      type="button"
                      onClick={() => handleTagUser(user)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-xs">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.username}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <button
          type="submit"
          disabled={!text.trim() || isSubmitting || isUploading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-lg shadow-rose-200 dark:shadow-rose-900/20"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isUploading ? 'Uploading...' : 'Save Memory'}
        </button>
      </div>
      <input
        id="file-upload"
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </form>
  );
}
