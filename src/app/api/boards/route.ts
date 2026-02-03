import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Board, Column } from '@/types/kanban';
import { requireAuth, requireScope, AuthError } from '@/lib/tenant-auth';
import { BoardMember } from '@/types/team';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// GET all boards for tenant + boards user is a member of
export async function GET(request: NextRequest) {
  try {
    const context = await requireScope(request, 'boards:read');
    
    const db = await getDb();
    
    // Get boards from user's own tenant
    const ownedBoards = await db
      .collection<Board>('boards')
      .find({ tenantId: context.tenantId })
      .sort({ createdAt: -1 })
      .toArray();
    
    // Get boards user is a member of (shared with them)
    let sharedBoards: Board[] = [];
    if (context.userId) {
      // Find all board memberships for this user
      const memberships = await db
        .collection<BoardMember>('boardMembers')
        .find({ userId: context.userId })
        .toArray();
      
      if (memberships.length > 0) {
        const sharedBoardIds = memberships.map(m => m.boardId);
        
        // Get those boards (excluding ones already in ownedBoards)
        const ownedBoardIds = new Set(ownedBoards.map(b => b.id));
        const newBoardIds = sharedBoardIds.filter(id => !ownedBoardIds.has(id));
        
        if (newBoardIds.length > 0) {
          sharedBoards = await db
            .collection<Board>('boards')
            .find({ id: { $in: newBoardIds } })
            .sort({ createdAt: -1 })
            .toArray();
        }
      }
    }
    
    // Combine owned and shared boards
    // Mark shared boards so UI can distinguish them if needed
    const allBoards = [
      ...ownedBoards.map(b => ({ ...b, isOwned: true })),
      ...sharedBoards.map(b => ({ ...b, isOwned: false, isShared: true })),
    ];
    
    return NextResponse.json(allBoards);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching boards:', error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

// POST create new board
export async function POST(request: NextRequest) {
  try {
    const context = await requireScope(request, 'boards:write');
    
    const { name, description } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Create default columns
    const boardId = generateId('board');
    const defaultColumns: Column[] = [
      { id: generateId('col'), title: 'To Do', boardId, order: 0, color: 'default' },
      { id: generateId('col'), title: 'In Progress', boardId, order: 1, color: 'info' },
      { id: generateId('col'), title: 'Review', boardId, order: 2, color: 'warning' },
      { id: generateId('col'), title: 'Done', boardId, order: 3, color: 'success' },
    ];
    
    const board: Board = {
      id: boardId,
      tenantId: context.tenantId,
      name,
      description,
      columns: defaultColumns,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.collection<Board>('boards').insertOne(board);
    
    // Update tenant usage
    await db.collection('tenants').updateOne(
      { id: context.tenantId },
      { $inc: { 'usage.boards': 1 } }
    );
    
    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating board:', error);
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
