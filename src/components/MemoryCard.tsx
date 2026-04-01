import React from 'react';
import { getDirectDriveUrl } from '../services/driveService';
import { Memory, UserProfile } from '../types';
import { format } from 'date-fns';
import { Heart, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

interface MemoryCardProps {
  memory: Memory;
  username: string;
  taggedUsers: UserProfile[];
}

export const MemoryCard = React.forwardRef<HTMLDivElement, MemoryCardProps>(({ memory, username, taggedUsers }, ref) => {
  return (
    <div 
      ref={ref}
      className="w-[800px] bg-white dark:bg-gray-900 p-16 relative overflow-hidden flex flex-col gap-12 transition-colors duration-300"
      style={{ minHeight: '1000px' }}
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-50 dark:bg-rose-900/20 rounded-full -mr-48 -mt-48 blur-3xl opacity-60" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-50 dark:bg-rose-900/20 rounded-full -ml-64 -mb-64 blur-3xl opacity-60" />
      
      {/* Header Section */}
      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center shadow-xl shadow-rose-200 dark:shadow-rose-900/20">
            <CalendarIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="text-[12px] font-sans font-black text-rose-400 uppercase tracking-[0.3em] mb-1">MemoDate Journal</div>
            <div className="text-gray-900 dark:text-gray-100 font-display font-black text-3xl leading-none tracking-tight">@{username}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[12px] font-sans font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.3em] mb-1">Captured On</div>
          <div className="text-gray-900 dark:text-gray-100 font-display font-black text-2xl">{format(new Date(memory.date), 'MMMM d, yyyy')}</div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="flex-1 flex flex-col justify-center relative z-10 py-12">
        <div className="relative">
          <span className="absolute -top-16 -left-8 text-[12rem] font-display font-black text-rose-100/30 dark:text-rose-900/30 leading-none">"</span>
          <p className="text-gray-800 dark:text-gray-200 text-5xl font-display font-medium leading-[1.4] italic text-center relative z-10 px-8">
            {memory.text}
          </p>
          <span className="absolute -bottom-24 -right-8 text-[12rem] font-display font-black text-rose-100/30 dark:text-rose-900/30 leading-none">"</span>
        </div>
      </div>

      {/* Media Section (if exists) */}
      {memory.mediaUrls && memory.mediaUrls.length > 0 && memory.mediaUrls[0] && (
        <div className="grid grid-cols-1 gap-6 relative z-10">
          <div className="aspect-[16/9] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white dark:border-gray-800">
            <img 
              src={memory.mediaUrls[0].startsWith('data:') ? memory.mediaUrls[0] : `${getDirectDriveUrl(memory.mediaUrls[0])}${getDirectDriveUrl(memory.mediaUrls[0]).includes('?') ? '&' : '?'}cb=${Date.now()}`} 
              alt="Memory" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      )}

      {/* Footer Section */}
      <div className="pt-12 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center gap-10 relative z-10">
        {taggedUsers.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4">
            {taggedUsers.map(user => (
              <span key={user.uid} className="text-[12px] font-sans font-black text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-5 py-2.5 rounded-full border border-rose-100 dark:border-rose-900/30 uppercase tracking-widest shadow-sm">
                @{user.username}
              </span>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-6">
          <div className="h-px w-16 bg-rose-100 dark:bg-rose-900/30" />
          <div className="flex items-center gap-4 text-rose-300 dark:text-rose-700">
            <Sparkles className="w-6 h-6 fill-current" />
            <span className="text-[12px] font-sans font-black uppercase tracking-[0.5em] text-rose-400 dark:text-rose-500">A Moment to Remember</span>
            <Sparkles className="w-6 h-6 fill-current" />
          </div>
          <div className="h-px w-16 bg-rose-100 dark:bg-rose-900/30" />
        </div>
      </div>
    </div>
  );
});

MemoryCard.displayName = 'MemoryCard';
