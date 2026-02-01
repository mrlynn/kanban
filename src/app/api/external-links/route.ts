import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ExternalLink } from '@/types/integrations';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * GET /api/external-links
 * 
 * List external links, optionally filtered by taskId or boardId
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireScope(request, 'tasks:read');

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const boardId = searchParams.get('boardId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const db = await getDb();

    const query: Record<string, unknown> = { tenantId: context.tenantId };
    if (taskId) query.taskId = taskId;
    if (boardId) query.boardId = boardId;
    if (type) query.type = type;

    const links = await db
      .collection<ExternalLink>('external_links')
      .find(query)
      .sort({ syncedAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(links);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching external links:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}

/**
 * POST /api/external-links
 * 
 * Manually create an external link (e.g., arbitrary URL)
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireScope(request, 'tasks:write');

    const body = await request.json();
    const { taskId, boardId, type, url, title, externalId } = body;

    if (!taskId || !url || !title) {
      return NextResponse.json(
        { error: 'taskId, url, and title are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify task exists
    const task = await db.collection('tasks').findOne({
      id: taskId,
      tenantId: context.tenantId,
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const link: ExternalLink = {
      id: generateId('link'),
      tenantId: context.tenantId,
      taskId,
      boardId: boardId || task.boardId,
      type: type || 'url',
      externalId: externalId || url,
      url,
      title,
      status: 'unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
      syncedAt: new Date(),
    };

    await db.collection<ExternalLink>('external_links').insertOne(link);

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating external link:', error);
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}

/**
 * DELETE /api/external-links?id=xxx
 * 
 * Delete an external link
 */
export async function DELETE(request: NextRequest) {
  try {
    const context = await requireScope(request, 'tasks:write');

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('id');

    if (!linkId) {
      return NextResponse.json({ error: 'Link id is required' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection<ExternalLink>('external_links').deleteOne({
      id: linkId,
      tenantId: context.tenantId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deleting external link:', error);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
