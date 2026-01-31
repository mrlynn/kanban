import { NextRequest, NextResponse } from 'next/server';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import { getTaskActivities } from '@/lib/activity';

// GET activities for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const context = await requireScope(request, 'tasks:read');
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    const activities = await getTaskActivities(context.tenantId, taskId, limit);
    
    return NextResponse.json(activities);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
