import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { analyzeCodeWithGemini, formatTags } from '@/lib/gemini';
import { findSnippetById, updateSnippet, deleteSnippet } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    const { id } = params;

    const snippet = await findSnippetById(id, user?.id);

    if (!snippet) {
      return NextResponse.json(
        { error: 'Snippet not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ snippet });
  } catch (error) {
    console.error('Fetch single snippet error:', error);
    return NextResponse.json({ error: 'Failed to retrieve snippet.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Sign in to edit.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { title, description, code, language, isPublic, autoAnalyze } = body;
    let { tags, summary } = body;

    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json({ error: 'Snippet title cannot be empty.' }, { status: 400 });
    }

    if (code !== undefined && (!code || !code.trim())) {
      return NextResponse.json({ error: 'Snippet code cannot be empty.' }, { status: 400 });
    }

    // Optional re-analysis if requested
    if (autoAnalyze && code) {
      const aiResult = await analyzeCodeWithGemini(code, language || 'javascript');
      tags = aiResult.tags;
      summary = aiResult.summary;
    }

    const cleanTags = tags !== undefined ? formatTags(tags) : undefined;

    // Strict ownership verification: only the owner can update
    const updatedSnippet = await updateSnippet(id, user.id, {
      title,
      description,
      code,
      language,
      tags: cleanTags,
      summary,
      isPublic,
    });

    if (!updatedSnippet) {
      // Either doesn't exist or belongs to another user (IDOR protection)
      return NextResponse.json(
        { error: 'Snippet not found or you do not have permission to modify it.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ snippet: updatedSnippet });
  } catch (error) {
    console.error('Update snippet error:', error);
    return NextResponse.json({ error: 'Failed to update snippet.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;

    // Strict ownership verification: only the owner can delete
    const success = await deleteSnippet(id, user.id);

    if (!success) {
      // Either doesn't exist or belongs to another user (IDOR protection)
      return NextResponse.json(
        { error: 'Snippet not found or you do not have permission to delete it.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ message: 'Snippet deleted successfully.' });
  } catch (error) {
    console.error('Delete snippet error:', error);
    return NextResponse.json({ error: 'Failed to delete snippet.' }, { status: 500 });
  }
}
