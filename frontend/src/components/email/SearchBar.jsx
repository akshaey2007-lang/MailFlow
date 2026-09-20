import React, { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X, Paperclip, Star, Bookmark, Mail, Check } from 'lucide-react';

export const SearchBar = ({ onSearch, labels = [], currentFilters = {} }) => {
  const [query, setQuery] = useState(currentFilters.q || '');
  const [isOpenFilter, setIsOpenFilter] = useState(false);
  const [filters, setFilters] = useState({
    has_attachment: currentFilters.has_attachment || false,
    is_starred: currentFilters.is_starred || false,
    is_important: currentFilters.is_important || false,
    is_read: currentFilters.is_read || '',
    label: currentFilters.label || '',
  });

  const popoverRef = useRef(null);

  // Debounced search when query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch({ ...filters, q: query.trim() });
    }, 350);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside listener for filter popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpenFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyFilters = () => {
    onSearch({ ...filters, q: query.trim() });
    setIsOpenFilter(false);
  };

  const handleResetFilters = () => {
    const reset = {
      has_attachment: false,
      is_starred: false,
      is_important: false,
      is_read: '',
      label: '',
    };
    setFilters(reset);
    onSearch({ ...reset, q: query.trim() });
    setIsOpenFilter(false);
  };

  const hasActiveFilters =
    filters.has_attachment ||
    filters.is_starred ||
    filters.is_important ||
    filters.is_read !== '' ||
    filters.label !== '';

  return (
    <div className="relative flex-1 max-w-2xl" ref={popoverRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emails by sender, recipient, subject, or message..."
          className="w-full pl-10 pr-20 py-2 text-sm bg-slate-100/80 dark:bg-slate-800/80 border border-transparent dark:border-slate-700/60 focus:border-brand-500/50 dark:focus:border-brand-400/50 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:focus:ring-brand-400/20 transition-all shadow-inner"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                onSearch({ ...filters, q: '' });
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpenFilter(!isOpenFilter)}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              hasActiveFilters || isOpenFilter
                ? 'bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 ring-1 ring-brand-500/30'
                : 'text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
            title="Advanced Search Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Dropdown Popover */}
      {isOpenFilter && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl z-40 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Refine Search
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quick Toggle Chips */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Attributes
              </label>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, has_attachment: !filters.has_attachment })}
                  className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg border transition-all ${
                    filters.has_attachment
                      ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5" /> Has Attachment
                  </span>
                  {filters.has_attachment && <Check className="w-3.5 h-3.5 text-brand-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, is_starred: !filters.is_starred })}
                  className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg border transition-all ${
                    filters.is_starred
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5" /> Starred Only
                  </span>
                  {filters.is_starred && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, is_important: !filters.is_important })}
                  className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg border transition-all ${
                    filters.is_important
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Bookmark className="w-3.5 h-3.5" /> Important
                  </span>
                  {filters.is_important && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>
              </div>
            </div>

            {/* Read status & Label selection */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                  Read Status
                </label>
                <select
                  value={filters.is_read}
                  onChange={(e) => setFilters({ ...filters, is_read: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">All (Read & Unread)</option>
                  <option value="false">Unread Only</option>
                  <option value="true">Read Only</option>
                </select>
              </div>

              {Array.isArray(labels) && labels.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                    Filter by Label
                  </label>
                  <select
                    value={filters.label}
                    onChange={(e) => setFilters({ ...filters, label: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">Any Label</option>
                    {labels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpenFilter(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="px-4 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
