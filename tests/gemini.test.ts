import { describe, it, expect } from 'vitest';
import { formatTags, generateHeuristicAnalysis, analyzeCodeWithGemini } from '../src/lib/gemini';

describe('Google Gemini AI & Code Analysis Engine', () => {
  it('should format tags correctly with hashtag prefix, lowercased, and bound between 3 and 5 tags', () => {
    const raw = ['React', 'NEXTJS', 'typescript', 'WebDev', 'hooks', 'frontend', 'extra'];
    const formatted = formatTags(raw);

    expect(formatted.length).toBeGreaterThanOrEqual(3);
    expect(formatted.length).toBeLessThanOrEqual(5);
    formatted.forEach((tag) => {
      expect(tag.startsWith('#')).toBe(true);
      expect(tag).toBe(tag.toLowerCase());
    });
  });

  it('should pad tags to minimum 3 if fewer tags provided', () => {
    const single = ['react'];
    const formatted = formatTags(single);
    expect(formatted.length).toBeGreaterThanOrEqual(3);
    expect(formatted[0]).toBe('#react');
  });

  it('should detect React, TypeScript, and Async in code heuristics', () => {
    const code = `
      import React, { useState, useEffect } from 'react';
      interface UserProps { id: string; }
      export async function fetchUser(props: UserProps) {
        const res = await fetch('/api/user/' + props.id);
        return res.json();
      }
    `;
    const result = generateHeuristicAnalysis(code, 'typescript');
    expect(result.tags).toContain('#typescript');
    expect(result.tags).toContain('#react');
    expect(result.tags).toContain('#async');
    expect(result.summary).toBeTruthy();
    expect(result.summary.length).toBeGreaterThan(15);
  });

  it('should analyze Python code accurately with heuristic engine', () => {
    const pyCode = `
      def process_data(records):
          return [r['name'] for r in records if r.get('active')]
    `;
    const result = generateHeuristicAnalysis(pyCode, 'python');
    expect(result.tags).toContain('#python');
    expect(result.summary.toLowerCase()).toContain('python');
  });

  it('should analyze Java code and detect Spring / OOP concepts', () => {
    const javaCode = `
      public class SnippetController {
        public static void main(String[] args) {
          System.out.println("Starting Spring Application");
        }
      }
    `;
    const result = generateHeuristicAnalysis(javaCode, 'java');
    expect(result.tags).toContain('#java');
    expect(result.summary.toLowerCase()).toContain('java');
  });

  it('should analyze SQL queries and generate relational database tags and summary', () => {
    const sqlCode = `
      SELECT users.id, users.email, COUNT(snippets.id) as total_snippets
      FROM users
      INNER JOIN snippets ON users.id = snippets.user_id
      GROUP BY users.id, users.email
      ORDER BY total_snippets DESC;
    `;
    const result = generateHeuristicAnalysis(sqlCode, 'sql');
    expect(result.tags).toContain('#sql');
    expect(result.tags).toContain('#database');
    expect(result.summary.toLowerCase()).toContain('sql');
  });

  it('should analyze HTML and CSS code templates', () => {
    const htmlCode = `
      <!DOCTYPE html>
      <html lang="en">
        <head><style>.card { display: flex; }</style></head>
        <body><div class="card"><h1>Snippet</h1></div></body>
      </html>
    `;
    const result = generateHeuristicAnalysis(htmlCode, 'html');
    expect(result.tags).toContain('#html');
    expect(result.summary.toLowerCase()).toContain('html');
  });

  it('should gracefully handle empty code without crashing', () => {
    const result = generateHeuristicAnalysis('', 'javascript');
    expect(result.tags.length).toBeGreaterThanOrEqual(3);
    expect(result.summary).toBeDefined();
  });

  it('should safely analyze large code snippets (>4000 characters)', async () => {
    const largeCode = 'const x = 1;\n'.repeat(1000);
    const result = await analyzeCodeWithGemini(largeCode, 'javascript');
    expect(result).toBeDefined();
    expect(result.tags.length).toBeGreaterThanOrEqual(3);
  });

  it('should gracefully fallback when GEMINI_API_KEY is not configured without throwing exceptions', async () => {
    const sampleCode = `
      const express = require('express');
      const app = express();
      app.get('/health', (req, res) => res.json({ status: 'ok' }));
    `;
    const analysis = await analyzeCodeWithGemini(sampleCode, 'javascript');
    expect(analysis).toBeDefined();
    expect(analysis.tags.length).toBeGreaterThanOrEqual(3);
    expect(analysis.summary).toBeDefined();
  });
});
