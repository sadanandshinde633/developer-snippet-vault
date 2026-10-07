import { NextRequest, NextResponse } from 'next/server';
import { analyzeCodeWithGemini } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, code, language } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Code content is required for analysis.' }, { status: 400 });
    }

    const result = await analyzeCodeWithGemini({
      title: typeof title === 'string' ? title.trim() : undefined,
      code,
      language: typeof language === 'string' ? language.trim() : 'javascript',
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('AI Analysis Route error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to analyze code snippet.' }, { status: 500 });
  }
}
