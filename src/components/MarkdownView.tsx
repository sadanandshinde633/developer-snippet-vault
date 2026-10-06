'use client';

import React, { useMemo } from 'react';
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/sanitize';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export default function MarkdownView({ content, className = '' }: MarkdownViewProps) {
  const html = useMemo(() => {
    if (!content) return '';
    try {
      const raw = marked.parse(content, { async: false, breaks: true }) as string;
      return sanitizeHtml(raw);
    } catch {
      return '';
    }
  }, [content]);

  return (
    <div
      className={`prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed font-sans ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
