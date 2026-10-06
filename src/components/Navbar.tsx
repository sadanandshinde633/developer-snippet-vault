'use client';

import React from 'react';
import { Terminal, Plus, LogOut, User as UserIcon, Layers, Compass } from 'lucide-react';
import { UserSession } from '@/lib/types';

interface NavbarProps {
  user: UserSession | null;
  activeTab: 'my' | 'explore';
  onTabChange: (tab: 'my' | 'explore') => void;
  onOpenAuth: () => void;
  onOpenNewSnippet: () => void;
  onLogout: () => void;
}

export default function Navbar({
  user,
  activeTab,
  onTabChange,
  onOpenAuth,
  onOpenNewSnippet,
  onLogout,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950 border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Brand */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-zinc-100">
                <Terminal className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-zinc-100 text-sm tracking-tight">Snippet Vault</span>
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                  AI
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden sm:flex items-center space-x-1 border-l border-zinc-800/80 pl-6">
              <button
                onClick={() => onTabChange('my')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'my'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>My Vault</span>
              </button>
              <button
                onClick={() => onTabChange('explore')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'explore'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore</span>
              </button>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onOpenNewSnippet}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium rounded-md shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Snippet</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-zinc-800">
                <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-300 font-mono">
                  <UserIcon className="w-3 h-3 text-zinc-400" />
                  <span className="max-w-[120px] truncate">{user.name || user.email.split('@')[0]}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-md hover:bg-zinc-900 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
