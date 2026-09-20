import React from 'react';
import { Star, Bookmark, Paperclip } from 'lucide-react';

export const EmailListItem = ({
  email,
  isSelected,
  isActive,
  onSelect,
  onClick,
  onStarToggle,
  onImportantToggle,
}) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const getInitial = (name, emailStr) => {
    const target = name || emailStr || 'U';
    return target.charAt(0).toUpperCase();
  };

  // Color generator for avatar based on name string
  const getAvatarColor = (name) => {
    const colors = [
      'bg-indigo-500 text-white',
      'bg-emerald-500 text-white',
      'bg-sky-500 text-white',
      'bg-rose-500 text-white',
      'bg-amber-500 text-white',
      'bg-purple-500 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-slate-100 dark:border-slate-800/80 ${
        isActive
          ? 'bg-brand-50/80 dark:bg-brand-950/30 border-l-4 border-l-brand-600 dark:border-l-brand-400'
          : email.is_read
          ? 'bg-white hover:bg-slate-50/90 dark:bg-slate-900/60 dark:hover:bg-slate-800/50'
          : 'bg-slate-50/80 hover:bg-slate-100/90 dark:bg-slate-800/80 dark:hover:bg-slate-750'
      }`}
    >
      {/* Checkbox */}
      <div
        className="flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(email.id);
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500/30 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
        />
      </div>

      {/* Star & Important Icons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStarToggle(email.id);
          }}
          className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
          title={email.is_starred ? 'Unstar' : 'Star'}
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              email.is_starred
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'
            }`}
          />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onImportantToggle(email.id);
          }}
          className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors hidden sm:block"
          title={email.is_important ? 'Important' : 'Mark Important'}
        >
          <Bookmark
            className={`w-3.5 h-3.5 transition-colors ${
              email.is_important
                ? 'text-amber-500 fill-amber-500'
                : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'
            }`}
          />
        </button>
      </div>

      {/* Sender Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 shadow-sm ${getAvatarColor(
          email.sender_name || email.sender_email
        )}`}
      >
        {getInitial(email.sender_name, email.sender_email)}
      </div>

      {/* Email Body Snippet & Sender Info */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span
            className={`truncate text-sm ${
              !email.is_read
                ? 'font-bold text-slate-900 dark:text-white'
                : 'font-medium text-slate-700 dark:text-slate-300'
            }`}
          >
            {email.sender_name || email.sender_email}
          </span>
          <span
            className={`text-xs flex-shrink-0 ${
              !email.is_read
                ? 'font-semibold text-brand-600 dark:text-brand-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {formatDate(email.received_at || email.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-sm truncate ${
              !email.is_read
                ? 'font-semibold text-slate-900 dark:text-slate-100'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {email.subject || '(No Subject)'}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate hidden md:inline">
            — {email.snippet}
          </span>
        </div>

        {/* Labels & Attachment Indicators */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {email.has_attachment && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"
              title="Has attachment"
            >
              <Paperclip className="w-2.5 h-2.5" />
            </span>
          )}

          {email.labels &&
            email.labels.map((lbl) => (
              <span
                key={lbl.id}
                className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full"
                style={{
                  backgroundColor: `${lbl.color}15`,
                  color: lbl.color,
                  borderColor: `${lbl.color}30`,
                  borderWidth: '1px',
                }}
              >
                {lbl.name}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
};
