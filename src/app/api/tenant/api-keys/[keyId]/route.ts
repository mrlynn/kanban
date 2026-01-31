import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { 
  requireAuth, 
  AuthError,
  forbiddenResponse,
} from '@/lib/tenant-auth';
import { TenantApiKey } from '@/types/tenant';

/**
 * GET /api/tenant/api-keys/:keyId
 * Get details of a specific API key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { keyId } = await params;
    
    if (context.type !== 'session') {
      return forbiddenResponse('API keys cannot be viewed via API key auth');
    }
    
    const db = await getDb();
    
    const key = await db.collection<TenantApiKey>('apiKeys').findOne({
      id: keyId,
      tenantId: context.tenantId,
    });
    
    if (!key) {
      return Response.json({ error: 'API key not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      key: {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes,
        lastUsedAt: key.lastUsedAt,
        usageCount: key.usageCount,
        createdAt: key.createdAt,
        createdBy: key.createdBy,
        expiresAt: key.expiresAt,
        revokedAt: key.revokedAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error getting API key:', error);
    return Response.json({ error: 'Failed to get API key' }, { status: 500 });
  }
}

/**
 * PATCH /api/tenant/api-keys/:keyId
 * Update an API key (name, scopes)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { keyId } = await params;
    
    if (context.type !== 'session') {
      return forbiddenResponse('API keys cannot be updated via API key auth');
    }
    
    const db = await getDb();
    const body = await request.json();
    
    // Find the key
    const key = await db.collection<TenantApiKey>('apiKeys').findOne({
      id: keyId,
      tenantId: context.tenantId,
      revokedAt: { $exists: false },
    });
    
    if (!key) {
      return Response.json({ error: 'API key not found' }, { status: 404 });
    }
    
    // Build update
    const update: Partial<TenantApiKey> = {};
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.scopes !== undefined) update.scopes = body.scopes;
    
    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    await db.collection<TenantApiKey>('apiKeys').updateOne(
      { id: keyId },
      { $set: update }
    );
    
    return NextResponse.json({
      success: true,
      message: 'API key updated',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating API key:', error);
    return Response.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}

/**
 * DELETE /api/tenant/api-keys/:keyId
 * Revoke an API key (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const context = await requireAuth(request);
    const { keyId } = await params;
    
    if (context.type !== 'session') {
      return forbiddenResponse('API keys cannot be revoked via API key auth');
    }
    
    const db = await getDb();
    
    // Find the key
    const key = await db.collection<TenantApiKey>('apiKeys').findOne({
      id: keyId,
      tenantId: context.tenantId,
    });
    
    if (!key) {
      return Response.json({ error: 'API key not found' }, { status: 404 });
    }
    
    if (key.revokedAt) {
      return Response.json({ error: 'API key already revoked' }, { status: 400 });
    }
    
    // Soft delete (revoke)
    await db.collection<TenantApiKey>('apiKeys').updateOne(
      { id: keyId },
      { $set: { revokedAt: new Date() } }
    );
    
    // Update usage count
    await db.collection('tenants').updateOne(
      { id: context.tenantId },
      { 
        $inc: { 'usage.apiKeys': -1 },
        $set: { updatedAt: new Date() },
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'API key revoked',
      warning: 'Any bots using this key will stop working immediately',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Error revoking API key:', error);
    return Response.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
