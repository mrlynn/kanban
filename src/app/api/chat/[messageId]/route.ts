import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ChatMessage } from '@/types/chat';
import { requireScope, AuthError } from '@/lib/tenant-auth';

/**
 * Chat Message API
 * 
 * PATCH /api/chat/:messageId - Update message status
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const context = await requireScope(request, 'chat:write');
    const { messageId } = await params;
    const updates = await request.json();
    
    const db = await getDb();
    
    const allowedUpdates: Partial<ChatMessage> = {};
    
    if (updates.status) {
      allowedUpdates.status = updates.status;
    }
    
    allowedUpdates.updatedAt = new Date();
    
    const result = await db
      .collection<ChatMessage>('chats')
      .findOneAndUpdate(
        { id: messageId, tenantId: context.tenantId },
        { $set: allowedUpdates },
        { returnDocument: 'after' }
      );
    
    if (!result) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}
