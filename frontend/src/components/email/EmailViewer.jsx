import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  Reply,
  ReplyAll,
  Forward,
  Star,
  Bookmark,
  Trash2,
  Archive,
  Mail,
  ShieldAlert,
  Paperclip,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Tag,
  Send,
  CornerUpLeft,
} from 'lucide-react';

export const EmailViewer = ({
  email,
  onClose,
  onReply,
  onReplyAll,
  onForward,
  onStarToggle,
  onImportantToggle,
  onTrash,
  onArchive,
  onMarkUnread,
  onSpam,
  onRestore,
  labels = [],
  onToggleLabel,
  onQuickReply,
}) => {
  const [quickReplyText, setQuickReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const [expandedThreadIds, setExpandedThreadIds] = useState([]);

  if (!email) {
    return (
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center h-full bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-3">
          <Mail className="w-8 h-8 text-slate-400" />
        </div>
        <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300">
          No email selected
        </h4>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          Choose an email from the list on the left to read its full contents, attachments, and replies.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString([], {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename = '', contentType = '') => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || contentType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    }
    if (['pdf'].includes(ext) || contentType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-5 h-5 text-teal-500" />;
    }
    return <FileCode className="w-5 h-5 text-indigo-500" />;
  };

  const handleSendQuickReply = async () => {
    if (!quickReplyText.trim() || isSendingReply) return;
    setIsSendingReply(true);
    try {
      await onQuickReply(email, quickReplyText);
      setQuickReplyText('');
    } finally {
      setIsSendingReply(false);
    }
  };

  const toggleThreadMessage = (id) => {
    setExpandedThreadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden animate-fade-in">
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
        <div className="flex items-center gap-1">
          {/* Mobile Back Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors mr-1"
              title="Back to list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onReply(email)}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onReplyAll(email)}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:block"
            title="Reply All"
          >
            <ReplyAll className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onForward(email)}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors hidden sm:block"
            title="Forward"
          >
            <Forward className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => onStarToggle(email.id)}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={email.is_starred ? 'Unstar' : 'Star'}
          >
            <Star
              className={`w-4 h-4 ${
                email.is_starred
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-400'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => onImportantToggle(email.id)}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={email.is_important ? 'Mark Unimportant' : 'Mark Important'}
          >
            <Bookmark
              className={`w-4 h-4 ${
                email.is_important
                  ? 'text-amber-500 fill-amber-500'
                  : 'text-slate-400'
              }`}
            />
          </button>

          {/* Labels Dropdown */}
          {Array.isArray(labels) && labels.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Labels"
              >
                <Tag className="w-4 h-4" />
              </button>

              {labelDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[150px] z-50 animate-fade-in">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                    Assign Label
                  </div>
                  {labels.map((lbl) => {
                    const isAssigned = email.labels?.some((l) => l.id === lbl.id);
                    return (
                      <button
                        key={lbl.id}
                        type="button"
                        onClick={() => {
                          onToggleLabel(email.id, lbl.id);
                          setLabelDropdownOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: lbl.color }}
                          />
                          <span className="truncate">{lbl.name}</span>
                        </span>
                        {isAssigned && <span className="text-brand-600 font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right action icons */}
        <div className="flex items-center gap-1">
          {email.folder === 'trash' ? (
            <button
              type="button"
              onClick={() => onRestore(email.id)}
              className="px-2.5 py-1 text-xs font-medium text-brand-600 bg-brand-50 dark:bg-brand-950/40 rounded-lg hover:bg-brand-100"
            >
              Restore to Inbox
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onArchive(email.id)}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onMarkUnread(email.id)}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Mark Unread"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onSpam(email.id)}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Mark Spam"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onTrash(email.id)}
                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Email Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Email Header */}
        <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {email.subject || '(No Subject)'}
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
              {formatDate(email.received_at || email.created_at)}
            </span>
          </div>

          {/* Labels bar */}
          {email.labels && email.labels.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {email.labels.map((lbl) => (
                <span
                  key={lbl.id}
                  className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
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
          )}

          {/* Sender & Recipient Information */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-semibold flex items-center justify-center text-sm shadow-sm">
                {(email.sender_name || email.sender_email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {email.sender_name || email.sender_email}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    &lt;{email.sender_email}&gt;
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  to {email.recipient_emails}
                  {email.cc_emails && <span className="ml-1">| cc: {email.cc_emails}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Previous Messages in Thread (Conversation View) */}
        {email.thread_messages && email.thread_messages.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Conversation History ({email.thread_messages.length} previous messages)
            </div>
            {email.thread_messages.map((threadMsg) => {
              const isExpanded = expandedThreadIds.includes(threadMsg.id);
              return (
                <div
                  key={threadMsg.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 p-4 transition-all"
                >
                  <div
                    onClick={() => toggleThreadMessage(threadMsg.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {threadMsg.sender_name || threadMsg.sender_email}
                      </span>
                      <span className="text-xs text-slate-500 truncate max-w-md">
                        — {threadMsg.snippet}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(threadMsg.received_at || threadMsg.created_at)}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {threadMsg.body_text || threadMsg.snippet}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Main Email Body */}
        <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 space-y-4">
          {email.body_html ? (
            <div
              className="prose dark:prose-invert max-w-none break-words"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body_html) }}
            />
          ) : (
            <div className="whitespace-pre-wrap font-sans">
              {email.body_text || '(Empty Message)'}
            </div>
          )}
        </div>

        {/* Attachments Section */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Paperclip className="w-3.5 h-3.5" /> Attachments ({email.attachments.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {email.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {getFileIcon(att.filename, att.content_type)}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {att.filename}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatFileSize(att.file_size)}
                      </p>
                    </div>
                  </div>
                  {att.file_url && (
                    <a
                      href={att.file_url}
                      download={att.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Reply Box */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <CornerUpLeft className="w-3.5 h-3.5 text-brand-600" />
              Quick Reply to <span className="font-semibold">{email.sender_name || email.sender_email}</span>
            </div>
            <textarea
              rows={3}
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              placeholder="Write a quick reply..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none transition-all"
            />
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => onReply(email)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
              >
                Open Full Compose Window
              </button>
              <button
                type="button"
                onClick={handleSendQuickReply}
                disabled={!quickReplyText.trim() || isSendingReply}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600 rounded-lg shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
