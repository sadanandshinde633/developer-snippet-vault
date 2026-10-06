'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  asLink?: boolean;
}

export default function Logo({
  iconOnly = false,
  size = 'md',
  className = '',
  asLink = true,
}: LogoProps) {
  const iconDimensions = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }[size];

  const content = (
    <div className={`inline-flex items-center space-x-2.5 select-none ${className}`}>
      {/* Clean Developer Symbol: Code brackets + Vault layer */}
      <div
        className={`${iconDimensions} rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-sm flex-shrink-0`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4/6 h-4/6"
        >
          {/* Outer vault/terminal boundary */}
          <rect x="3" y="3" width="18" height="18" rx="3.5" ry="3.5" strokeOpacity="0.4" />
          {/* Code brackets and prompt */}
          <path d="M8 9.5L5.5 12L8 14.5" />
          <path d="M16 9.5L18.5 12L16 14.5" />
          <line x1="10.5" y1="15" x2="13.5" y2="9" />
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex items-baseline space-x-1">
          <span className={`font-bold tracking-tight text-slate-900 dark:text-slate-100 ${textSize}`}>
            Snippet<span className="text-indigo-600 dark:text-indigo-400">Vault</span>
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 ml-1">
            v1.0
          </span>
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link href="/" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md">
        {content}
      </Link>
    );
  }

  return content;
}
