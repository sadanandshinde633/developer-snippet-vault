'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import SnippetCard from '@/components/SnippetCard';
import SnippetModal from '@/components/SnippetModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import Logo from '@/components/Logo';
import { SnippetDTO, UserSession } from '@/lib/types';
import {
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Code,
  Menu,
  Layers,
  Sparkles,
  Database,
  ArrowRight,
  FolderLock,
  Compass,
} from 'lucide-react';

const FILTER_LANGUAGES = [
  'all',
  'javascript',
  'typescript',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'sql',
  'html',
  'css',
  'bash',
  'go',
  'rust',
  'php',
  'json',
  'markdown',
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [snippets, setSnippets] = useState<SnippetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'explore'>('my');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Mobile Drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<SnippetDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check current session
  const checkUserSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
        // If not logged in, default view to explore
        setActiveTab((prev) => (prev === 'my' ? 'explore' : prev));
      }
    } catch {
      setUser(null);
    }
  }, []);

  // Fetch snippets based on current tab and filters
  const fetchSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('view', activeTab);
      if (search.trim()) params.set('search', search.trim());
      if (selectedLanguage !== 'all') params.set('language', selectedLanguage);
      if (selectedTag) params.set('tag', selectedTag);

      const res = await fetch(`/api/snippets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSnippets(data.snippets || []);
      }
    } catch (err) {
      console.error('Failed to load snippets', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, selectedLanguage, selectedTag]);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  // Aggregate all unique tags from snippets
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    snippets.forEach((s) => {
      s.tags?.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [snippets]);

  // Metrics
  const metrics = useMemo(() => {
    const total = snippets.length;
    const languages = new Set(snippets.map((s) => s.language)).size;
    const aiTagged = snippets.filter((s) => (s.tags && s.tags.length > 0) || Boolean(s.summary)).length;
    return { total, languages, aiTagged };
  }, [snippets]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setActiveTab('explore');
      showToast('Signed out successfully');
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const handleDeleteTrigger = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/snippets/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSnippets((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        showToast('Snippet deleted');
        setDeleteTarget(null);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to delete snippet');
      }
    } catch {
      showToast('Error deleting snippet');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveSuccess = (savedSnippet: SnippetDTO) => {
    if (editingSnippet) {
      setSnippets((prev) => prev.map((s) => (s.id === savedSnippet.id ? savedSnippet : s)));
      showToast('Snippet updated successfully');
    } else {
      setSnippets((prev) => [savedSnippet, ...prev]);
      showToast('Snippet created successfully');
    }
  };

  const handleNewSnippetClick = () => {
    if (!user) {
      router.push('/login');
    } else {
      setEditingSnippet(null);
      setIsSnippetModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar Component */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'my' && !user) {
            router.push('/login');
            return;
          }
          setActiveTab(tab);
        }}
        onOpenNewSnippet={handleNewSnippetClick}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        availableTags={availableTags}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Logo size="sm" />
          <button
            onClick={handleNewSnippetClick}
            aria-label="Create snippet"
            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </header>

        {/* Desktop Topbar / Search Toolbar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-20">
          {/* Search Box */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, title, tags, or AI summaries..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleNewSnippetClick}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Snippet</span>
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Workspace Banner & Metrics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    {activeTab === 'my' ? <FolderLock className="w-4 h-4" /> : <Compass className="w-4 h-4" />}
                  </div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {activeTab === 'my'
                      ? user
                        ? `${user.name || user.email}'s Vault`
                        : 'Personal Vault'
                      : 'Explore Public Snippets'}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {activeTab === 'my'
                    ? 'Securely managed snippets in MongoDB Atlas with Gemini AI auto-tagging.'
                    : 'Discover public code snippets shared across the developer community.'}
                </p>
              </div>

              {/* Metrics Pills */}
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                  <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">{metrics.total}</span>
                  <span className="text-[10px] uppercase font-mono text-slate-400">Snippets</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                  <span className="block text-xs font-bold text-indigo-600 dark:text-indigo-400">{metrics.languages}</span>
                  <span className="text-[10px] uppercase font-mono text-slate-400">Languages</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                  <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">{metrics.aiTagged}</span>
                  <span className="text-[10px] uppercase font-mono text-slate-400">AI Tagged</span>
                </div>
              </div>
            </div>

            {/* Language Filter Bar */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mr-2 flex items-center space-x-1 flex-shrink-0">
                <Filter className="w-3 h-3" />
                <span>Language:</span>
              </span>
              {FILTER_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider transition whitespace-nowrap ${
                    selectedLanguage === lang
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Selected Tag Indicator */}
            {selectedTag && (
              <div className="mt-3 flex items-center space-x-2">
                <span className="text-xs text-slate-500">Filtered by tag:</span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-xs font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <span>{selectedTag}</span>
                  <button
                    onClick={() => setSelectedTag(null)}
                    aria-label="Remove tag filter"
                    className="hover:text-rose-500 ml-1 text-slate-400"
                  >
                    ✕
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Snippets Grid or Empty State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-mono">Loading snippets from MongoDB Atlas...</p>
            </div>
          ) : snippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Code className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {activeTab === 'my' && !user ? 'Sign in to access your vault' : 'No snippets found'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md">
                {activeTab === 'my' && !user
                  ? 'Sign in or create an account to store and organize your private developer code snippets with AI.'
                  : 'No code snippets match your current search and language filters. Create your first snippet to get started!'}
              </p>
              <div className="mt-5">
                {activeTab === 'my' && !user ? (
                  <Link
                    href="/login"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <button
                    onClick={handleNewSnippetClick}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Snippet</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {snippets.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  isOwner={Boolean(user && user.id === snippet.userId)}
                  onEdit={(s) => {
                    setEditingSnippet(s);
                    setIsSnippetModalOpen(true);
                  }}
                  onDelete={handleDeleteTrigger}
                  onSelectTag={(t) => setSelectedTag(t)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Snippet Create / Edit Modal */}
      <SnippetModal
        isOpen={isSnippetModalOpen}
        onClose={() => setIsSnippetModalOpen(false)}
        snippetToEdit={editingSnippet}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.title || ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </div>
  );
}
