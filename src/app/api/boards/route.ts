import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Board, Column } from '@/types/kanban';
import { requireAuth, requireScope, AuthError } from '@/lib/tenant-auth';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// GET all boards for tenant
export async function GET(request: NextRequest) {
  try {
    const context = await requireScope(request, 'boards:read');
    
    const db = await getDb();
    const boards = await db
      .collection<Board>('boards')
      .find({ tenantId: context.tenantId })
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(boards);
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
