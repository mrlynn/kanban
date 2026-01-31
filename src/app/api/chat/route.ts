import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ChatMessage } from '@/types/chat';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { detectActor } from '@/lib/activity';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Chat API
 * 
 * GET /api/chat - Fetch chat messages
 *   Query params:
 *   - boardId: Filter by board (optional, defaults to all)
 *   - since: ISO timestamp for polling
 *   - limit: Max messages (default 50)
 *   - pendingOnly: Only get messages awaiting bot response
 * 
 * POST /api/chat - Send a message
 */

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const pendingOnly = searchParams.get('pendingOnly') === 'true';

    const db = await getDb();
    
    const query: Record<string, unknown> = {};
    
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
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const { content, boardId, taskId, taskTitle, replyTo } = await request.json();
    
    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // Detect actor
    const apiKey = request.headers.get('x-api-key');
    const actor = detectActor(apiKey);
    
    const message: ChatMessage = {
      id: generateId('msg'),
      boardId: boardId || 'general',
      author: actor,
      content: content.trim(),
      taskId,
      taskTitle,
      replyTo,
      status: actor === 'mike' ? 'pending' : 'complete',
      createdAt: new Date(),
    };
    
    await db.collection<ChatMessage>('chats').insertOne(message);
    
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error creating chat message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
