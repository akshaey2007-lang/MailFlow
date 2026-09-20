import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Inbox,
  Star,
  Send,
  FileText,
  Bookmark,
  ShieldAlert,
  Trash2,
  Tag,
  Plus,
  Settings,
  Edit2,
  X,
} from 'lucide-react';
import { LabelModal } from './LabelModal';

export const Sidebar = ({
  counts = {},
  labels = [],
  onOpenCompose,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelToEdit, setLabelToEdit] = useState(null);

  const mainNavItems = [
    { to: '/inbox', label: 'Inbox', icon: Inbox, count: counts.inbox, highlightBadge: true },
    { to: '/starred', label: 'Starred', icon: Star, count: counts.starred },
    { to: '/sent', label: 'Sent', icon: Send, count: counts.sent },
    { to: '/drafts', label: 'Drafts', icon: FileText, count: counts.drafts },
    { to: '/important', label: 'Important', icon: Bookmark, count: counts.important },
    { to: '/spam', label: 'Spam', icon: ShieldAlert, count: counts.spam, badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
    { to: '/trash', label: 'Trash', icon: Trash2, count: counts.trash },
  ];

  const handleOpenCreateLabel = () => {
    setLabelToEdit(null);
    setIsLabelModalOpen(true);
  };

  const handleOpenEditLabel = (lbl, e) => {
    e.preventDefault();
    e.stopPropagation();
    setLabelToEdit(lbl);
    setIsLabelModalOpen(true);
  };

  const handleSaveLabel = (data) => {
    if (labelToEdit) {
      onUpdateLabel(labelToEdit.id, data);
    } else {
      onCreateLabel(data);
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-64 flex-shrink-0 select-none">
      {/* Compose Button */}
      <div className="p-4">
        <button
          type="button"
          onClick={onOpenCompose}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-semibold rounded-2xl shadow-lg shadow-brand-500/25 transition-all group"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
          <span>Compose Email</span>
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6">
        {/* Core Folders */}
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>

                {item.count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      item.badgeColor ||
                      (item.highlightBadge
                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                        : 'text-slate-400 dark:text-slate-500')
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Labels Section */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Labels</span>
            <button
              type="button"
              onClick={handleOpenCreateLabel}
              className="p-1 hover:text-brand-600 dark:hover:text-brand-400 rounded transition-colors"
              title="Add new label"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {(Array.isArray(labels) ? labels : []).map((lbl) => (
              <NavLink
                key={lbl.id}
                to={`/label/${lbl.id}`}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: lbl.color }}
                  />
                  <span className="truncate">{lbl.name}</span>
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditLabel(lbl, e)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Edit label"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteLabel(lbl.id);
                    }}
                    className="text-slate-400 hover:text-rose-500"
                    title="Delete label"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </NavLink>
            ))}

            {(!labels || (Array.isArray(labels) && labels.length === 0)) && (
              <p className="px-3 text-xs text-slate-400 italic">No custom labels</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Settings Link */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
        <NavLink
          to="/settings"
          onClick={onCloseMobile}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              isActive
                ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </NavLink>
      </div>

      {/* Label Modal */}
      <LabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        onSave={handleSaveLabel}
        labelToEdit={labelToEdit}
      />
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex h-full flex-shrink-0">{content}</aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-64 bg-white dark:bg-slate-900 h-full shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
