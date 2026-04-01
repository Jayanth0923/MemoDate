import React, { useState, useEffect } from 'react';
import { X, Info, Mail, HelpCircle, MessageSquare, Heart, ChevronRight, Palette, Monitor, Sun, Moon, Database, RefreshCw, CheckCircle2, AlertCircle, Bell, Smartphone, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { updateUserProfile, reconnectGoogleDrive } from '../services/authService';
import { checkDriveConnection } from '../services/driveService';
import { checkNotificationPermission, requestNotificationPermission, sendNotification } from '../services/notificationService';

interface SettingsProps {
  isOpen: boolean;
  activePage: string | null;
  onPageChange: (page: string | null) => void;
  onClose: () => void;
  user: User | null;
  userProfile: UserProfile | null;
}

export function Settings({ isOpen, activePage, onPageChange, onClose, user, userProfile }: SettingsProps) {
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState<boolean | null>(null);
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [notificationStatus, setNotificationStatus] = useState<string>('default');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkConnection();
      setNotificationStatus(checkNotificationPermission());
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const checkConnection = async () => {
    setIsCheckingDrive(true);
    const connected = await checkDriveConnection();
    setIsDriveConnected(connected);
    setIsCheckingDrive(false);
  };

  const handleReconnect = async () => {
    setIsCheckingDrive(true);
    try {
      await reconnectGoogleDrive();
      await checkConnection();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    } finally {
      setIsCheckingDrive(false);
    }
  };

  const handleRequestPermission = async () => {
    const status = await requestNotificationPermission();
    setNotificationStatus(status);
    if (status === 'granted') {
      sendNotification('Notifications Enabled! 🌸', {
        body: 'You will now receive updates from MemoDate.',
        icon: '/favicon.ico'
      });
    }
  };

  const handleFeedbackSubmit = () => {
    if (!feedback.trim()) return;
    const subject = encodeURIComponent(`Feedback from ${user?.displayName || 'User'} (@${userProfile?.username || 'unknown'})`);
    const body = encodeURIComponent(`User: ${user?.displayName || 'User'}\nEmail: ${user?.email || 'N/A'}\nUsername: @${userProfile?.username || 'unknown'}\n\nFeedback:\n${feedback}`);
    window.location.href = `mailto:ferrypot23@gmail.com?subject=${subject}&body=${body}`;
    setFeedback('');
  };

  const upiId = 'jayanthmuddulurt2004-1@oksbi';
  const upiName = 'Jayanth';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&cu=INR`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayWithUpi = () => {
    window.location.href = upiUrl;
  };

  const renderDonateContent = () => {
    return (
      <div className="space-y-10 mt-6 flex flex-col items-center">
        {/* QR Code Card */}
        <div className="relative group w-full max-w-[300px]">
          <div className="absolute -inset-1 bg-gradient-to-tr from-rose-500 via-orange-400 to-amber-300 rounded-[44px] blur-md opacity-20 group-hover:opacity-30 transition duration-1000"></div>
          <div className="relative bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center">
            <div className="relative p-4 bg-gray-50 dark:bg-gray-950 rounded-[32px] mb-6 border border-gray-100 dark:border-gray-800">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}&color=1f2937&bgcolor=f9fafb`}
                alt="UPI QR Code"
                className="w-44 h-44 rounded-xl mix-blend-multiply dark:mix-blend-normal dark:invert-[0.05]"
                referrerPolicy="no-referrer"
              />
              {/* Center Logo Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl shadow-lg flex items-center justify-center p-1.5 border border-gray-100 dark:border-gray-800">
                  <Heart className="w-full h-full text-rose-500 fill-rose-500" />
                </div>
              </div>
            </div>

            <div className="text-center space-y-3 w-full">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">UPI ID</p>
              <div className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 group/upi">
                <code className="text-rose-500 dark:text-rose-400 font-mono text-xs font-bold truncate max-w-[160px]">
                  {upiId}
                </code>
                <button 
                  onClick={handleCopyUpi}
                  className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm active:scale-95"
                  title="Copy UPI ID"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400 group-hover/upi:text-rose-400" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full space-y-8 text-center">
          <button
            onClick={handlePayWithUpi}
            className="w-full py-4 bg-rose-500 text-white rounded-[24px] font-bold shadow-xl shadow-rose-200 dark:shadow-rose-900/30 hover:bg-rose-600 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <Smartphone className="w-5 h-5" />
            Pay with UPI App
          </button>
          
          <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Supported Apps</p>
            <div className="flex items-center justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Google_Pay_Logo.svg" alt="GPay" className="h-5" referrerPolicy="no-referrer" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" alt="UPI" className="h-5" referrerPolicy="no-referrer" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg" alt="Paytm" className="h-5" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const pages = [
    { id: 'appearance', title: 'Appearance', icon: Palette, content: 'Customize the look and feel of Memo.' },
    { id: 'notifications', title: 'Notifications', icon: Bell, content: 'Manage how you receive updates and reminders.' },
    { id: 'drive', title: 'Google Drive', icon: Database, content: 'Manage your media storage connection.' },
    { id: 'about', title: 'About Us', icon: Info, content: 'Memo is a space for your most precious moments. Built with love to help you and your loved ones stay connected through shared memories.' },
    { id: 'contact', title: 'Contact Us', icon: Mail, content: 'Need help? Reach out to us at support@memo.app. We are always here to listen.' },
    { id: 'help', title: 'Help', icon: HelpCircle, content: 'How to use Memo:\n1. Select a date on the calendar.\n2. Write your memory.\n3. Add media (stored securely in your Google Drive).\n4. Tag your loved ones.' },
    { id: 'feedback', title: 'Feedback', icon: MessageSquare, content: 'We value your input! Please let us know how we can make Memo better for you.' },
    { id: 'donate', title: 'Donate Us', icon: Heart, content: 'Memo is a free app. If you love using it, consider supporting our development to keep the memories flowing.' },
  ];

  const handleThemeChange = async (theme: 'system' | 'light' | 'dark') => {
    if (!user || isUpdatingTheme) return;
    setIsUpdatingTheme(true);
    try {
      await updateUserProfile(user.uid, { themePreference: theme });
    } catch (error) {
      console.error('Failed to update theme:', error);
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  const renderAppearanceContent = () => {
    const currentTheme = userProfile?.themePreference || 'system';
    
    const themeOptions = [
      { id: 'system', label: 'System Theme', icon: Monitor, description: 'Automatically adapts to your device settings.' },
      { id: 'light', label: 'Light Theme', icon: Sun, description: 'A bright, clean interface for well-lit environments.' },
      { id: 'dark', label: 'Dark Theme', icon: Moon, description: 'A darker interface for low-light settings and reduced eye strain.' },
    ] as const;

    return (
      <div className="space-y-4 mt-4">
        {themeOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleThemeChange(option.id)}
            disabled={isUpdatingTheme}
            className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
              currentTheme === option.id
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                : 'border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
            }`}
          >
            <div className={`p-2 rounded-xl ${currentTheme === option.id ? 'bg-rose-500 text-white' : 'bg-white text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
              <option.icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`font-bold ${currentTheme === option.id ? 'text-rose-700 dark:text-rose-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {option.label}
              </h4>
              <p className={`text-sm mt-1 ${currentTheme === option.id ? 'text-rose-600/80 dark:text-rose-400/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderDriveContent = () => {
    return (
      <div className="space-y-6 mt-4">
        <div className={`p-6 rounded-3xl border-2 transition-all ${
          isDriveConnected 
            ? 'border-green-100 bg-green-50/50 dark:border-green-900/20 dark:bg-green-900/10' 
            : 'border-rose-100 bg-rose-50/50 dark:border-rose-900/20 dark:bg-rose-900/10'
        }`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl ${
              isDriveConnected 
                ? 'bg-green-500 text-white' 
                : 'bg-rose-500 text-white'
            }`}>
              {isDriveConnected ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <div>
              <h4 className="font-black text-gray-900 dark:text-gray-100">
                {isDriveConnected ? 'Connected to Google Drive' : 'Drive Session Expired'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isDriveConnected 
                  ? 'Your media is being stored securely in your "Memo Data" folder.' 
                  : 'Please reconnect to enable media uploads and viewing.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleReconnect}
            disabled={isCheckingDrive}
            className="w-full py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl font-bold shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isCheckingDrive ? 'animate-spin' : ''}`} />
            {isCheckingDrive ? 'Connecting...' : (isDriveConnected ? 'Refresh Connection' : 'Reconnect Now')}
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl space-y-3">
          <h5 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Why Google Drive?</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
            We use your Google Drive to ensure your memories stay private and under your control. We only create and access the "Memo Data" folder.
          </p>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden transition-colors duration-300"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-900/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/20">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <h2 className="text-xl font-sans font-black text-gray-900 dark:text-gray-100 tracking-tight">Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-full transition-colors text-rose-500 dark:text-rose-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {activePage ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6 p-4"
                >
                  <button
                    onClick={() => window.history.back()}
                    className="text-rose-500 font-bold flex items-center gap-2 mb-4 hover:underline"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to Settings
                  </button>
                  <div className="flex items-center gap-4 mb-6">
                    {React.createElement(pages.find(p => p.id === activePage)!.icon, { className: "w-8 h-8 text-rose-500" })}
                    <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100">{pages.find(p => p.id === activePage)!.title}</h3>
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {pages.find(p => p.id === activePage)!.content}
                  </div>
                  {activePage === 'appearance' && renderAppearanceContent()}
                  {activePage === 'notifications' && (
                    <div className="space-y-6 mt-4">
                      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                              notificationStatus === 'granted' ? 'bg-green-100 text-green-600' : 
                              notificationStatus === 'denied' ? 'bg-red-100 text-red-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                              <Bell className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-gray-100">Status</p>
                              <p className="text-sm text-gray-500 capitalize">{notificationStatus}</p>
                            </div>
                          </div>
                        </div>
                        
                        {notificationStatus === 'default' && (
                          <button
                            onClick={handleRequestPermission}
                            className="w-full py-3 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all"
                          >
                            Enable Notifications
                          </button>
                        )}
                        
                        {notificationStatus === 'denied' && (
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                              Notifications are blocked. Please enable them in your browser settings to receive updates.
                            </p>
                          </div>
                        )}

                        {notificationStatus === 'granted' && (
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                              You're all set! You'll receive notifications for important updates.
                            </p>
                          </div>
                        )}

                        {notificationStatus === 'unsupported' && (
                          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl">
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                              Notifications are not supported by your browser.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {activePage === 'drive' && renderDriveContent()}
                  {activePage === 'donate' && renderDonateContent()}
                  {activePage === 'feedback' && (
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Your thoughts..."
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl border-none focus:ring-2 focus:ring-rose-400 min-h-[120px] placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  )}
                  {activePage === 'feedback' && (
                    <button 
                      onClick={handleFeedbackSubmit}
                      className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 dark:shadow-rose-900/20 hover:bg-rose-600 transition-all"
                    >
                      Submit Feedback
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => onPageChange(page.id)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-all shadow-sm">
                          <page.icon className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">{page.title}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-rose-400 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 text-center">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Memo v1.0.0 • Made with ❤️</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
