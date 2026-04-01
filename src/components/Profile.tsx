import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar as CalendarIcon, Save, Loader2, CheckCircle2, AlertCircle, LogOut, ChevronLeft, AtSign } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { logout } from '../services/authService';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { format } from 'date-fns';

interface ProfileProps {
  userId: string;
}

export function Profile({ userId }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setProfile(data);
        setUsername(data.username);
      }
    };
    fetchProfile();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || username.length < 3) {
      setMessage({ type: 'error', text: 'Username must be at least 3 characters long.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // Check if username is already taken by someone else
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      const isTaken = querySnapshot.docs.some(doc => doc.id !== userId);
      if (isTaken) {
        setMessage({ type: 'error', text: 'This username is already taken. Try another one! 🌸' });
        setIsSaving(false);
        return;
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { username });
      
      setProfile(prev => prev ? { ...prev, username } : null);
      setMessage({ type: 'success', text: 'Profile updated successfully! ✨' });
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 sm:px-0"
    >
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-rose-500 dark:text-rose-400 font-bold mb-4 sm:hidden"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to Memories
      </button>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-rose-100/50 dark:shadow-rose-900/10 border border-rose-100 dark:border-gray-800 overflow-hidden transition-colors duration-300">
        <div className="bg-gradient-to-br from-rose-400 to-pink-500 dark:from-rose-900 dark:to-pink-900 p-8 sm:p-12 text-white relative transition-colors duration-300">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-4xl sm:text-5xl font-display font-black mb-6 border-2 border-white/30 dark:border-white/10 shadow-xl">
              {profile.username[0].toUpperCase()}
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight mb-2">@{profile.username}</h2>
            <p className="text-rose-50 dark:text-rose-100/80 font-sans font-medium opacity-80 flex items-center gap-2">
              <Mail className="w-4 h-4" /> {profile.email}
            </p>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-300/20 dark:bg-rose-900/40 rounded-full -ml-20 -mb-20 blur-2xl" />
        </div>

        <div className="p-8 sm:p-12 space-y-8">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-sans font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                <AtSign className="w-4 h-4 text-rose-400 dark:text-rose-500" /> Unique User ID
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 dark:text-rose-500 font-black text-lg">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_unique_id"
                  className="w-full pl-10 pr-4 py-4 bg-rose-50/50 dark:bg-gray-800/50 border-2 border-transparent rounded-2xl focus:border-rose-300 dark:focus:border-rose-700 focus:ring-0 text-gray-800 dark:text-gray-100 font-bold text-lg transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">This ID is how others tag you in their memories. Make it unique! 🌸</p>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <CalendarIcon className="w-6 h-6 text-rose-400 dark:text-rose-500" />
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Member Since</div>
                <div className="text-gray-700 dark:text-gray-300 font-bold">{format(new Date(profile.createdAt), 'MMMM d, yyyy')}</div>
              </div>
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-3 p-4 rounded-2xl border ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="text-sm font-bold">{message.text}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSaving || username === profile.username}
              className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500 text-white rounded-2xl font-black text-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-rose-200 dark:shadow-rose-900/20"
            >
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              Save Changes
            </button>
          </form>

          <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 rounded-2xl font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 dark:hover:text-rose-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
