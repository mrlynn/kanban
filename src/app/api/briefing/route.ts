import { NextRequest, NextResponse } from 'next/server';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import { generateBriefing, formatBriefingMarkdown } from '@/lib/briefing/generator';

/**
 * GET /api/briefing
 * 
 * Generate a briefing for the current tenant
 * 
 * Query params:
 * - boardId: Optional board to scope the briefing
 * - type: 'daily' | 'weekly' (default: 'daily')
 * - format: 'json' | 'markdown' (default: 'json')
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireScope(request, 'tasks:read');

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId') || undefined;
    const type = (searchParams.get('type') as 'daily' | 'weekly') || 'daily';
    const format = searchParams.get('format') || 'json';

    const briefing = await generateBriefing({
      tenantId: context.tenantId,
      boardId,
      type,
      includeGitHub: true,
    });

    if (format === 'markdown') {
      const markdown = formatBriefingMarkdown(briefing);
      return new NextResponse(markdown, {
        headers: { 'Content-Type': 'text/markdown' },
      });
    }

    return NextResponse.json(briefing);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error generating briefing:', error);
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
  }
}

/**
 * POST /api/briefing
 * 
 * Generate and post a briefing to a channel
 * 
 * Body:
 * - boardId: Optional board to scope
 * - type: 'daily' | 'weekly'
 * - channel: 'moltboard' | 'signal' | 'telegram' (future)
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireScope(request, 'tasks:read');

    const body = await request.json();
    const { boardId, type = 'daily' } = body;

    const briefing = await generateBriefing({
      tenantId: context.tenantId,
      boardId,
      type,
      includeGitHub: true,
    });

    const markdown = formatBriefingMarkdown(briefing);

    // For now, just return the briefing - posting to channels handled by caller
    return NextResponse.json({
      success: true,
      briefing,
      markdown,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error generating briefing:', error);
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
  }
}
