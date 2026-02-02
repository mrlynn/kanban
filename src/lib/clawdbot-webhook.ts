/**
 * Clawdbot Webhook Integration
 * 
 * Multi-tenant support: looks up user's integration settings from DB.
 * Falls back to env vars for backwards compatibility.
 */

import crypto from 'crypto';
import { getDb } from './mongodb';
import { ClawdbotIntegration, ClawdbotOutboundPayload } from '@/types/integrations';

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
    url: process.env.CLAWDBOT_WEBHOOK_URL || '',
    secret: process.env.CLAWDBOT_WEBHOOK_SECRET || '',
    enabled: process.env.CLAWDBOT_WEBHOOK_ENABLED === 'true',
  };
}

/**
 * Get user's Clawdbot integration from database
 */
export async function getUserIntegration(
  tenantId: string,
  userId?: string
): Promise<ClawdbotIntegration | null> {
  try {
    const db = await getDb();
    return await db
      .collection<ClawdbotIntegration>('clawdbot_integrations')
      .findOne({ 
        tenantId,
        userId: userId || tenantId,
        enabled: true,
      });
  } catch (error) {
    console.error('[clawdbot-webhook] Failed to fetch integration:', error);
    return null;
  }
}

/**
 * Find integration by API key (for inbound requests)
 */
export async function findIntegrationByApiKey(
  apiKey: string
): Promise<ClawdbotIntegration | null> {
  try {
    const db = await getDb();
    return await db
      .collection<ClawdbotIntegration>('clawdbot_integrations')
      .findOne({ apiKey, enabled: true });
  } catch (error) {
    console.error('[clawdbot-webhook] Failed to find integration by key:', error);
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
 * Send message to user's Clawdbot instance
 */
export async function sendToUserClawdbot(
  integration: ClawdbotIntegration,
  message: ClawdbotOutboundPayload['message']
): Promise<{ success: boolean; error?: string; responseId?: string }> {
  if (!integration.enabled) {
    return { success: false, error: 'Integration disabled' };
  }

  if (!integration.webhookUrl) {
    return { success: false, error: 'No webhook URL configured' };
  }

  const payload: ClawdbotOutboundPayload = {
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
    console.log(`[clawdbot-webhook] Sending to ${integration.webhookUrl}`);
    
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
      console.error(`[clawdbot-webhook] Failed: ${response.status} - ${errorText}`);
      
      // Update integration stats
      await updateIntegrationError(integration.id, `HTTP ${response.status}`);
      
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json().catch(() => ({}));
    console.log('[clawdbot-webhook] Success:', result);
    
    // Update integration stats
    await updateIntegrationSuccess(integration.id);
    
    return { 
      success: true, 
      responseId: result.messageId || result.id,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[clawdbot-webhook] Error:', errorMsg);
    
    await updateIntegrationError(integration.id, errorMsg);
    
    return { success: false, error: errorMsg };
  }
}

/**
 * Legacy: Send using env var config (backwards compatible)
 */
export async function sendToClawdbot(
  message: ClawdbotOutboundPayload['message'],
  tenantId: string,
  type: 'message' | 'command' = 'message'
): Promise<{ success: boolean; error?: string; responseId?: string }> {
  // First try user integration
  const integration = await getUserIntegration(tenantId);
  if (integration) {
    return sendToUserClawdbot(integration, message);
  }

  // Fall back to env var config
  const config = getWebhookConfigFromEnv();
  
  if (!config.enabled) {
    console.log('[clawdbot-webhook] Webhook disabled, skipping');
    return { success: false, error: 'Webhook disabled' };
  }
  
  if (!config.url) {
    console.warn('[clawdbot-webhook] No webhook URL configured');
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
    console.log(`[clawdbot-webhook] Sending ${type} to ${config.url}`);
    
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
      console.error(`[clawdbot-webhook] Failed: ${response.status} - ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json().catch(() => ({}));
    console.log('[clawdbot-webhook] Success:', result);
    
    return { 
      success: true, 
      responseId: result.messageId || result.id,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[clawdbot-webhook] Error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Update integration stats on success
 */
async function updateIntegrationSuccess(integrationId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.collection<ClawdbotIntegration>('clawdbot_integrations').updateOne(
      { id: integrationId },
      {
        $set: {
          status: 'connected',
          lastConnectedAt: new Date(),
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { messagesSent: 1 },
      }
    );
  } catch (error) {
    console.error('[clawdbot-webhook] Failed to update stats:', error);
  }
}

/**
 * Update integration stats on error
 */
async function updateIntegrationError(integrationId: string, error: string): Promise<void> {
  try {
    const db = await getDb();
    await db.collection<ClawdbotIntegration>('clawdbot_integrations').updateOne(
      { id: integrationId },
      {
        $set: {
          status: 'error',
          lastErrorAt: new Date(),
          lastError: error.slice(0, 500),
          updatedAt: new Date(),
        },
      }
    );
  } catch (err) {
    console.error('[clawdbot-webhook] Failed to update error status:', err);
  }
}
