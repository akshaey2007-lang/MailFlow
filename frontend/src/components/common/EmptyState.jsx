import React from 'react';
import { Mail, Inbox, Trash2, ShieldAlert, Star, Bookmark, Sparkles, RefreshCw, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EmptyState = ({
  folder = 'inbox',
  title,
  description,
  actionText,
  onAction,
  onPopulateSample,
  isPopulating,
}) => {
  const getIcon = () => {
    switch (folder) {
      case 'starred':
        return <Star className="w-12 h-12 text-amber-400/80 stroke-[1.5]" />;
      case 'important':
        return <Bookmark className="w-12 h-12 text-amber-500/80 stroke-[1.5]" />;
      case 'trash':
        return <Trash2 className="w-12 h-12 text-slate-400 stroke-[1.5]" />;
      case 'spam':
        return <ShieldAlert className="w-12 h-12 text-rose-400 stroke-[1.5]" />;
      default:
        return <Inbox className="w-12 h-12 text-brand-500/80 stroke-[1.5]" />;
    }
  };

  const defaultTitles = {
    inbox: 'Your inbox is ready',
    sent: 'No sent emails yet',
    starred: 'No starred emails',
    important: 'No important messages',
    drafts: 'No saved drafts',
    trash: 'Trash is empty',
    spam: 'Hooray, no spam here!',
    search: 'No emails match your query',
  };

  const defaultDescriptions = {
    inbox: 'Receive all emails addressed to your account here, or load a full set of sample emails to explore.',
    sent: 'Emails you send will be stored here.',
    starred: 'Star important emails to quickly find them later.',
    important: 'Messages marked as important will show up in this view.',
    drafts: 'In-progress emails are autosaved and stored here.',
    trash: 'Items moved to trash stay here until permanently deleted or emptied.',
    spam: 'Clean inbox! Suspicious or unwanted messages will land here.',
    search: 'Try adjusting your search terms or clearing some filters.',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center my-auto min-h-[350px]">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/60 rounded-full flex items-center justify-center mb-4 ring-8 ring-slate-50 dark:ring-slate-900">
        {getIcon()}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
        {title || defaultTitles[folder] || 'No emails found'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description || defaultDescriptions[folder] || 'Nothing to display right now.'}
      </p>

      {folder === 'inbox' && onPopulateSample ? (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onPopulateSample}
            disabled={isPopulating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-brand-500/20 hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isPopulating ? 'Loading Emails...' : 'Load Sample Emails'}
          </button>

          <Link
            to="/settings"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Connect Live Gmail
          </Link>
        </div>
      ) : (
        actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm hover:shadow transition-all"
          >
            {actionText}
          </button>
        )
      )}
    </div>
  );
};
