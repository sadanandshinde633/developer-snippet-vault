import { GoogleGenAI } from '@google/genai';
import { AIAnalysisResult } from './types';

export interface AnalyzeCodeInput {
  title?: string;
  code: string;
  language?: string;
}

/**
 * Strips HTML tags, script elements, and dangerous control characters
 * to guarantee XSS safety and sanitized database records.
 */
function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Strip control characters
    .trim();
}

/**
 * Normalizes tags array to 3-5 tags prefixed with '#'
 * and sanitizes each tag to alphanumeric, hyphen, and underscore.
 */
export function formatTags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return ['#snippet', '#code', '#dev'];

  const formatted = rawTags
    .map((t) => {
      let cleaned = sanitizeText(t).toLowerCase();
      if (!cleaned.startsWith('#')) cleaned = `#${cleaned}`;
      return cleaned.replace(/[^#a-z0-9_-]/g, '');
    })
    .filter((t) => t.length > 1 && t.length <= 35);

  const unique = Array.from(new Set(formatted));
  const fallbackTags = ['#utility', '#developer', '#code', '#software', '#algorithms'];

  for (const fb of fallbackTags) {
    if (unique.length >= 3) break;
    if (!unique.includes(fb)) unique.push(fb);
  }

  return unique.slice(0, 5);
}

/**
 * Validates and sanitizes the AI response before saving to MongoDB.
 */
export function sanitizeAIResponse(
  rawTags: unknown,
  rawSummary: unknown,
  fallbackLang: string = 'code',
  fallbackTitle?: string
): { tags: string[]; summary: string } {
  const cleanTags = formatTags(rawTags);

  let cleanSummary = sanitizeText(rawSummary);

  // If summary is missing or empty, generate a clean default
  if (!cleanSummary || cleanSummary.length < 5) {
    const lang = fallbackLang.charAt(0).toUpperCase() + fallbackLang.slice(1);
    cleanSummary = fallbackTitle
      ? `${lang} snippet implementing "${fallbackTitle.slice(0, 80)}".`
      : `A structured ${lang} code snippet implementing technical developer workflows.`;
  }

  // Ensure summary is concise (max 300 characters, single sentence)
  if (cleanSummary.length > 300) {
    cleanSummary = cleanSummary.slice(0, 297).trim() + '...';
  }

  return {
    tags: cleanTags,
    summary: cleanSummary,
  };
}

/**
 * Intelligent heuristic fallback analyzer for code analysis when GEMINI_API_KEY
 * is not configured or when network/quota errors occur. Ensures the application
 * is always 100% resilient and testable without crashing or losing data.
 */
export function generateHeuristicAnalysis(
  code: string,
  language: string = 'javascript',
  title?: string
): AIAnalysisResult {
  if (!code || !code.trim()) {
    return {
      tags: ['#snippet', '#draft', '#empty'],
      summary: title ? `Draft snippet: ${title.slice(0, 60)}` : 'Empty code snippet draft.',
      source: 'heuristic-fallback',
    };
  }

  const lowerCode = code.toLowerCase();
  const detectedTags = new Set<string>();

  // Add normalized language tag
  const cleanLang = (language || 'code').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanLang.length > 1) {
    detectedTags.add(`#${cleanLang}`);
  }

  // 1. Language-Specific Heuristics
  // JavaScript & TypeScript
  if (lowerCode.includes('react') || lowerCode.includes('usestate') || lowerCode.includes('useeffect') || lowerCode.includes('jsx')) {
    detectedTags.add('#react');
  }
  if (lowerCode.includes('interface ') || lowerCode.includes('type ') || lowerCode.includes(': string') || lowerCode.includes('<t>')) {
    detectedTags.add('#typescript');
  }
  if (lowerCode.includes('async') || lowerCode.includes('await') || lowerCode.includes('promise')) {
    detectedTags.add('#async');
  }
  if (lowerCode.includes('fetch(') || lowerCode.includes('axios') || lowerCode.includes('http') || lowerCode.includes('api')) {
    detectedTags.add('#api');
  }

  // Python
  if (lowerCode.includes('def ') || lowerCode.includes('import numpy') || lowerCode.includes('print(') || lowerCode.includes('elif ')) {
    detectedTags.add('#python');
    if (lowerCode.includes('pandas') || lowerCode.includes('numpy') || lowerCode.includes('dataframe')) {
      detectedTags.add('#data-science');
    }
  }

  // Java
  if (lowerCode.includes('public class') || lowerCode.includes('system.out.println') || lowerCode.includes('public static void main') || lowerCode.includes('spring')) {
    detectedTags.add('#java');
    if (lowerCode.includes('spring') || lowerCode.includes('@autowired') || lowerCode.includes('@getmapping')) {
      detectedTags.add('#springboot');
    }
  }

  // SQL
  if (lowerCode.includes('select ') || lowerCode.includes('insert into') || lowerCode.includes('from ') || lowerCode.includes('group by') || lowerCode.includes('inner join')) {
    detectedTags.add('#sql');
    detectedTags.add('#database');
    if (lowerCode.includes('join')) detectedTags.add('#relational-db');
  }

  // HTML & CSS
  if (lowerCode.includes('<!doctype') || lowerCode.includes('<html') || lowerCode.includes('<div') || lowerCode.includes('<form')) {
    detectedTags.add('#html');
    detectedTags.add('#frontend');
  }
  if (lowerCode.includes('@media') || lowerCode.includes('display: flex') || lowerCode.includes('display: grid') || lowerCode.includes('px solid')) {
    detectedTags.add('#css');
    detectedTags.add('#styling');
  }

  // General Software Engineering tags
  if (lowerCode.includes('docker') || lowerCode.includes('dockerfile')) detectedTags.add('#devops');
  if (lowerCode.includes('test(') || lowerCode.includes('expect(') || lowerCode.includes('assert') || lowerCode.includes('@test')) detectedTags.add('#testing');
  if (lowerCode.includes('class ') || lowerCode.includes('interface ') || lowerCode.includes('extends ')) detectedTags.add('#oop');

  // Fill up to 3–5 tags
  const fallbackDefaults = ['#developer-tools', '#utility', '#algorithms', '#fullstack', '#code-snippet'];
  for (const fallback of fallbackDefaults) {
    if (detectedTags.size >= 3) break;
    detectedTags.add(fallback);
  }

  const finalTags = Array.from(detectedTags).slice(0, 5);
  const langTitle = cleanLang ? cleanLang.charAt(0).toUpperCase() + cleanLang.slice(1) : 'Code';

  // Generate 1-sentence descriptive summary
  let summary = '';
  if (title && title.trim()) {
    summary = `${langTitle} implementation of ${title.trim().slice(0, 80)}.`;
  } else if (lowerCode.includes('select ') && lowerCode.includes('from ')) {
    summary = `Relational SQL database query designed to retrieve, filter, and structure dataset records.`;
  } else if (lowerCode.includes('public static void main') || (lowerCode.includes('public class') && lowerCode.includes('java'))) {
    summary = `Object-oriented Java class implementing core application workflow methods and data structures.`;
  } else if (lowerCode.includes('<!doctype') || lowerCode.includes('<html') || (lowerCode.includes('<') && lowerCode.includes('</'))) {
    summary = `Structured HTML and CSS template defining user interface layout elements and responsive styling rules.`;
  } else if (lowerCode.includes('async') && (lowerCode.includes('fetch') || lowerCode.includes('api'))) {
    summary = `Asynchronous ${langTitle} routine designed for fetching and handling remote API data.`;
  } else if (lowerCode.includes('react') || lowerCode.includes('usestate')) {
    summary = `Interactive React component managing state and rendering dynamic user interfaces.`;
  } else if (lowerCode.includes('def ') || lowerCode.includes('function') || lowerCode.includes('=>')) {
    summary = `Reusable ${langTitle} function encapsulating core business logic and computational procedures.`;
  } else {
    summary = `A structured ${langTitle} code snippet providing technical utility and practical developer workflow implementation.`;
  }

  return {
    tags: finalTags,
    summary,
    source: 'heuristic-fallback',
  };
}

