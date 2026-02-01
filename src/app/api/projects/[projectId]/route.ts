import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Project } from '@/types/integrations';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import crypto from 'crypto';

/**
 * GET /api/projects/[projectId]
 * 
 * Get a single project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const context = await requireScope(request, 'boards:read');
    const { projectId } = await params;

    const db = await getDb();

    const project = await db.collection<Project>('projects').findOne({
      id: projectId,
      tenantId: context.tenantId,
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[projectId]
 * 
 * Update a project (e.g., GitHub settings)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const context = await requireScope(request, 'boards:write');
    const { projectId } = await params;

    const body = await request.json();
    const { name, github } = body;

    const db = await getDb();

    const project = await db.collection<Project>('projects').findOne({
      id: projectId,
      tenantId: context.tenantId,
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updates: Partial<Project> = { updatedAt: new Date() };

    if (name) {
      updates.name = name;
    }

    if (github !== undefined) {
      if (github === null) {
        // Remove GitHub integration
        updates.github = undefined;
      } else {
        // Update GitHub integration
        updates.github = {
          ...project.github,
          ...github,
          // Generate webhook secret if not provided and enabling
          webhookSecret: github.webhookSecret || 
            project.github?.webhookSecret || 
            crypto.randomBytes(32).toString('hex'),
        };
      }
    }

    await db.collection<Project>('projects').updateOne(
      { id: projectId, tenantId: context.tenantId },
      { $set: updates }
    );

    const updated = await db.collection<Project>('projects').findOne({
      id: projectId,
      tenantId: context.tenantId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[projectId]
 * 
 * Delete a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const context = await requireScope(request, 'boards:write');
    const { projectId } = await params;

    const db = await getDb();

    const result = await db.collection<Project>('projects').deleteOne({
      id: projectId,
      tenantId: context.tenantId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Also delete external links for this project
    await db.collection('external_links').deleteMany({
      tenantId: context.tenantId,
      boardId: (await db.collection<Project>('projects').findOne({ id: projectId }))?.boardId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
