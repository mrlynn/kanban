import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { AutomationRule } from '@/types/integrations';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * GET /api/automations
 * 
 * List automation rules
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireScope(request, 'boards:read');

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const trigger = searchParams.get('trigger');
    const includeDisabled = searchParams.get('includeDisabled') === 'true';

    const db = await getDb();

    const query: Record<string, unknown> = { tenantId: context.tenantId };
    if (projectId) query.projectId = projectId;
    if (trigger) query.trigger = trigger;
    if (!includeDisabled) query.enabled = true;

    const automations = await db
      .collection<AutomationRule>('automations')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(automations);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching automations:', error);
    return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
  }
}

/**
 * POST /api/automations
 * 
 * Create a new automation rule
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireScope(request, 'boards:write');

    const body = await request.json();
    const { name, description, projectId, boardId, trigger, conditions, action, actionParams } = body;

    if (!name || !trigger || !action) {
      return NextResponse.json(
        { error: 'name, trigger, and action are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const automation: AutomationRule = {
      id: generateId('auto'),
      tenantId: context.tenantId,
      projectId,
      boardId,
      name,
      description,
      enabled: true,
      trigger,
      conditions: conditions || {},
      action,
      actionParams: actionParams || {},
      triggerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection<AutomationRule>('automations').insertOne(automation);

    return NextResponse.json(automation, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating automation:', error);
    return NextResponse.json({ error: 'Failed to create automation' }, { status: 500 });
  }
}

/**
 * PATCH /api/automations?id=xxx
 * 
 * Update an automation rule
 */
export async function PATCH(request: NextRequest) {
  try {
    const context = await requireScope(request, 'boards:write');

    const { searchParams } = new URL(request.url);
    const automationId = searchParams.get('id');

    if (!automationId) {
      return NextResponse.json({ error: 'Automation id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, enabled, trigger, conditions, action, actionParams } = body;

    const db = await getDb();

    const existing = await db.collection<AutomationRule>('automations').findOne({
      id: automationId,
      tenantId: context.tenantId,
    });

    if (!existing) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    const updates: Partial<AutomationRule> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (enabled !== undefined) updates.enabled = enabled;
    if (trigger !== undefined) updates.trigger = trigger;
    if (conditions !== undefined) updates.conditions = conditions;
    if (action !== undefined) updates.action = action;
    if (actionParams !== undefined) updates.actionParams = actionParams;

    await db.collection<AutomationRule>('automations').updateOne(
      { id: automationId, tenantId: context.tenantId },
      { $set: updates }
    );

    const updated = await db.collection<AutomationRule>('automations').findOne({
      id: automationId,
      tenantId: context.tenantId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating automation:', error);
    return NextResponse.json({ error: 'Failed to update automation' }, { status: 500 });
  }
}

/**
 * DELETE /api/automations?id=xxx
 * 
 * Delete an automation rule
 */
export async function DELETE(request: NextRequest) {
  try {
    const context = await requireScope(request, 'boards:write');

    const { searchParams } = new URL(request.url);
    const automationId = searchParams.get('id');

    if (!automationId) {
      return NextResponse.json({ error: 'Automation id is required' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection<AutomationRule>('automations').deleteOne({
      id: automationId,
      tenantId: context.tenantId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deleting automation:', error);
    return NextResponse.json({ error: 'Failed to delete automation' }, { status: 500 });
  }
}
