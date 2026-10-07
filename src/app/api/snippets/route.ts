import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { analyzeCodeWithGemini, formatTags } from '@/lib/gemini';
import { findSnippets, createSnippet } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const language = searchParams.get('language')?.toLowerCase().trim() || '';
    const tag = searchParams.get('tag')?.toLowerCase().trim() || '';
    const view = searchParams.get('view') || 'my'; // 'my' or 'explore'

    // Strict ownership requirement: if viewing personal vault, MUST filter by user.id
    if (view === 'my' && !user) {
      return NextResponse.json({ error: 'Unauthorized. Sign in to view your vault.' }, { status: 401 });
    }

    const snippets = await findSnippets({
      userId: view === 'my' && user ? user.id : undefined,
      isPublic: view === 'explore' || !user ? true : undefined,
      search,
      language,
      tag,
    });

    return NextResponse.json({ snippets });
  } catch (error) {
    console.error('Fetch snippets error:', error);
    return NextResponse.json({ error: 'Failed to retrieve snippets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to save snippets.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, code, language = 'javascript', isPublic = false } = body;
    let { tags, summary } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Snippet title is required.' }, { status: 400 });
    }

    if (title.length > 200) {
      return NextResponse.json({ error: 'Snippet title must be 200 characters or less.' }, { status: 400 });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Snippet code content is required.' }, { status: 400 });
    }

    if (code.length > 50000) {
      return NextResponse.json({ error: 'Snippet code exceeds maximum size (50KB limit).' }, { status: 400 });
    }

    // AI Auto-Tagging & Summarization integration if not explicitly provided
    if (!summary || !tags || !Array.isArray(tags) || tags.length === 0) {
      const aiResult = await analyzeCodeWithGemini({
        title: title.trim(),
        code,
        language,
      });
      if (!summary) summary = aiResult.summary;
      if (!tags || tags.length === 0) tags = aiResult.tags;
    }

    const cleanTags = formatTags(tags);

    const snippet = await createSnippet({
      userId: user.id,
      title: title.trim(),
      description: description ? description.trim() : null,
      code: code.trim(),
      language: language.toLowerCase().trim(),
      tags: cleanTags,
      summary: summary ? summary.trim() : null,
      isPublic: Boolean(isPublic),
    });

    return NextResponse.json({ snippet }, { status: 201 });
  } catch (error) {
    console.error('Create snippet error:', error);
    return NextResponse.json({ error: 'Failed to create snippet' }, { status: 500 });
  }
}
