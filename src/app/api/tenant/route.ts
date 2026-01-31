import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { 
  requireAuth, 
  AuthError,
} from '@/lib/tenant-auth';
import { Tenant } from '@/types/tenant';

/**
 * GET /api/tenant
 * Get current tenant info
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireAuth(request);
    
    return NextResponse.json({
      success: true,
      tenant: {
        id: context.tenant.id,
        name: context.tenant.name,
        slug: context.tenant.slug,
        plan: context.tenant.plan,
        planExpiresAt: context.tenant.planExpiresAt,
        usage: context.tenant.usage,
        limits: context.tenant.limits,
        createdAt: context.tenant.createdAt,
      },
      auth: {
        type: context.type,
        userId: context.userId,
        scopes: context.scopes,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error getting tenant:', error);
    return Response.json({ error: 'Failed to get tenant' }, { status: 500 });
  }
}

/**
 * PATCH /api/tenant
 * Update tenant settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const context = await requireAuth(request);
    
    // Only session auth can update tenant
    if (context.type !== 'session') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Check if user is owner or admin
    const membership = context.user?.memberships.find(
      m => m.tenantId === context.tenantId
    );
    
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return Response.json({ error: 'Not authorized to update tenant' }, { status: 403 });
    }
    
    const db = await getDb();
    const body = await request.json();
    
    // Only allow updating name
    const update: Partial<Tenant> = {};
    if (body.name !== undefined) {
      update.name = body.name.trim();
    }
    
    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    update.updatedAt = new Date();
    
    await db.collection<Tenant>('tenants').updateOne(
      { id: context.tenantId },
      { $set: update }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Tenant updated',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating tenant:', error);
    return Response.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}
