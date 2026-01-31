import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ChatMessage } from '@/types/chat';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Chat API
 * 
 * GET /api/chat - Fetch chat messages
 *   Query params:
 *   - boardId: Filter by board (optional, defaults to all for tenant)
 *   - since: ISO timestamp for polling
 *   - limit: Max messages (default 50)
 *   - pendingOnly: Only get messages awaiting bot response
 * 
 * POST /api/chat - Send a message
 */

export async function GET(request: NextRequest) {
  try {
    const context = await requireScope(request, 'chat:read');
    
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const pendingOnly = searchParams.get('pendingOnly') === 'true';

    const db = await getDb();
    
    // Always filter by tenant
    const query: Record<string, unknown> = { tenantId: context.tenantId };
    
    if (boardId) {
      query.boardId = boardId;
    }
    
    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }
    
    if (pendingOnly) {
      query.author = 'mike';
      query.status = { $ne: 'complete' };
    }

    const messages = await db
      .collection<ChatMessage>('chats')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Return in chronological order for display
    messages.reverse();

    return NextResponse.json({
      messages,
      meta: {
        count: messages.length,
        since: since || null,
        latestTimestamp: messages.length > 0 
          ? messages[messages.length - 1].createdAt 
          : null,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireScope(request, 'chat:write');
    
    const { content, boardId, taskId, taskTitle, replyTo } = await request.json();
    
    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // Detect actor
    const actor = context.type === 'apiKey' ? 'api' : 'mike';
    
    const message: ChatMessage = {
      id: generateId('msg'),
      tenantId: context.tenantId,
      boardId: boardId || undefined, // undefined = global chat
      author: actor,
      content: content.trim(),
      taskId,
      taskTitle,
      replyTo,
      status: actor === 'mike' ? 'pending' : 'complete',
      createdAt: new Date(),
    };
    
    await db.collection<ChatMessage>('chats').insertOne(message);

    // Check for task creation intent from user messages
    if (actor === 'mike') {
      try {
        const { handleChatMessage } = await import('@/lib/moltbot/features/task-creator');
        const result = await handleChatMessage(
          context.tenantId,
          message.id,
          content.trim(),
          boardId || 'general',
          actor
        );
        
        if (result.taskCreated) {
          console.log(`[chat] Task created from message ${message.id}`);
        }
      } catch (error) {
        // Don't fail the message if task detection fails
        console.error('[chat] Task detection error:', error);
      }
    }
    
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating chat message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
