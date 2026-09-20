import React from 'react';

export const LoadingSkeleton = ({ count = 6 }) => {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
            </div>
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
};
