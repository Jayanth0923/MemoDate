import React from 'react';
import { LogIn, Calendar as CalendarIcon, Heart, Camera, Users } from 'lucide-react';
import { loginWithGoogle } from '../services/authService';
import { motion } from 'motion/react';

export function Auth() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-500 dark:bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white dark:bg-rose-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white dark:bg-pink-500 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8 relative z-10"
      >
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl flex items-center justify-center transform rotate-12 transition-colors duration-300">
            <CalendarIcon className="w-12 h-12 text-rose-500 dark:text-rose-400 transform -rotate-12" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-display font-black text-white tracking-tight">MemoDate 🌸</h1>
          <p className="text-rose-100 dark:text-gray-300 text-lg font-sans font-medium">
            Your personal memory calendar. Capture moments, tag friends, and relive your journey.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 dark:bg-gray-900/50 backdrop-blur-lg p-6 rounded-3xl border border-white/20 dark:border-gray-800 text-white dark:text-gray-200 transition-colors duration-300">
            <Heart className="w-8 h-8 mb-3 mx-auto text-rose-300 dark:text-rose-400 fill-current" />
            <div className="text-sm font-bold">Capture Love</div>
          </div>
          <div className="bg-white/10 dark:bg-gray-900/50 backdrop-blur-lg p-6 rounded-3xl border border-white/20 dark:border-gray-800 text-white dark:text-gray-200 transition-colors duration-300">
            <Camera className="w-8 h-8 mb-3 mx-auto text-pink-300 dark:text-pink-400" />
            <div className="text-sm font-bold">Store Media</div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-white dark:bg-rose-500 text-rose-600 dark:text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-4 border-rose-600 dark:border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-6 h-6" />
              Get Started
            </>
          )}
        </button>

        <p className="text-rose-100 dark:text-gray-400 text-sm font-medium">
          Secure Google Login • Data Isolation Guaranteed
        </p>
      </motion.div>
    </div>
  );
}
