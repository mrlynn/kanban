import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Board } from '@/types/kanban';
import { Project } from '@/types/integrations';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

const PROJECT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

/**
 * GET /api/projects
 * 
 * List all projects for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireScope(request, 'boards:read');

    const db = await getDb();

    const projects = await db
      .collection<Project>('projects')
      .find({ tenantId: context.tenantId })
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with board names
    const boardIds = Array.from(new Set(projects.map((p) => p.boardId)));
    const boards = await db
      .collection<Board>('boards')
      .find({ id: { $in: boardIds }, tenantId: context.tenantId })
      .toArray();

    const boardMap = new Map(boards.map((b) => [b.id, b]));

    const enriched = projects.map((p) => ({
      ...p,
      board: boardMap.get(p.boardId) ? {
        id: boardMap.get(p.boardId)!.id,
        name: boardMap.get(p.boardId)!.name,
      } : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

/**
 * POST /api/projects
 * 
 * Create a new project with GitHub integration
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireScope(request, 'boards:write');

    const body = await request.json();
    const { name, boardId, github } = body;

    if (!name || !boardId) {
      return NextResponse.json({ error: 'Name and boardId are required' }, { status: 400 });
    }

    const db = await getDb();

    // Verify board exists and belongs to tenant
    const board = await db.collection<Board>('boards').findOne({
      id: boardId,
      tenantId: context.tenantId,
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Check if project already exists for this board
    const existingProject = await db.collection<Project>('projects').findOne({
      boardId,
      tenantId: context.tenantId,
    });

    if (existingProject) {
      return NextResponse.json(
        { error: 'A project already exists for this board' },
        { status: 400 }
      );
    }

    // Pick a random color
    const colorIndex = Math.floor(Math.random() * PROJECT_COLORS.length);

    const project: Project = {
      id: generateId('proj'),
      tenantId: context.tenantId,
      boardId,
      name,
      color: PROJECT_COLORS[colorIndex],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add GitHub integration if provided
    if (github?.owner && github?.repo) {
      project.github = {
        owner: github.owner,
        repo: github.repo,
        syncEnabled: github.syncEnabled ?? true,
        autoLinkPRs: github.autoLinkPRs ?? true,
        autoMoveTasks: github.autoMoveTasks ?? true,
        createTasksFromIssues: github.createTasksFromIssues ?? false,
        webhookSecret: github.webhookSecret || crypto.randomBytes(32).toString('hex'),
      };
    }

    await db.collection<Project>('projects').insertOne(project);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
