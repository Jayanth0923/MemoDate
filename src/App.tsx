import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { logout } from './services/authService';
import { subscribeToAllMemoryDates } from './services/memoryService';
import { Auth } from './components/Auth';
import { Profile } from './components/Profile';
import { SplashScreen } from './components/SplashScreen';
import { Calendar } from './components/Calendar';
import { MemoryForm } from './components/MemoryForm';
import { MemoryList } from './components/MemoryList';
import { MemoryRecall } from './components/MemoryRecall';
import { FloatingHearts } from './components/FloatingHearts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogOut, User as UserIcon, Calendar as CalendarIcon, Heart, Plus, X, Sparkles, ChevronLeft, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Memory } from './types';
import { format } from 'date-fns';
import { Settings } from './components/Settings';

import { requestNotificationPermission } from './services/notificationService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<'home' | 'profile'>('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPage, setSettingsPage] = useState<string | null>(null);
  const [memoryDates, setMemoryDates] = useState<string[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const isExitingRef = React.useRef(false);

  useEffect(() => {
    // Request notification permission on first launch
    const initNotifications = async () => {
      const hasPrompted = localStorage.getItem('notification_prompted');
      if (!hasPrompted) {
        await requestNotificationPermission();
        localStorage.setItem('notification_prompted', 'true');
      }
    };
    initNotifications();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser && !window.history.state) {
        window.history.replaceState({ view: 'home', form: false, settings: false }, '');
        setCurrentView('home');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setUserProfile(doc.data());
        }
      });
      return () => unsubscribe();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToAllMemoryDates(user.uid, (dates) => {
        setMemoryDates(dates);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const applyTheme = () => {
      const theme = userProfile?.themePreference || 'system';
      const root = window.document.documentElement;
      
      root.classList.remove('light', 'dark');
      
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (!userProfile?.themePreference || userProfile.themePreference === 'system') {
        applyTheme();
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [userProfile?.themePreference]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Standard way to trigger browser exit confirmation
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    // Set initial state if not present
    if (!window.history.state) {
      window.history.pushState({ view: 'home', form: false, settings: false }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (showExitConfirm || isExitingRef.current) return; // Ignore popstate while dialog is open or exiting

      if (!event.state) {
        // We've gone back past our initial state, show exit confirmation
        setShowExitConfirm(true);
        // Push back to home state to stay in the app for now
        window.history.pushState({ view: 'home', form: false, settings: false }, '');
        return;
      }

      if (event.state?.view) {
        setCurrentView(event.state.view);
      } else {
        setCurrentView('home');
      }
      
      if (event.state?.form !== undefined) {
        setShowForm(event.state.form);
        if (!event.state.form) {
          setEditingMemory(null);
        }
      } else {
        setShowForm(false);
        setEditingMemory(null);
      }

      if (event.state?.settings !== undefined) {
        setShowSettings(event.state.settings);
        setSettingsPage(event.state.settingsPage || null);
      } else {
        setShowSettings(false);
        setSettingsPage(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view: 'home' | 'profile', form: boolean = false, settings: boolean = false, settingsPage: string | null = null) => {
    setCurrentView(view);
    setShowForm(form);
    setShowSettings(settings);
    setSettingsPage(settingsPage);
    window.history.pushState({ view, form, settings, settingsPage }, '');
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-400">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-rose-50/30 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-rose-100 selection:text-rose-900 relative transition-colors duration-300">
        <FloatingHearts />
        
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-rose-100 dark:border-gray-800 sticky top-0 z-50 px-4 sm:px-6 py-4 shadow-sm transition-colors duration-300">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-rose-900/20">
                  <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-gray-900 dark:text-gray-50 leading-none">MemoDate 🌸</h1>
                  {currentView === 'home' && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] sm:text-xs font-sans font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest mt-1"
                    >
                      Welcome, {user.displayName || 'User'}
                    </motion.p>
                  )}
                </div>
              </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigateTo(currentView, false, true)}
                className="p-2 sm:p-3 bg-rose-50/50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all text-rose-500 dark:text-rose-400"
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={() => {
                  if (currentView === 'profile') {
                    window.history.back();
                  } else {
                    navigateTo('profile');
                  }
                }}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-rose-50/50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all"
              >
                {currentView === 'profile' ? (
                  <ChevronLeft className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                ) : (
                  <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-xs uppercase">
                    {user.displayName?.[0] || user.email?.[0] || 'U'}
                  </div>
                )}
                <span className="hidden sm:inline text-sm font-bold text-gray-700 dark:text-gray-200">
                  {currentView === 'home' ? 'Profile' : 'Back'}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
          <AnimatePresence mode="wait" initial={false}>
            {currentView === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <Profile userId={user.uid} />
              </motion.div>
            ) : (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-8"
              >
                <MemoryRecall 
                  userId={user.uid} 
                  onViewDate={(date) => {
                    setSelectedDate(date);
                    setShowForm(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Calendar */}
                  <div className="lg:col-span-5 space-y-6 sm:space-y-8">
                    <div className="bg-gradient-to-br from-rose-400 to-pink-500 dark:from-rose-900 dark:to-pink-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-rose-200 dark:shadow-rose-900/20 relative overflow-hidden transition-colors duration-300">
                      <div className="relative z-10">
                        <h3 className="text-xl sm:text-2xl font-display font-black mb-2 flex items-center gap-2">
                          Relive Your Journey <Heart className="w-5 h-5 fill-current" />
                        </h3>
                        <p className="text-rose-50 dark:text-rose-100/80 font-sans font-medium text-xs sm:text-sm leading-relaxed">
                          Every date holds a story. Capture your memories today and tag your loved ones to share the moment. ✨
                        </p>
                      </div>
                      <Heart className="absolute -bottom-4 -right-4 w-24 h-24 sm:w-32 sm:h-32 text-white/10 dark:text-white/5 transform rotate-12" />
                    </div>

                    <Calendar 
                      selectedDate={selectedDate} 
                      onDateSelect={(date) => {
                        setSelectedDate(date);
                        setShowForm(false);
                      }} 
                      memoryDates={memoryDates}
                    />
                  </div>

                  {/* Right Column: Memories */}
                  <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                      <div>
                        <h2 className="text-2xl sm:text-4xl font-display font-black text-gray-900 dark:text-gray-100 tracking-tight">
                          {format(selectedDate, 'MMMM d, yyyy')} 🎀
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 font-sans font-bold text-sm sm:text-base">Memories for this date</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          if (!showForm) {
                            navigateTo('home', true);
                          } else {
                            setEditingMemory(null);
                            window.history.back();
                          }
                        }}
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg w-full sm:w-auto ${
                          showForm 
                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700' 
                            : 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200 dark:shadow-rose-900/20'
                        }`}
                      >
                        {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {showForm ? 'Cancel' : (editingMemory ? 'Edit Memory' : 'Add Memory')}
                      </button>
                    </div>

                    <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100">Exit Memo?</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Do you really want to exit the application?
                </p>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    No
                  </button>
                  <button
                    onClick={() => {
                      isExitingRef.current = true;
                      setShowExitConfirm(false);
                      // Try multiple ways to "exit"
                      try {
                        window.close();
                        // If window.close() doesn't work (common in browsers), go back
                        setTimeout(() => {
                          window.history.go(-2);
                        }, 100);
                      } catch (e) {
                        window.history.go(-2);
                      }
                    }}
                    className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 dark:shadow-rose-900/20 hover:bg-rose-600 transition-all"
                  >
                    Yes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
                      {showForm && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="mb-8"
                        >
                          <MemoryForm 
                            userId={user.uid} 
                            date={selectedDate} 
                            editingMemory={editingMemory}
                            onSuccess={() => {
                              setEditingMemory(null);
                              window.history.back();
                            }} 
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <MemoryList 
                      userId={user.uid} 
                      date={selectedDate} 
                      onEdit={(memory) => {
                        setEditingMemory(memory);
                        if (!showForm) {
                          navigateTo('home', true);
                        }
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <Settings 
          isOpen={showSettings} 
          activePage={settingsPage}
          onPageChange={(page) => navigateTo(currentView, false, true, page)}
          onClose={() => navigateTo(currentView, false, false, null)}
          user={user} 
          userProfile={userProfile} 
        />

        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-100 dark:border-gray-800 mt-12 text-center transition-colors duration-300">
          <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} MemoDate • Securely Storing Your Moments
          </p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
