'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useTheme } from '@/context/ThemeContext';
import { UserSession } from '@/lib/types';
import {
  Layers,
  FolderLock,
  Compass,
  Plus,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Tag,
  X,
  Code,
} from 'lucide-react';

interface SidebarProps {
  user: UserSession | null;
  activeTab: 'my' | 'explore';
  onTabChange: (tab: 'my' | 'explore') => void;
  onOpenNewSnippet: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  availableTags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export default function Sidebar({
  user,
  activeTab,
  onTabChange,
  onOpenNewSnippet,
  onLogout,
  isOpenMobile,
  onCloseMobile,
  availableTags,
  selectedTag,
  onSelectTag,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  const navContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-64 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <Logo size="md" />
        <button
          onClick={onCloseMobile}
          aria-label="Close navigation drawer"
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Action: Create Snippet */}
      <div className="p-4 pb-2">
        <button
          onClick={() => {
            onOpenNewSnippet();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Snippet</span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        <div>
          <span className="px-3 text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
            Workspaces
          </span>
          <nav className="mt-2 space-y-1">
            <button
              onClick={() => {
                onTabChange('my');
                onCloseMobile();
              }}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'my'
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FolderLock className="w-4 h-4" />
              <span>My Vault</span>
            </button>

            <button
              onClick={() => {
                onTabChange('explore');
                onCloseMobile();
              }}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === 'explore'
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore Public</span>
            </button>
          </nav>
        </div>

        {/* Tags Quick Filter */}
        {availableTags.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 flex items-center space-x-1">
                <Tag className="w-3 h-3" />
                <span>Tags</span>
              </span>
              {selectedTag && (
                <button
                  onClick={() => onSelectTag(null)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 px-3">
              {availableTags.slice(0, 12).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    onSelectTag(selectedTag === t ? null : t);
                    onCloseMobile();
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                    selectedTag === t
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer / User & Theme */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <span className="flex items-center space-x-2">
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
            <span>Theme: {theme === 'light' ? 'Light' : 'Dark'}</span>
          </span>
          <span className="text-[10px] uppercase font-mono text-slate-400">Toggle</span>
        </button>

        {/* User Card */}
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center space-x-2 min-w-0 pr-1">
              <div className="w-7 h-7 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 pt-1">
            <Link
              href="/login"
              className="flex-1 text-center py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex-1 text-center py-2 px-3 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 transition"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block flex-shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10">{navContent}</div>
        </div>
      )}
    </>
  );
}
