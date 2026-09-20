import React, { useState } from 'react';
import {
  RotateCcw,
  MailCheck,
  Mail,
  Star,
  Trash2,
  ShieldAlert,
  Archive,
  ChevronLeft,
  ChevronRight,
  Tag,
} from 'lucide-react';
import { EmailListItem } from './EmailListItem';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const EmailList = ({
  emails = [],
  loading = false,
  folder = 'inbox',
  activeEmailId = null,
  totalCount = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onSelectEmail,
  onRefresh,
  onStarToggle,
  onImportantToggle,
  onBulkAction,
  onEmptyTrash,
  labels = [],
  onPopulateSample,
  isPopulating = false,
}) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [isEmptyTrashOpen, setIsEmptyTrashOpen] = useState(false);
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);

  const allSelected = emails.length > 0 && selectedIds.length === emails.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(emails.map((e) => e.id));
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulk = (action, labelId = null) => {
    if (selectedIds.length === 0) return;
    onBulkAction(selectedIds, action, labelId);
    setSelectedIds([]);
    setLabelDropdownOpen(false);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRange = (page - 1) * pageSize + 1;
  const endRange = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* List Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Select All Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => el && (el.indeterminate = someSelected)}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500/30 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
              title="Select all"
            />
          </div>

          {/* Bulk Actions (visible when items selected) */}
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-1 ml-2 animate-fade-in">
              <button
                type="button"
                onClick={() => handleBulk('read')}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Mark as read"
              >
                <MailCheck className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleBulk('unread')}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Mark as unread"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleBulk('star')}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Star selected"
              >
                <Star className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleBulk('trash')}
                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Move to trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleBulk('archive')}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleBulk('spam')}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Mark as spam"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>

              {/* Apply Label Dropdown */}
              {Array.isArray(labels) && labels.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Apply label"
                  >
                    <Tag className="w-4 h-4" />
                  </button>

                  {labelDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[140px] z-50 animate-fade-in">
                      <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase">
                        Add Label
                      </div>
                      {labels.map((lbl) => (
                        <button
                          key={lbl.id}
                          type="button"
                          onClick={() => handleBulk('add_label', lbl.id)}
                          className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200"
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: lbl.color }}
                          />
                          <span className="truncate">{lbl.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                {selectedIds.length} selected
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh folder"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right side: Empty trash button or Pagination */}
        <div className="flex items-center gap-3">
          {folder === 'trash' && emails.length > 0 && (
            <button
              type="button"
              onClick={() => setIsEmptyTrashOpen(true)}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Empty Trash
            </button>
          )}

          {totalCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {startRange}-{endRange} of {totalCount}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Emails Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
        {loading ? (
          <LoadingSkeleton count={8} />
        ) : emails.length === 0 ? (
          <EmptyState
            folder={folder}
            onAction={onRefresh}
            actionText="Refresh"
            onPopulateSample={onPopulateSample}
            isPopulating={isPopulating}
          />
        ) : (
          emails.map((email) => (
            <EmailListItem
              key={email.id}
              email={email}
              isSelected={selectedIds.includes(email.id)}
              isActive={activeEmailId === email.id}
              onSelect={handleSelectOne}
              onClick={() => onSelectEmail(email)}
              onStarToggle={onStarToggle}
              onImportantToggle={onImportantToggle}
            />
          ))
        )}
      </div>

      {/* Confirm Empty Trash Modal */}
      <ConfirmDialog
        isOpen={isEmptyTrashOpen}
        title="Empty Trash"
        message="Are you sure you want to permanently delete all messages in Trash? This action cannot be undone."
        confirmText="Empty Trash"
        confirmVariant="danger"
        onConfirm={() => {
          onEmptyTrash();
          setIsEmptyTrashOpen(false);
        }}
        onCancel={() => setIsEmptyTrashOpen(false)}
      />
    </div>
  );
};
