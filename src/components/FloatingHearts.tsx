import React from 'react';
import { motion } from 'motion/react';

export function FloatingHearts() {
  const hearts = ['💖', '✨', '🌸', '💕', '🎀'];
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0, 
            y: '110vh', 
            x: `${Math.random() * 100}vw`,
            scale: 0.5 + Math.random()
          }}
          animate={{ 
            opacity: [0, 0.3, 0], 
            y: '-10vh',
            rotate: [0, 45, -45, 0]
          }}
          transition={{ 
            duration: 10 + Math.random() * 10, 
            repeat: Infinity, 
            delay: Math.random() * 20,
            ease: "linear"
          }}
          className="absolute text-2xl"
        >
          {hearts[i % hearts.length]}
        </motion.div>
      ))}
    </div>
  );
}
