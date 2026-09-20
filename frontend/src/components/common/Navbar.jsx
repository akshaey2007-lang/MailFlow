import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  RefreshCw,
  Sun,
  Moon,
  LogOut,
  Settings,
  User,
  Menu,
  CheckCircle2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { emailApi } from '../../api/emails';
import { SearchBar } from '../email/SearchBar';

export const Navbar = ({
  onSearch,
  onSyncComplete,
  onPopulateSample,
  isPopulating = false,
  labels = [],
  currentFilters = {},
  onToggleMobileSidebar,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isSyncing, setIsSyncing] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [syncMenuOpen, setSyncMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const syncMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (syncMenuRef.current && !syncMenuRef.current.contains(e.target)) {
        setSyncMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await emailApi.syncInbox();
      toast.success(res.message || 'Inbox synchronized successfully!');
      if (onSyncComplete) {
        onSyncComplete(res);
      }
    } catch (err) {
      toast.error('Inbox sync encountered an issue.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('Logged out successfully');
  };

  const userInitial = (user?.full_name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 gap-4">
      {/* Left: Brand Logo & Mobile Toggle */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg md:hidden"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/inbox" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400 bg-clip-text text-transparent">
              MailFlow
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Search Bar */}
      <SearchBar onSearch={onSearch} labels={labels} currentFilters={currentFilters} />

      {/* Right: Sync, Theme Toggle, Profile Dropdown */}
      <div className="flex items-center gap-2">
        {/* Sync Inbox Button Group */}
        <div className="relative flex items-center" ref={syncMenuRef}>
          <div className="inline-flex rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-l-xl transition-all ${
                isSyncing
                  ? 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
              title="Synchronize Inbox"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-brand-600' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSyncMenuOpen(!syncMenuOpen)}
              className="px-1.5 py-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-l border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-r-xl transition-colors"
              title="More Sync Options"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {syncMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in text-xs">
              <button
                type="button"
                onClick={() => {
                  setSyncMenuOpen(false);
                  handleSync();
                }}
                disabled={isSyncing}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-brand-600" />
                <span>Check for New Emails</span>
              </button>

              {onPopulateSample && (
                <button
                  type="button"
                  onClick={() => {
                    setSyncMenuOpen(false);
                    onPopulateSample(false);
                  }}
                  disabled={isPopulating}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isPopulating ? 'Loading Emails...' : 'Load Sample Emails'}</span>
                </button>
              )}

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <Link
                to="/settings"
                onClick={() => setSyncMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Connect Live Gmail / IMAP</span>
              </Link>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Profile Avatar & Dropdown */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-brand-500/30 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-semibold flex items-center justify-center text-xs shadow-sm">
              {userInitial}
            </div>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user?.full_name || 'MailFlow User'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>

              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings & Preferences
                </Link>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
