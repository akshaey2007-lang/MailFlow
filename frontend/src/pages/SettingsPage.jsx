import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Sliders,
  Mail,
  Lock,
  Sun,
  Moon,
  Save,
  CheckCircle2,
  Info,
  Server,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { authApi } from '../api/auth';
import { emailApi } from '../api/emails';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'email_servers' | 'preferences'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSync, setTestingSync] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    theme_preference: 'light',
    emails_per_page: 20,
    default_signature: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    has_smtp_password: false,
    smtp_use_tls: true,
    imap_host: '',
    imap_port: 993,
    imap_username: '',
    imap_password: '',
    has_imap_password: false,
    imap_use_ssl: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await authApi.getSettings();
        const email = (user?.email || '').toLowerCase();
        let defaultSmtpHost = data.smtp_host || '';
        let defaultSmtpPort = data.smtp_port || 587;
        let defaultSmtpUser = data.smtp_username || '';
        let defaultImapHost = data.imap_host || '';
        let defaultImapPort = data.imap_port || 993;
        let defaultImapUser = data.imap_username || '';

        if (email.includes('gmail.com')) {
          if (!defaultSmtpHost) defaultSmtpHost = 'smtp.gmail.com';
          if (!defaultSmtpUser) defaultSmtpUser = user?.email || '';
          if (!defaultImapHost) defaultImapHost = 'imap.gmail.com';
          if (!defaultImapUser) defaultImapUser = user?.email || '';
        } else if (email.includes('outlook.com') || email.includes('hotmail.com')) {
          if (!defaultSmtpHost) defaultSmtpHost = 'smtp.office365.com';
          if (!defaultSmtpUser) defaultSmtpUser = user?.email || '';
          if (!defaultImapHost) defaultImapHost = 'outlook.office365.com';
          if (!defaultImapUser) defaultImapUser = user?.email || '';
        } else if (email.includes('yahoo.com')) {
          if (!defaultSmtpHost) defaultSmtpHost = 'smtp.mail.yahoo.com';
          if (!defaultSmtpUser) defaultSmtpUser = user?.email || '';
          if (!defaultImapHost) defaultImapHost = 'imap.mail.yahoo.com';
          if (!defaultImapUser) defaultImapUser = user?.email || '';
        }

        setFormData({
          ...data,
          smtp_host: defaultSmtpHost,
          smtp_port: defaultSmtpPort,
          smtp_username: defaultSmtpUser,
          imap_host: defaultImapHost,
          imap_port: defaultImapPort,
          imap_username: defaultImapUser,
          smtp_password: '',
          imap_password: '',
        });
      } catch (err) {
        toast.error('Failed to load user settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      // Omit empty password strings so existing passwords are not overwritten with empty
      if (!payload.smtp_password) delete payload.smtp_password;
      if (!payload.imap_password) delete payload.imap_password;

      const updated = await authApi.updateSettings(payload);
      setFormData((prev) => ({
        ...prev,
        ...updated,
        smtp_password: '',
        imap_password: '',
      }));

      // Update auth context user name and theme
      updateUser({
        ...user,
        full_name: updated.full_name,
        theme_preference: updated.theme_preference,
        emails_per_page: updated.emails_per_page,
        default_signature: updated.default_signature,
      });

      if (updated.theme_preference !== theme) {
        setTheme(updated.theme_preference);
      }

      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar */}
      <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-6 gap-4 sticky top-0 z-20">
        <Link
          to="/inbox"
          className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Back to MailFlow"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">MailFlow Settings</h1>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            Profile & Appearance
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Preferences & Signature
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email_servers')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'email_servers'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            SMTP & IMAP Setup
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* TAB 1: Profile & Appearance */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  User Profile
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleChange('full_name', e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Appearance Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Interface Theme
                </h3>

                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('theme_preference', 'light');
                      setTheme('light');
                    }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                      theme === 'light'
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900">Light Mode</p>
                      <p className="text-[11px] text-slate-500">Crisp and clean</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleChange('theme_preference', 'dark');
                      setTheme('dark');
                    }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                      theme === 'dark'
                        ? 'border-brand-500 bg-slate-800 ring-2 ring-brand-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-100">Dark Mode</p>
                      <p className="text-[11px] text-slate-400">Sleek on eyes</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Preferences & Signature */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Inbox Preferences
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Emails Displayed Per Page
                  </label>
                  <select
                    value={formData.emails_per_page}
                    onChange={(e) => handleChange('emails_per_page', parseInt(e.target.value, 10))}
                    className="w-full max-w-xs px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    <option value={10}>10 emails per page</option>
                    <option value={20}>20 emails per page</option>
                    <option value={50}>50 emails per page</option>
                    <option value={100}>100 emails per page</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Default Email Signature
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    This signature will automatically be pre-filled when composing new emails.
                  </p>
                  <textarea
                    rows={4}
                    value={formData.default_signature}
                    onChange={(e) => handleChange('default_signature', e.target.value)}
                    placeholder="--&#10;Your Name&#10;Title / Department"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-sans"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SMTP & IMAP Configuration */}
          {activeTab === 'email_servers' && (
            <div className="space-y-6 animate-fade-in">
              {/* Google App Password Guide (if Gmail user) */}
              {user?.email?.toLowerCase().includes('gmail.com') && (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/60 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20">
                        G
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Sync Real Gmail Emails to {user.email}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Google requires a 16-character App Password to synchronize live emails via IMAP/SMTP.
                        </p>
                      </div>
                    </div>

                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 rounded-xl transition-colors"
                    >
                      <span>Get App Password</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/40">
                      <span className="font-bold text-blue-600 dark:text-blue-400 mr-1">1.</span>
                      Enable 2-Step Verification on your Google Account.
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/40">
                      <span className="font-bold text-blue-600 dark:text-blue-400 mr-1">2.</span>
                      Generate an App Password (name it "MailFlow").
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/40">
                      <span className="font-bold text-blue-600 dark:text-blue-400 mr-1">3.</span>
                      Paste it into the IMAP Password field below and Save!
                    </div>
                  </div>
                </div>
              )}

              {/* Informational Banner */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-start justify-between gap-3.5">
                <div className="flex items-start gap-3.5">
                  <Info className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Development & Real Server Hybrid Mode:
                    </span>{' '}
                    Emails sent internally within MailFlow are instantly delivered to recipient inboxes. When external IMAP/SMTP credentials are configured, MailFlow will automatically synchronize with your live email provider.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setTestingSync(true);
                    try {
                      const res = await emailApi.syncInbox();
                      toast.success(res.message || 'Sync completed successfully!');
                    } catch (err) {
                      toast.error('Sync encountered an issue');
                    } finally {
                      setTestingSync(false);
                    }
                  }}
                  disabled={testingSync}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingSync ? 'animate-spin' : ''}`} />
                  <span>{testingSync ? 'Testing...' : 'Test Sync Now'}</span>
                </button>
              </div>

              {/* SMTP Settings */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Outgoing Mail (SMTP)
                  </h3>
                  {formData.has_smtp_password && (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Password Configured
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={formData.smtp_host}
                      onChange={(e) => handleChange('smtp_host', e.target.value)}
                      placeholder="e.g. smtp.gmail.com"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={formData.smtp_port}
                      onChange={(e) => handleChange('smtp_port', parseInt(e.target.value, 10))}
                      placeholder="587"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={formData.smtp_username}
                      onChange={(e) => handleChange('smtp_username', e.target.value)}
                      placeholder="your-email@domain.com"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      SMTP Password / App Password
                    </label>
                    <input
                      type="password"
                      value={formData.smtp_password}
                      onChange={(e) => handleChange('smtp_password', e.target.value)}
                      placeholder={formData.has_smtp_password ? '•••••••• (unchanged)' : 'Enter SMTP password'}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="smtp_tls"
                    checked={formData.smtp_use_tls}
                    onChange={(e) => handleChange('smtp_use_tls', e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="smtp_tls" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Use TLS (Recommended for port 587)
                  </label>
                </div>
              </div>

              {/* IMAP Settings */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Incoming Mail Synchronization (IMAP)
                  </h3>
                  {formData.has_imap_password && (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Password Configured
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      IMAP Host
                    </label>
                    <input
                      type="text"
                      value={formData.imap_host}
                      onChange={(e) => handleChange('imap_host', e.target.value)}
                      placeholder="e.g. imap.gmail.com"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      IMAP Port
                    </label>
                    <input
                      type="number"
                      value={formData.imap_port}
                      onChange={(e) => handleChange('imap_port', parseInt(e.target.value, 10))}
                      placeholder="993"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      IMAP Username
                    </label>
                    <input
                      type="text"
                      value={formData.imap_username}
                      onChange={(e) => handleChange('imap_username', e.target.value)}
                      placeholder="your-email@domain.com"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      IMAP Password / App Password
                    </label>
                    <input
                      type="password"
                      value={formData.imap_password}
                      onChange={(e) => handleChange('imap_password', e.target.value)}
                      placeholder={formData.has_imap_password ? '•••••••• (unchanged)' : 'Enter IMAP password'}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="imap_ssl"
                    checked={formData.imap_use_ssl}
                    onChange={(e) => handleChange('imap_use_ssl', e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="imap_ssl" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Use SSL (Recommended for port 993)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Link
              to="/inbox"
              className="px-5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-colors"
            >
              Back to Inbox
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl shadow-lg shadow-brand-500/25 transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
