/**
 * OpenClaw Webhook Integration
 * 
 * Multi-tenant support: looks up user's integration settings from DB.
 * Falls back to env vars for backwards compatibility.
 */

import crypto from 'crypto';
import { getDb } from './mongodb';
import { OpenClawIntegration, OpenClawOutboundPayload } from '@/types/integrations';

export interface WebhookConfig {
  url: string;
  secret: string;
  enabled: boolean;
}

/**
 * Get webhook configuration from environment (fallback)
 */
export function getWebhookConfigFromEnv(): WebhookConfig {
  return {
    url: process.env.OPENCLAW_WEBHOOK_URL || process.env.CLAWDBOT_WEBHOOK_URL || '',
    secret: process.env.OPENCLAW_WEBHOOK_SECRET || process.env.CLAWDBOT_WEBHOOK_SECRET || '',
    enabled: (process.env.OPENCLAW_WEBHOOK_ENABLED || process.env.CLAWDBOT_WEBHOOK_ENABLED) === 'true',
  };
}

/**
 * Get user's OpenClaw integration from database
 * 
 * NOTE: Collection was renamed from 'clawdbot_integrations' to 'openclaw_integrations'.
 * We query both for backwards compatibility with existing data.
 */
export async function getUserIntegration(
  tenantId: string,
  userId?: string
): Promise<OpenClawIntegration | null> {
  try {
    const db = await getDb();
    const filter = { 
      tenantId,
      userId: userId || tenantId,
      enabled: true,
    };
    
    // Try new collection first, fall back to legacy
    const result = await db
      .collection<OpenClawIntegration>('openclaw_integrations')
      .findOne(filter);
    
    if (result) return result;
    
    // Backwards compatibility: check legacy collection name
    return await db
      .collection<OpenClawIntegration>('clawdbot_integrations')
      .findOne(filter);
  } catch (error) {
    console.error('[openclaw-webhook] Failed to fetch integration:', error);
    return null;
  }
}

/**
 * Find integration by API key (for inbound requests)
 */
export async function findIntegrationByApiKey(
  apiKey: string
): Promise<OpenClawIntegration | null> {
  try {
    const db = await getDb();
    const filter = { apiKey, enabled: true };
    
    // Try new collection first, fall back to legacy
    const result = await db
      .collection<OpenClawIntegration>('openclaw_integrations')
      .findOne(filter);
    
    if (result) return result;
    
    return await db
      .collection<OpenClawIntegration>('clawdbot_integrations')
      .findOne(filter);
  } catch (error) {
    console.error('[openclaw-webhook] Failed to find integration by key:', error);
    return null;
  }
}

/**
 * Generate HMAC signature for webhook payload
 */
