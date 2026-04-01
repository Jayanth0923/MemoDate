import React, { useEffect, useState, useRef } from 'react';
import { Trash2, Tag, Calendar as CalendarIcon, ExternalLink, Share2, Loader2, Pencil } from 'lucide-react';
import { subscribeToMemories, deleteMemory } from '../services/memoryService';
import { getUserProfile } from '../services/authService';
import { getDirectDriveUrl } from '../services/driveService';
import { Memory, UserProfile } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { MemoryCard } from './MemoryCard';
import { cn } from '../lib/utils';

const getBase64Image = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Direct fetch failed, trying CORS proxy:', error);
    try {
      // Fallback to a CORS proxy
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const proxyResponse = await fetch(proxyUrl);
      if (!proxyResponse.ok) throw new Error('Proxy response was not ok');
      const blob = await proxyResponse.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (proxyError) {
      console.error('Failed to convert image to base64 via proxy:', proxyError);
      return url; // Fallback to original URL if both fail
    }
  }
};

interface MemoryListProps {
  userId: string;
  date: Date;
  onEdit: (memory: Memory) => void;
}

export function MemoryList({ userId, date, onEdit }: MemoryListProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [taggedUsersMap, setTaggedUsersMap] = useState<Record<string, UserProfile>>({});
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [sharingMemory, setSharingMemory] = useState<Memory | null>(null);
  const [shareModalMemory, setShareModalMemory] = useState<Memory | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [customShareMessage, setCustomShareMessage] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const profile = await getUserProfile(userId);
      setCurrentUserProfile(profile);
    };
    fetchCurrentUser();
  }, [userId]);

  useEffect(() => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const unsubscribe = subscribeToMemories(userId, dateStr, async (newMemories) => {
      setMemories(newMemories);
      
      // Fetch profiles for all relevant users (creator + tagged)
      const userIdsToFetch = new Set<string>();
      newMemories.forEach(memory => {
        userIdsToFetch.add(memory.userId);
        memory.taggedUserIds.forEach(tId => userIdsToFetch.add(tId));
      });

      for (const id of userIdsToFetch) {
        if (!taggedUsersMap[id]) {
          const profile = await getUserProfile(id);
          if (profile) {
            setTaggedUsersMap(prev => ({ ...prev, [id]: profile }));
          }
        }
      }
    });

    return () => unsubscribe();
  }, [userId, date]);

  const handleShareClick = (memory: Memory) => {
    setShareModalMemory(memory);
    setCustomShareMessage(`Check out this memory from ${format(new Date(memory.date), 'MMMM d, yyyy')}! 🌸`);
  };

  const executeShare = async () => {
    if (!shareModalMemory) return;
    
    const memory = { ...shareModalMemory };
    const shareMessage = customShareMessage;
    
    // Pre-fetch images to base64 to avoid CORS issues in html-to-image
    if (memory.mediaUrls && memory.mediaUrls.length > 0) {
      try {
        const base64Urls = await Promise.all(
          memory.mediaUrls.map(url => {
            const directUrl = getDirectDriveUrl(url);
            const urlWithCb = `${directUrl}${directUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`;
            return getBase64Image(urlWithCb);
          })
        );
        memory.mediaUrls = base64Urls;
      } catch (err) {
        console.warn('Failed to pre-fetch some images for sharing', err);
      }
    }

    setSharingMemory(memory);
    setShareModalMemory(null);

    // Wait for the card to render in the hidden container
    // We use a longer timeout to ensure images are loaded
    await new Promise(resolve => setTimeout(resolve, 500));

    if (cardRef.current) {
      try {
        let dataUrl;
        const toPngOptions = {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#fff',
          cacheBust: true,
          imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        };

        try {
          dataUrl = await toPng(cardRef.current, toPngOptions);
        } catch (toPngErr) {
          console.warn('First toPng attempt failed, retrying with skipFonts:', toPngErr);
          dataUrl = await toPng(cardRef.current, { ...toPngOptions, skipFonts: true });
        }
        
        // If Web Share API is available, use it
        if (navigator.share) {
          try {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `memory-${format(new Date(memory.date), 'yyyy-MM-dd')}.png`, { type: 'image/png' });
            
            // Check if sharing files is supported
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'My Memory on MemoDate',
                text: shareMessage
              });
            } else {
              throw new Error('File sharing not supported');
            }
          } catch (shareErr) {
            console.warn('Navigator share failed, falling back to download:', shareErr);
            // Fallback to download if sharing fails
            const link = document.createElement('a');
            link.download = `memory-${format(new Date(memory.date), 'yyyy-MM-dd')}.png`;
            link.href = dataUrl;
            link.click();
          }
        } else {
          // Fallback for browsers that don't support navigator.share
          const link = document.createElement('a');
          link.download = `memory-${format(new Date(memory.date), 'yyyy-MM-dd')}.png`;
          link.href = dataUrl;
          link.click();
          alert('Sharing is not supported on this browser. The memory card has been downloaded to your device instead! 🌸');
        }
      } catch (err) {
        console.error('Error sharing memory:', err);
        alert('Failed to generate memory card. Please try again.');
      } finally {
        setSharingMemory(null);
      }
    } else {
      setSharingMemory(null);
      alert('Failed to prepare memory card for sharing. Please try again.');
    }
  };

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-rose-50/30 dark:bg-rose-900/10 rounded-3xl border-2 border-dashed border-rose-200 dark:border-rose-900/30 transition-colors duration-300">
        <CalendarIcon className="w-12 h-12 text-rose-300 dark:text-rose-500 mb-4" />
        <p className="text-rose-500 dark:text-rose-400 font-sans font-bold text-center">No memories for this date yet. 🌸</p>
        <p className="text-rose-400 dark:text-rose-500 font-sans text-sm text-center">Start capturing your moments!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="popLayout">
        {memories.map((memory) => (
          <motion.div
            key={memory.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden group transition-colors duration-300"
          >
            <div className="p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-[10px] uppercase">
                      {taggedUsersMap[memory.userId]?.username?.[0] || 'U'}
                    </div>
                    <span className="text-xs font-sans font-black text-gray-500 dark:text-gray-300">
                      @{taggedUsersMap[memory.userId]?.username || '...'}
                    </span>
                    {memory.userId === userId && (
                      <span className="text-[10px] font-sans font-black text-rose-400 dark:text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded uppercase tracking-tighter">You</span>
                    )}
                  </div>
                  <p className="text-gray-800 dark:text-gray-100 font-sans font-medium leading-relaxed whitespace-pre-wrap">{memory.text}</p>
                </div>
              </div>

              {/* Media Carousel */}
              {memory.mediaUrls && memory.mediaUrls.length > 0 && (
                <div className="flex overflow-x-auto gap-3 pb-2 mb-4 snap-x snap-mandatory scrollbar-hide -mx-6 px-6 sm:-mx-0 sm:px-0">
                  {memory.mediaUrls.map((url, idx) => (
                    <div key={idx} className="relative flex-none w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 group/media shadow-sm border border-gray-100 dark:border-gray-700 snap-center">
                      <img 
                        src={getDirectDriveUrl(url)} 
                        alt="Memory" 
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
                        <Loader2 className="w-6 h-6 text-rose-200 dark:text-rose-900/50 animate-spin" />
                      </div>
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity z-10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {memory.taggedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <Tag className="w-4 h-4 text-rose-400 dark:text-rose-500" />
                  {memory.taggedUserIds.map(tId => (
                    <span key={tId} className="text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/30">
                      @{taggedUsersMap[tId]?.username || '...'}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center text-xs text-gray-400 dark:text-gray-500">
                <span>Created {format(new Date(memory.createdAt), 'h:mm a')}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleShareClick(memory)}
                    disabled={sharingMemory?.id === memory.id}
                    className="p-2 text-rose-300 dark:text-rose-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all disabled:opacity-50"
                    title="Share Memory Card"
                  >
                    {sharingMemory?.id === memory.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                  </button>
                  {memory.userId === userId && (
                    <>
                      <button
                        onClick={() => onEdit(memory)}
                        className="p-2 text-rose-300 dark:text-rose-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                        title="Edit Memory"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(memory.id)}
                        className="p-2 text-rose-300 dark:text-rose-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                        title="Delete Memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Share Customization Modal */}
      <AnimatePresence>
        {shareModalMemory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShareModalMemory(null)}
              className="absolute inset-0 bg-rose-900/40 dark:bg-gray-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-rose-100 dark:border-gray-800 overflow-hidden"
            >
              <div className="p-8 sm:p-10 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Share2 className="w-8 h-8 text-rose-500 dark:text-rose-400" />
                  </div>
                  <h3 className="text-2xl font-display font-black text-gray-900 dark:text-gray-100">Share Memory</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-sans font-medium text-sm">Add a personal touch to your share! ✨</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-sans font-black text-rose-400 dark:text-rose-500 uppercase tracking-widest">Your Message</label>
                  <textarea
                    value={customShareMessage}
                    onChange={(e) => setCustomShareMessage(e.target.value)}
                    placeholder="Write something sweet..."
                    className="w-full min-h-[100px] p-4 bg-rose-50/50 dark:bg-gray-800/50 border-2 border-transparent rounded-2xl focus:border-rose-300 dark:focus:border-rose-700 focus:ring-0 text-gray-800 dark:text-gray-200 font-sans font-medium resize-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShareModalMemory(null)}
                    className="flex-1 py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-sans font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeShare}
                    className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-sans font-black shadow-xl shadow-rose-200 dark:shadow-rose-900/20 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-rose-900/40 dark:bg-gray-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-rose-100 dark:border-gray-800 overflow-hidden"
            >
              <div className="p-8 sm:p-10 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8 text-rose-500 dark:text-rose-400" />
                  </div>
                  <h3 className="text-2xl font-display font-black text-gray-900 dark:text-gray-100">Delete Memory?</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-sans font-medium text-sm">Are you sure you want to delete this memory? This action cannot be undone. 🌸</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-sans font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (deleteConfirmId) {
                        await deleteMemory(deleteConfirmId);
                        setDeleteConfirmId(null);
                      }
                    }}
                    className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-sans font-black shadow-xl shadow-rose-200 dark:shadow-rose-900/20 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Card for Image Generation */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
        {sharingMemory && (
          <MemoryCard 
            ref={cardRef}
            memory={sharingMemory}
            username={currentUserProfile?.username || 'user'}
            taggedUsers={sharingMemory.taggedUserIds.map(id => taggedUsersMap[id]).filter(Boolean)}
          />
        )}
      </div>
    </div>
  );
}
