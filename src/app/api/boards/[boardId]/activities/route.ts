import { NextRequest, NextResponse } from 'next/server';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import { getBoardActivities } from '@/lib/activity';

// GET activities for a board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const context = await requireScope(request, 'tasks:read');
    const { boardId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    
    const activities = await getBoardActivities(context.tenantId, boardId, limit);
    
    return NextResponse.json(activities);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching board activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
