/**
 * OpenClaw Webhook Response Endpoint
 * 
 * POST /api/webhooks/openclaw
 * 
 * Receives responses from OpenClaw and stores them as chat messages.
 * Supports two authentication methods:
 * 1. API Key auth (per-user integrations) - X-Moltboard-Api-Key header
 * 2. Signature auth (legacy/env var) - X-OpenClaw-Signature header
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ChatMessage } from '@/types/chat';
import { 
  verifySignature, 
  getWebhookConfigFromEnv, 
  findIntegrationByApiKey 
} from '@/lib/openclaw-webhook';
import { OpenClawIntegration, OpenClawInboundPayload } from '@/types/integrations';
import crypto from 'crypto';

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    
    // Try API key authentication first (per-user integrations)
    const apiKey = request.headers.get('X-Moltboard-Api-Key');
    let integration: OpenClawIntegration | null = null;
    let tenantId: string | null = null;
    let userId: string | null = null;

    if (apiKey) {
      integration = await findIntegrationByApiKey(apiKey);
      
      if (!integration) {
        console.warn('[openclaw-webhook] Invalid API key');
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      
      tenantId = integration.tenantId;
      userId = integration.userId;
      
      // Verify signature with integration's webhook secret
      if (integration.webhookSecret) {
        // Accept both new and legacy header names
        const signature = request.headers.get('X-OpenClaw-Signature') 
          || request.headers.get('X-Clawdbot-Signature') 
          || '';
        
        if (!verifySignature(rawBody, signature, integration.webhookSecret)) {
          console.warn('[openclaw-webhook] Invalid signature for integration');
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          );
        }
      }
    } else {
      // Fall back to legacy env var authentication
      const config = getWebhookConfigFromEnv();
      
      if (config.secret) {
        // Accept both new and legacy header names
        const signature = request.headers.get('X-OpenClaw-Signature')
          || request.headers.get('X-Clawdbot-Signature')
          || '';
        
        if (!verifySignature(rawBody, signature, config.secret)) {
          console.warn('[openclaw-webhook] Invalid signature (legacy)');
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          );
        }
      }
    }

    // Parse payload
    const payload: OpenClawInboundPayload = JSON.parse(rawBody);
    
    if (!payload.message?.content) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // Get tenant from integration or payload
    const finalTenantId = tenantId || (payload as any).meta?.tenantId || 'default';
    
    // If this is a reply, mark the original message as complete
    const originalMessageId = payload.meta?.originalMessageId || payload.message.replyTo;
    if (originalMessageId) {
      await db.collection<ChatMessage>('chats').updateOne(
        { id: originalMessageId },
        { 
          $set: { 
            status: 'complete',
            updatedAt: new Date(),
          } 
        }
      );
    }

    // Create the response message
    // NOTE: author is 'agent' for new records; legacy data may have 'moltbot'
    const message: ChatMessage = {
      id: generateId('msg'),
      tenantId: finalTenantId,
      boardId: payload.message.boardId,
      author: 'agent',
      content: payload.message.content.trim(),
      taskId: payload.message.taskId,
      taskTitle: payload.message.taskTitle,
      replyTo: originalMessageId,
      status: 'complete',
      createdAt: new Date(),
    };
    
    await db.collection<ChatMessage>('chats').insertOne(message);

    // Update integration stats if this came from a per-user integration
    if (integration) {
      const updateOp = {
        $set: {
          status: 'connected' as const,
          lastConnectedAt: new Date(),
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { messagesReceived: 1 },
      };
      
      // Try new collection, then legacy
      const result = await db.collection<OpenClawIntegration>('openclaw_integrations').updateOne(
        { id: integration.id },
        updateOp
      );
      
      if (result.matchedCount === 0) {
        await db.collection<OpenClawIntegration>('clawdbot_integrations').updateOne(
          { id: integration.id },
          updateOp
        );
      }
    }

    console.log(`[openclaw-webhook] Stored response: ${message.id}${integration ? ` (integration: ${integration.id})` : ''}`);

    return NextResponse.json({
      success: true,
      messageId: message.id,
    });
  } catch (error) {
    console.error('[openclaw-webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  const config = getWebhookConfigFromEnv();
  
  return NextResponse.json({
    status: 'ok',
    webhookEnabled: config.enabled,
    hasSecret: Boolean(config.secret),
    supportsApiKey: true,
    version: '2.0',
  });
}