export function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify incoming webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return true; // Skip if no secret configured
  if (!signature) return false;
  
  const expected = signPayload(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Send message to user's OpenClaw instance
 */
export async function sendToUserOpenClaw(
  integration: OpenClawIntegration,
  message: OpenClawOutboundPayload['message']
): Promise<{ success: boolean; error?: string; responseId?: string }> {
  if (!integration.enabled) {
    return { success: false, error: 'Integration disabled' };
  }

  if (!integration.webhookUrl) {
    return { success: false, error: 'No webhook URL configured' };
  }

  const payload: OpenClawOutboundPayload = {
    type: 'message',
    message,
    meta: {
      tenantId: integration.tenantId,
      userId: integration.userId,
      integrationId: integration.id,
      timestamp: new Date().toISOString(),
    },
  };

  const payloadStr = JSON.stringify(payload);
  const signature = signPayload(payloadStr, integration.webhookSecret);

  try {
    console.log(`[openclaw-webhook] Sending to ${integration.webhookUrl}`);
    
    const response = await fetch(integration.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moltboard-Signature': signature,
        'X-Moltboard-Timestamp': new Date().toISOString(),
      },
      body: payloadStr,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[openclaw-webhook] Failed: ${response.status} - ${errorText}`);
      
      // Update integration stats
      await updateIntegrationError(integration.id, `HTTP ${response.status}`);
      
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json().catch(() => ({}));
    console.log('[openclaw-webhook] Success:', result);
    
    // Update integration stats
    await updateIntegrationSuccess(integration.id);
    
    return { 
      success: true, 
      responseId: result.messageId || result.id,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[openclaw-webhook] Error:', errorMsg);
    
    await updateIntegrationError(integration.id, errorMsg);
    
    return { success: false, error: errorMsg };
  }
}

/**
 * Legacy: Send using env var config (backwards compatible)
 */
export async function sendToOpenClaw(
  message: OpenClawOutboundPayload['message'],
  tenantId: string,
  type: 'message' | 'command' = 'message'
): Promise<{ success: boolean; error?: string; responseId?: string }> {
  // First try user integration
  const integration = await getUserIntegration(tenantId);
  if (integration) {
    return sendToUserOpenClaw(integration, message);
  }

  // Fall back to env var config
  const config = getWebhookConfigFromEnv();
  
  if (!config.enabled) {
    console.log('[openclaw-webhook] Webhook disabled, skipping');
    return { success: false, error: 'Webhook disabled' };
  }
  
  if (!config.url) {
    console.warn('[openclaw-webhook] No webhook URL configured');
    return { success: false, error: 'No webhook URL configured' };
  }

  const payload = {
    type,
    message,
    meta: {
      tenantId,
      timestamp: new Date().toISOString(),
    },
  };

  const payloadStr = JSON.stringify(payload);
  const signature = config.secret ? signPayload(payloadStr, config.secret) : '';

  try {
    console.log(`[openclaw-webhook] Sending ${type} to ${config.url}`);
    
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moltboard-Signature': signature,
        'X-Moltboard-Timestamp': new Date().toISOString(),
      },
      body: payloadStr,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[openclaw-webhook] Failed: ${response.status} - ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json().catch(() => ({}));
    console.log('[openclaw-webhook] Success:', result);
    
    return { 
      success: true, 
      responseId: result.messageId || result.id,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[openclaw-webhook] Error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Get the collection name for openclaw integrations.
 * Returns the new name; callers should also check the legacy name for backwards compat.
 */
function getCollectionName(): string {
  return 'openclaw_integrations';
}

/**
 * Update integration stats on success
 */
async function updateIntegrationSuccess(integrationId: string): Promise<void> {
  try {
    const db = await getDb();
    const update = {
      $set: {
        status: 'connected' as const,
        lastConnectedAt: new Date(),
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      },
      $inc: { messagesSent: 1 },
    };
    
    // Try new collection, then legacy
    const result = await db.collection<OpenClawIntegration>('openclaw_integrations').updateOne(
      { id: integrationId },
      update
    );
    
    if (result.matchedCount === 0) {
      await db.collection<OpenClawIntegration>('clawdbot_integrations').updateOne(
        { id: integrationId },
        update
      );
    }
  } catch (error) {
    console.error('[openclaw-webhook] Failed to update stats:', error);
  }
}

/**
 * Update integration stats on error
 */
async function updateIntegrationError(integrationId: string, error: string): Promise<void> {
  try {
    const db = await getDb();
    const update = {
      $set: {
        status: 'error' as const,
        lastErrorAt: new Date(),
        lastError: error.slice(0, 500),
        updatedAt: new Date(),
      },
    };
    
    // Try new collection, then legacy
    const result = await db.collection<OpenClawIntegration>('openclaw_integrations').updateOne(
      { id: integrationId },
      update
    );
    
    if (result.matchedCount === 0) {
      await db.collection<OpenClawIntegration>('clawdbot_integrations').updateOne(
        { id: integrationId },
        update
      );
    }
  } catch (err) {
    console.error('[openclaw-webhook] Failed to update error status:', err);
  }
}
