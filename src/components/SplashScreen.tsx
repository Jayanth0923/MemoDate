import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Heart, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-rose-500 dark:bg-gray-950 overflow-hidden transition-colors duration-300"
        >
          {/* Background Particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0, 
                scale: 0,
                x: Math.random() * 100 - 50 + 'vw',
                y: Math.random() * 100 - 50 + 'vh'
              }}
              animate={{ 
                opacity: [0, 0.3, 0],
                scale: [0, 1.5, 0],
                x: Math.random() * 100 - 50 + 'vw',
                y: Math.random() * 100 - 50 + 'vh'
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              className="absolute w-2 h-2 bg-white dark:bg-rose-500 rounded-full blur-sm"
            />
          ))}

          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2
              }}
              className="w-24 h-24 sm:w-32 sm:h-32 bg-white dark:bg-gray-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-rose-900/20 dark:shadow-black/50 mb-8 relative transition-colors duration-300"
            >
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-rose-500 dark:text-rose-400" />
              
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-4 -right-4 w-10 h-10 sm:w-12 sm:h-12 bg-yellow-300 dark:bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <h1 className="text-4xl sm:text-5xl font-display font-black text-white tracking-tighter mb-2">
                MemoDate
              </h1>
              <div className="flex items-center justify-center gap-2 text-rose-100 dark:text-gray-400 font-sans font-bold tracking-widest uppercase text-[10px] sm:text-xs">
                <span>Capture</span>
                <Heart className="w-3 h-3 fill-current" />
                <span>Relive</span>
                <Heart className="w-3 h-3 fill-current" />
                <span>Share</span>
              </div>
            </motion.div>
          </div>

          {/* Bottom Loading Bar */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="absolute bottom-0 left-0 h-1 bg-white/30"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
