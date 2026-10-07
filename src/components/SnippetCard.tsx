'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Edit3, Trash2, Globe, Lock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-markdown';
import { SnippetDTO } from '@/lib/types';
import MarkdownView from './MarkdownView';

interface SnippetCardProps {
  snippet: SnippetDTO;
  isOwner: boolean;
  onEdit: (snippet: SnippetDTO) => void;
  onDelete: (snippetId: string, snippetTitle: string) => void;
  onSelectTag?: (tag: string) => void;
}

export default function SnippetCard({
  snippet,
  isOwner,
  onEdit,
  onDelete,
  onSelectTag,
}: SnippetCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      try {
        Prism.highlightElement(codeRef.current);
      } catch (err) {
        console.warn('Prism highlighting notice:', err);
      }
    }
  }, [snippet.code, snippet.language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const lineCount = snippet.code.split('\n').length;
  const isLong = lineCount > 12;

  return (
    <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md flex flex-col">
      {/* Card Header */}
      <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
              <span className="font-mono text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-md">
                {snippet.language}
              </span>
              <span className="flex items-center space-x-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {snippet.isPublic ? (
                  <>
                    <Globe className="w-3 h-3 text-slate-400" />
                    <span>public</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>private</span>
                  </>
                )}
              </span>
              {snippet.user?.name && (
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate">
                  @{snippet.user.name.toLowerCase().replace(/\s+/g, '')}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate tracking-tight">
              {snippet.title}
            </h3>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              onClick={handleCopy}
              aria-label="Copy snippet code"
              title="Copy snippet code"
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {copied ? (
                <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-[11px] font-mono space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copied</span>
                </span>
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {isOwner && (
              <>
                <button
                  onClick={() => onEdit(snippet)}
                  aria-label="Edit snippet"
                  title="Edit snippet"
                  className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(snippet.id, snippet.title)}
                  aria-label="Delete snippet"
                  title="Delete snippet"
                  className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* AI Summary as Clean Developer Metadata Note */}
        {snippet.summary && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <span className="font-sans">{snippet.summary}</span>
          </div>
        )}

        {/* Markdown Documentation / Notes if provided */}
        {snippet.description && (
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 border-l-2 border-indigo-200 dark:border-indigo-900 pl-2.5 py-0.5">
            <MarkdownView content={snippet.description} />
          </div>
        )}
      </div>

      {/* Code Editor Box */}
      <div className="relative bg-slate-950 font-mono text-xs flex-1">
        <pre
          className={`p-4 overflow-x-auto text-slate-100 ${
            isLong && !isExpanded ? 'max-h-52 overflow-y-hidden' : ''
          }`}
        >
          <code ref={codeRef} className={`language-${snippet.language}`}>{snippet.code}</code>
        </pre>

        {isLong && !isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand / Collapse toggle for long snippets */}
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-1.5 bg-slate-950 border-t border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-mono flex items-center justify-center space-x-1 transition"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>collapse</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>expand ({lineCount} lines)</span>
            </>
          )}
        </button>
      )}

      {/* Footer Tags */}
      {snippet.tags && snippet.tags.length > 0 && (
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 items-center">
          {snippet.tags.map((t) => (
            <button
              key={t}
              onClick={() => onSelectTag?.(t)}
              className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
