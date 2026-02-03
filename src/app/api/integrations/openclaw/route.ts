/**
 * OpenClaw Integration API
 * 
 * GET    - Get user's OpenClaw integration
 * POST   - Create/update OpenClaw integration
 * DELETE - Remove OpenClaw integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { OpenClawIntegration } from '@/types/integrations';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function generateApiKey(): string {
  return `moltboard_ck_${crypto.randomBytes(24).toString('base64url')}`;
}

function generateSecret(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Helper to find integration in new or legacy collection
 */
async function findIntegration(db: any, tenantId: string, userId: string): Promise<OpenClawIntegration | null> {
  const filter = { tenantId, userId };
  
  const result = await db
    .collection<OpenClawIntegration>('openclaw_integrations')
    .findOne(filter);
  
  if (result) return result;
  
  // Backwards compatibility: check legacy collection
  return await db
    .collection<OpenClawIntegration>('clawdbot_integrations')
    .findOne(filter);
}

/**
 * GET /api/integrations/openclaw
 * Get user's OpenClaw integration
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireScope(request, 'chat:read');
    const db = await getDb();

    const integration = await findIntegration(
      db,
      context.tenantId,
      context.userId || context.tenantId
    );

    if (!integration) {
      return NextResponse.json({ integration: null });
    }

    // Don't expose sensitive fields
    return NextResponse.json({
      integration: {
        id: integration.id,
        enabled: integration.enabled,
        webhookUrl: integration.webhookUrl,
        apiKeyPrefix: integration.apiKeyPrefix,
        status: integration.status,
        lastConnectedAt: integration.lastConnectedAt,
        lastError: integration.lastError,
        messagesReceived: integration.messagesReceived,
        messagesSent: integration.messagesSent,
        lastMessageAt: integration.lastMessageAt,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching OpenClaw integration:', error);
    return NextResponse.json({ error: 'Failed to fetch integration' }, { status: 500 });
  }
}

/**
 * POST /api/integrations/openclaw
 * Create or update OpenClaw integration
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireScope(request, 'chat:write');
    const db = await getDb();
    const body = await request.json();

    const { webhookUrl, enabled, regenerateApiKey, regenerateSecret } = body;

    // Validate webhook URL
    if (webhookUrl && !webhookUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
    }

    const userId = context.userId || context.tenantId;
    const existing = await findIntegration(db, context.tenantId, userId);

    if (existing) {
      // Update existing
      const updates: Partial<OpenClawIntegration> = {
        updatedAt: new Date(),
      };

      if (webhookUrl !== undefined) {
        updates.webhookUrl = webhookUrl;
        updates.status = 'pending'; // Reset status when URL changes
      }

      if (enabled !== undefined) {
        updates.enabled = enabled;
      }

      let newApiKey: string | undefined;
      if (regenerateApiKey) {
        newApiKey = generateApiKey();
        updates.apiKey = newApiKey;
        updates.apiKeyPrefix = newApiKey.slice(0, 16) + '...';
      }

      if (regenerateSecret) {
        updates.webhookSecret = generateSecret();
      }

      // Try new collection, then legacy
      const result = await db.collection<OpenClawIntegration>('openclaw_integrations').updateOne(
        { id: existing.id },
        { $set: updates }
      );
      
      if (result.matchedCount === 0) {
        await db.collection<OpenClawIntegration>('clawdbot_integrations').updateOne(
          { id: existing.id },
          { $set: updates }
        );
      }

      return NextResponse.json({
        integration: {
          id: existing.id,
          enabled: updates.enabled ?? existing.enabled,
          webhookUrl: updates.webhookUrl ?? existing.webhookUrl,
          apiKeyPrefix: updates.apiKeyPrefix ?? existing.apiKeyPrefix,
          status: updates.status ?? existing.status,
        },
        // Only return new credentials if regenerated
        ...(newApiKey && { apiKey: newApiKey }),
        ...(regenerateSecret && { webhookSecret: updates.webhookSecret }),
      });
    } else {
      // Create new
      if (!webhookUrl) {
        return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 });
      }

      const apiKey = generateApiKey();
      const webhookSecret = generateSecret();

      const integration: OpenClawIntegration = {
        id: generateId('openclaw'),
        tenantId: context.tenantId,
        userId,
        enabled: enabled ?? true,
        webhookUrl,
        apiKey,
        apiKeyPrefix: apiKey.slice(0, 16) + '...',
        webhookSecret,
        status: 'pending',
        messagesReceived: 0,
        messagesSent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection<OpenClawIntegration>('openclaw_integrations').insertOne(integration);

      return NextResponse.json({
        integration: {
          id: integration.id,
          enabled: integration.enabled,
          webhookUrl: integration.webhookUrl,
          apiKeyPrefix: integration.apiKeyPrefix,
          status: integration.status,
          createdAt: integration.createdAt,
        },
        // Return credentials on first creation
        apiKey,
        webhookSecret,
      }, { status: 201 });
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating/updating OpenClaw integration:', error);
    return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 });
  }
}

/**
 * DELETE /api/integrations/openclaw
 * Remove OpenClaw integration
 */
export async function DELETE(request: NextRequest) {
  try {
    const context = await requireScope(request, 'chat:write');
    const db = await getDb();

    const userId = context.userId || context.tenantId;
    
    // Try deleting from both collections
    const result1 = await db
      .collection<OpenClawIntegration>('openclaw_integrations')
      .deleteOne({ tenantId: context.tenantId, userId });
    
    const result2 = await db
      .collection<OpenClawIntegration>('clawdbot_integrations')
      .deleteOne({ tenantId: context.tenantId, userId });

    if (result1.deletedCount === 0 && result2.deletedCount === 0) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deleting OpenClaw integration:', error);
    return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 });
  }
}
