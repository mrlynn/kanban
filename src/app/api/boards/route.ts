import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Board, Column } from '@/types/kanban';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// GET all boards
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const db = await getDb();
    const boards = await db
      .collection<Board>('boards')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

// POST create new board
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  try {
    const { name, description } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Create default columns
    const defaultColumns: Column[] = [
      { id: generateId('col'), title: 'To Do', boardId: '', order: 0, color: 'default' },
      { id: generateId('col'), title: 'In Progress', boardId: '', order: 1, color: 'info' },
      { id: generateId('col'), title: 'Review', boardId: '', order: 2, color: 'warning' },
      { id: generateId('col'), title: 'Done', boardId: '', order: 3, color: 'success' },
    ];
    
    const board: Board = {
      id: generateId('board'),
      name,
      description,
      columns: defaultColumns.map(col => ({ ...col, boardId: '' })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Set boardId on columns
    board.columns = board.columns.map(col => ({ ...col, boardId: board.id }));
    
    await db.collection<Board>('boards').insertOne(board);
    
    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error('Error creating board:', error);
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
