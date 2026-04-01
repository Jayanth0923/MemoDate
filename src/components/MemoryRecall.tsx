import React, { useEffect, useState } from 'react';
import { Sparkles, X, Calendar, Heart } from 'lucide-react';
import { getMemoriesByDate } from '../services/memoryService';
import { getUserProfile } from '../services/authService';
import { Memory, UserProfile } from '../types';
import { format, addDays, subYears } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface MemoryRecallProps {
  userId: string;
  onViewDate: (date: Date) => void;
}

export function MemoryRecall({ userId, onViewDate }: MemoryRecallProps) {
  const [recallMemory, setRecallMemory] = useState<Memory | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkRecall = async () => {
      // Logic: 12 days before the 1-year anniversary
      const today = new Date();
      const targetDate = subYears(addDays(today, 12), 1);
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      
      const memories = await getMemoriesByDate(userId, dateStr);
      if (memories.length > 0) {
        const memory = memories[0];
        setRecallMemory(memory);
        
        // Fetch creator profile
        const profile = await getUserProfile(memory.userId);
        setCreatorProfile(profile);
        
        setIsVisible(true);
      }
    };

    checkRecall();
  }, [userId]);

  if (!isVisible || !recallMemory) return null;

  const originalDate = new Date(recallMemory.date);
  const isOwnMemory = recallMemory.userId === userId;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="mb-8 relative"
      >
        <div className="bg-gradient-to-r from-rose-400 to-pink-500 dark:from-rose-900 dark:to-pink-900 rounded-[2rem] p-6 sm:p-8 text-white shadow-2xl shadow-rose-200 dark:shadow-rose-900/20 overflow-hidden transition-colors duration-300">
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-300/20 dark:bg-rose-900/40 rounded-full -ml-20 -mb-20 blur-2xl" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-8 h-8 text-yellow-200 dark:text-yellow-400 fill-current" />
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-display font-black mb-2 tracking-tight flex items-center justify-center sm:justify-start gap-2">
                {isOwnMemory ? 'A gentle nudge from the past...' : 'Someone remembered you...'} <Heart className="w-6 h-6 fill-current text-rose-200 dark:text-rose-400" />
              </h3>
              <p className="text-rose-50 dark:text-rose-100/80 font-sans font-medium text-sm sm:text-base leading-relaxed max-w-xl">
                {isOwnMemory ? (
                  `This is the memory you added last year on ${format(originalDate, 'MMMM d')}. ✨`
                ) : (
                  `@{${creatorProfile?.username || 'user'}} tagged you in a memory last year on ${format(originalDate, 'MMMM d')}. 🌸`
                )}
                {" "}Even if moments pass, the feelings remain. Would you like to revisit it?
              </p>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => onViewDate(originalDate)}
                className="flex-1 sm:flex-none bg-white dark:bg-gray-900 text-rose-500 dark:text-rose-400 px-6 py-3 rounded-xl font-bold hover:bg-rose-50 dark:hover:bg-gray-800 transition-all shadow-lg"
              >
                Revisit
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-3 bg-white/10 dark:bg-black/20 hover:bg-white/20 dark:hover:bg-black/40 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