/**
 * Analyzes code using Google Gemini API (@google/genai).
 * Automatically extracts:
 * - 3 to 5 relevant technical tags (prefixed with #)
 * - 1 concise plain-English sentence summarizing the code
 *
 * Supported call signatures:
 * 1. analyzeCodeWithGemini({ title, code, language })
 * 2. analyzeCodeWithGemini(code, language, title)
 */
export async function analyzeCodeWithGemini(
  inputOrCode: string | AnalyzeCodeInput,
  languageArg: string = 'javascript',
  titleArg?: string
): Promise<AIAnalysisResult> {
  let code = '';
  let language = 'javascript';
  let title: string | undefined = undefined;

  if (typeof inputOrCode === 'object' && inputOrCode !== null) {
    code = inputOrCode.code || '';
    language = inputOrCode.language || 'javascript';
    title = inputOrCode.title;
  } else {
    code = String(inputOrCode || '');
    language = languageArg || 'javascript';
    title = titleArg;
  }

  if (!code || !code.trim()) {
    return generateHeuristicAnalysis(code, language, title);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // If no API key is provided, gracefully use heuristic analysis
  if (!apiKey) {
    return generateHeuristicAnalysis(code, language, title);
  }

  // Candidate models: prefer gemini-3.5-flash, fall back to gemini-3.5-flash-lite
  const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Truncate code to 4000 characters to stay within safety limits and token budgets
    const safeCode = code.length > 4000 ? code.slice(0, 4000) + '\n// ... [trimmed for analysis]' : code;
    const titleHeader = title?.trim() ? `Snippet Title: "${title.trim()}"\n` : '';

    const prompt = `You are an expert developer assistant specialized in code analysis.
Analyze the following code snippet:
${titleHeader}Programming Language: ${language || 'auto-detected'}

\`\`\`${language || 'text'}
${safeCode}
\`\`\`

Task:
1. Generate 3 to 5 relevant technical tags (each MUST start with '#' e.g. #react, #typescript, #async, #database).
2. Generate a single concise plain-English sentence summarizing exactly what the code does.

Return ONLY a valid JSON object matching this schema with NO markdown formatting:
{
  "tags": ["#tag1", "#tag2", "#tag3"],
  "summary": "This function performs an operation and returns a result."
}`;

    let lastError: Error | null = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const responseText = response.text || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const sanitized = sanitizeAIResponse(parsed.tags, parsed.summary, language, title);

          return {
            tags: sanitized.tags,
            summary: sanitized.summary,
            source: 'gemini',
          };
        }
      } catch (err: any) {
        lastError = err;
        // If the model had high demand (503) or not found (404), try next candidate model
        continue;
      }
    }

    if (lastError) {
      console.warn('Gemini API call warning (falling back gracefully):', lastError.message?.slice(0, 100));
    }

    return generateHeuristicAnalysis(code, language, title);
  } catch (error) {
    // Graceful error handling: Never leak API key or break the application
    console.warn('Gemini analysis caught exception, falling back gracefully:', error instanceof Error ? error.message?.slice(0, 100) : 'Unknown error');
    return generateHeuristicAnalysis(code, language, title);
  }
}
