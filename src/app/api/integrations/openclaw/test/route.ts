/**
 * OpenClaw Integration Test API
 * 
 * POST - Send a test message to user's OpenClaw
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { OpenClawIntegration } from '@/types/integrations';
import { requireScope, AuthError } from '@/lib/tenant-auth';
import { signPayload } from '@/lib/openclaw-webhook';

/**
 * Helper to find integration in new or legacy collection
 */
async function findIntegration(db: Awaited<ReturnType<typeof getDb>>, tenantId: string, userId: string): Promise<OpenClawIntegration | null> {
  const filter = { tenantId, userId };
  const result = await db.collection<OpenClawIntegration>('openclaw_integrations').findOne(filter);
  if (result) return result;
  return await db.collection<OpenClawIntegration>('openclaw_integrations').findOne(filter);
}

/**
 * Helper to update integration in the correct collection
 */
async function updateIntegration(db: Awaited<ReturnType<typeof getDb>>, integrationId: string, update: any): Promise<void> {
  const result = await db.collection<OpenClawIntegration>('openclaw_integrations').updateOne(
    { id: integrationId },
    update
  );
  if (result.matchedCount === 0) {
    await db.collection<OpenClawIntegration>('openclaw_integrations').updateOne(
      { id: integrationId },
      update
    );
  }
}

/**
 * POST /api/integrations/openclaw/test
 * Send a test message to verify the connection
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireScope(request, 'chat:write');
    const db = await getDb();

    const userId = context.userId || context.tenantId;
    const integration = await findIntegration(db, context.tenantId, userId);

    if (!integration) {
      return NextResponse.json({ error: 'No integration configured' }, { status: 404 });
    }

    if (!integration.enabled) {
      return NextResponse.json({ error: 'Integration is disabled' }, { status: 400 });
    }

    if (!integration.webhookUrl) {
      return NextResponse.json({ error: 'No webhook URL configured' }, { status: 400 });
    }

    // Build test payload
    const payload = {
      type: 'message' as const,
      message: {
        id: `test_${Date.now()}`,
        content: '🔗 Connection test from Moltboard! If you see this, your OpenClaw integration is working.',
        author: 'moltboard',
        createdAt: new Date().toISOString(),
      },
      meta: {
        tenantId: context.tenantId,
        userId,
        integrationId: integration.id,
        timestamp: new Date().toISOString(),
        isTest: true,
      },
    };

    const payloadStr = JSON.stringify(payload);
    const signature = signPayload(payloadStr, integration.webhookSecret);

    // Send test webhook
    const startTime = Date.now();
    try {
      const response = await fetch(integration.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Moltboard-Signature': signature,
          'X-Moltboard-Timestamp': new Date().toISOString(),
          'X-Moltboard-Test': 'true',
        },
        body: payloadStr,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        await updateIntegration(db, integration.id, {
          $set: {
            status: 'error',
            lastErrorAt: new Date(),
            lastError: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: false,
          error: `Webhook returned ${response.status}`,
          details: errorText.slice(0, 500),
          latencyMs,
        });
      }

      await updateIntegration(db, integration.id, {
        $set: {
          status: 'connected',
          lastConnectedAt: new Date(),
          lastError: undefined,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Connection successful!',
        latencyMs,
      });
    } catch (fetchError) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';

      await updateIntegration(db, integration.id, {
        $set: {
          status: 'error',
          lastErrorAt: new Date(),
          lastError: errorMessage,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: false,
        error: 'Failed to reach webhook',
        details: errorMessage,
        latencyMs,
      });
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error testing OpenClaw integration:', error);
    return NextResponse.json({ error: 'Failed to test integration' }, { status: 500 });
  }
}
