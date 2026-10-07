'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Code2, Loader2, Check } from 'lucide-react';
import { SnippetDTO } from '@/lib/types';

interface SnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (snippet: SnippetDTO) => void;
  snippetToEdit?: SnippetDTO | null;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'php', label: 'PHP' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'markdown', label: 'Markdown' },
];

export default function SnippetModal({
  isOpen,
  onClose,
  onSaveSuccess,
  snippetToEdit,
}: SnippetModalProps) {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (snippetToEdit) {
      setTitle(snippetToEdit.title);
      setLanguage(snippetToEdit.language || 'javascript');
      setCode(snippetToEdit.code);
      setDescription(snippetToEdit.description || '');
      setSummary(snippetToEdit.summary || '');
      setTags(snippetToEdit.tags || []);
      setIsPublic(snippetToEdit.isPublic);
    } else {
      setTitle('');
      setLanguage('javascript');
      setCode('');
      setDescription('');
      setSummary('');
      setTags([]);
      setIsPublic(false);
    }
    setAiGenerated(false);
    setError(null);
  }, [snippetToEdit, isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAutoAnalyze = async () => {
    if (!code.trim()) {
      setError('Please enter code before generating AI tags and summary.');
      return;
    }

    setAnalyzing(true);
    setAiGenerated(false);
    setError(null);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          code,
          language,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'AI analysis request failed.');
      }

      const data = await res.json();
      if (data.summary) setSummary(data.summary);
      if (data.tags && Array.isArray(data.tags)) {
        // Merge without duplicates
        const uniqueTags = Array.from(new Set([...tags, ...data.tags]));
        setTags(uniqueTags);
      }
      setAiGenerated(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI tags and summary.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().toLowerCase();
      if (!trimmed) return;
      const formatted = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
      if (!tags.includes(formatted)) {
        setTags([...tags, formatted]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a snippet title.');
      return;
    }
    if (title.length > 200) {
      setError('Title must be 200 characters or less.');
      return;
    }
    if (!code.trim()) {
      setError('Please provide code content.');
      return;
    }
    if (code.length > 50000) {
      setError('Code exceeds 50KB maximum size.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const isEdit = Boolean(snippetToEdit);
      const url = isEdit ? `/api/snippets/${snippetToEdit!.id}` : '/api/snippets';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          language,
          code,
          description: description.trim(),
          summary: summary.trim(),
          tags,
          isPublic,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save snippet.');
      }

      onSaveSuccess(data.snippet);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving snippet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="snippet-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl my-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="snippet-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {snippetToEdit ? 'Edit Snippet' : 'New Snippet'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {snippetToEdit ? 'Update snippet code and AI metadata.' : 'Store code snippet, notes, and auto-generate AI tags.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="snippet-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="snippet-title"
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Asynchronous Retry with Exponential Backoff"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition min-h-[40px]"
              />
            </div>
            <div>
              <label htmlFor="snippet-language" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Language
              </label>
              <select
                id="snippet-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition min-h-[40px]"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value} className="bg-white dark:bg-slate-900">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="snippet-code" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Code Content <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
                {aiGenerated && (
                  <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span>AI metadata ready</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleAutoAnalyze}
                  disabled={analyzing || !code.trim()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-md text-xs font-medium transition disabled:opacity-40"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating AI tags & summary...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Auto-Generate Tags & Summary</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <textarea
              id="snippet-code"
              rows={8}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="// Paste your code snippet here..."
              className="w-full p-3 font-mono text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-lg placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
            />
          </div>

          {/* AI 1-Sentence Summary */}
          <div>
            <label htmlFor="snippet-summary" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Summary (1-sentence)
            </label>
            <input
              id="snippet-summary"
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Plain-English summary describing what this snippet does..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition min-h-[40px]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tags (3-5 relevant keywords)
            </label>
            <div className="flex flex-wrap gap-1.5 items-center p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg min-h-[42px]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-md text-[11px] font-mono"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-600 dark:hover:text-rose-400 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? "Type tag & press enter (e.g. #react)" : "Add more tags..."}
                className="flex-1 min-w-[150px] bg-transparent border-none text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes / Markdown Documentation */}
          <div>
            <label htmlFor="snippet-description" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes / Markdown Documentation (Optional)
            </label>
            <textarea
              id="snippet-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical notes, usage instructions, or Markdown documentation..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <input
                id="is-public"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950"
              />
              <label htmlFor="is-public" className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer">
                Public snippet (visible in Explore tab)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || analyzing}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {!summary || tags.length === 0
                        ? 'Generating AI tags & saving...'
                        : 'Saving snippet...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{snippetToEdit ? 'Save Changes' : 'Create Snippet'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
