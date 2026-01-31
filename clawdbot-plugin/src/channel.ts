/**
 * Moltboard Channel Plugin for Clawdbot
 * 
 * Integrates Clawd Moltboard as a native messaging channel.
 */

import type { ChannelPlugin, ChannelAccountSnapshot, ClawdbotConfig } from "clawdbot/plugin-sdk";
import type { ResolvedMoltboardAccount, MoltboardChannelConfig } from "./types.js";
import { 
  fetchPendingMessages, 
  sendMessage, 
  updateMessageStatus, 
  probeMoltboard,
  fetchTaskDetails,
  fetchBoardDetails,
} from "./api.js";

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_API_URL = "http://localhost:3001";

/**
 * Resolve account configuration from Clawdbot config
 */
function resolveMoltboardAccount(
  cfg: ClawdbotConfig,
  accountId: string = "default"
): ResolvedMoltboardAccount {
  const moltboardCfg = (cfg.channels?.moltboard ?? {}) as MoltboardChannelConfig;
  
  // Check for multi-account config first
  const accountCfg = moltboardCfg.accounts?.[accountId];
  const baseCfg = accountCfg ?? moltboardCfg;
  
  const apiUrl = baseCfg.apiUrl ?? DEFAULT_API_URL;
  const apiKey = baseCfg.apiKey ?? "";
  
  return {
    accountId,
    apiUrl,
    apiKey,
    pollIntervalMs: baseCfg.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    defaultBoardId: baseCfg.defaultBoardId,
    enabled: baseCfg.enabled !== false,
    configured: Boolean(apiUrl && apiKey),
  };
}

/**
 * List configured account IDs
 */
function listMoltboardAccountIds(cfg: ClawdbotConfig): string[] {
  const moltboardCfg = (cfg.channels?.moltboard ?? {}) as MoltboardChannelConfig;
  
  // Multi-account mode
  if (moltboardCfg.accounts && Object.keys(moltboardCfg.accounts).length > 0) {
    return Object.keys(moltboardCfg.accounts);
  }
  
  // Single account mode - check if configured
  if (moltboardCfg.apiUrl && moltboardCfg.apiKey) {
    return ["default"];
  }
  
  return [];
}

/**
 * Channel metadata
 */
const meta = {
  id: "moltboard",
  label: "Moltboard",
  selectionLabel: "Clawd Moltboard (Task Board)",
  detailLabel: "Moltboard",
  docsPath: "/channels/moltboard",
  docsLabel: "moltboard",
  blurb: "Task management chat via Clawd Moltboard board.",
  aliases: ["mb", "tasks"],
  order: 80,
};

/**
 * Moltboard Channel Plugin
 */
export const moltboardPlugin: ChannelPlugin<ResolvedMoltboardAccount> = {
  id: "moltboard",
  meta,

  capabilities: {
    chatTypes: ["direct"],
    media: false,
    reactions: false,
    edit: false,
    unsend: false,
    reply: true,
  },

  reload: {
    configPrefixes: ["channels.moltboard"],
  },

  // TODO: Add configSchema once zod v4 is properly set up
  // configSchema: buildChannelConfigSchema(MoltboardConfigSchema),

  config: {
    listAccountIds: (cfg) => listMoltboardAccountIds(cfg as ClawdbotConfig),
    
    resolveAccount: (cfg, accountId) =>
      resolveMoltboardAccount(cfg as ClawdbotConfig, accountId),
    
    defaultAccountId: () => "default",
    
    isConfigured: (account) => account.configured,
    
    describeAccount: (account): ChannelAccountSnapshot => ({
      accountId: account.accountId,
      name: `Moltboard (${account.apiUrl})`,
      enabled: account.enabled,
      configured: account.configured,
      baseUrl: account.apiUrl,
    }),
  },

  outbound: {
    deliveryMode: "direct",
    textChunkLimit: 10000,

    resolveTarget: ({ to }) => {
      const target = to?.trim() || "default";
      return { ok: true, to: target };
    },

    sendText: async ({ cfg, to, text, accountId, replyToId, context }) => {
      try {
        const account = resolveMoltboardAccount(cfg as ClawdbotConfig, accountId);
        
        if (!account.configured) {
          return {
            ok: false,
            error: new Error("Moltboard channel not configured (missing apiUrl or apiKey)"),
          };
        }

        // Parse boardId from target or use default
        const boardId = to || account.defaultBoardId || "default";
        
        // Extract task context from inbound context if available
        const inboundContext = context as { 
          taskId?: string; 
          taskTitle?: string; 
          boardId?: string;
        } | undefined;

        const result = await sendMessage(account, {
          content: text,
          boardId,
          taskId: inboundContext?.taskId,
          taskTitle: inboundContext?.taskTitle,
          replyTo: replyToId ?? undefined,
        });

        return {
          ok: true,
          messageId: result.id,
          channel: "moltboard",
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  },

  status: {
    defaultRuntime: {
      accountId: "default",
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },

    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      baseUrl: snapshot.baseUrl ?? null,
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      probe: snapshot.probe,
      lastProbeAt: snapshot.lastProbeAt ?? null,
    }),

    probeAccount: async ({ account, timeoutMs }) => {
      return probeMoltboard(account, { timeoutMs });
    },

    buildAccountSnapshot: ({ account, runtime, probe }) => {
      const running = runtime?.running ?? false;
      const probeOk = (probe as { ok?: boolean } | undefined)?.ok;
      return {
        accountId: account.accountId,
        name: `Moltboard (${account.apiUrl})`,
        enabled: account.enabled,
        configured: account.configured,
        baseUrl: account.apiUrl,
        running,
        connected: probeOk ?? running,
        lastStartAt: runtime?.lastStartAt ?? null,
        lastStopAt: runtime?.lastStopAt ?? null,
        lastError: runtime?.lastError ?? null,
        probe,
        lastInboundAt: runtime?.lastInboundAt ?? null,
        lastOutboundAt: runtime?.lastOutboundAt ?? null,
      };
    },
  },

  gateway: {
    startAccount: async (ctx) => {
      const { account, runtime, abortSignal, cfg } = ctx;

      if (!account.configured) {
        ctx.log?.warn(`[moltboard:${account.accountId}] Not configured, skipping.`);
        return () => {};
      }

      ctx.log?.info(
        `[moltboard:${account.accountId}] Starting poller (interval=${account.pollIntervalMs}ms)...`
      );

      ctx.setStatus({
        accountId: account.accountId,
        running: true,
        lastStartAt: Date.now(),
      });

      let lastTimestamp: string | null = null;
      let pollCount = 0;

      const poll = async () => {
        if (abortSignal.aborted) return;

        try {
          const data = await fetchPendingMessages(account, lastTimestamp, {
            signal: abortSignal,
          });

          const messages = data.messages || [];
          
          for (const msg of messages) {
            // Skip our own messages
            if (msg.author === "moltbot" || msg.author === "api") continue;

            ctx.log?.info(
              `[moltboard:${account.accountId}] Inbound from ${msg.author}: ${msg.content.slice(0, 50)}...`
            );

            // Mark as processing
            try {
              await updateMessageStatus(account, msg.id, "processing", {
                signal: abortSignal,
              });
            } catch (err) {
              ctx.log?.warn(`[moltboard] Failed to update status: ${err}`);
            }

            // Build context with task details if available
            let taskContext: string | undefined;
            let boardContext: string | undefined;
            
            // Fetch task details for context injection
            if (msg.taskId) {
              try {
                const task = await fetchTaskDetails(account, msg.taskId, { signal: abortSignal });
                if (task) {
                  const parts: string[] = [`Task: "${task.title}" (${task.id})`];
                  if (task.description) parts.push(`Description: ${task.description}`);
                  if (task.priority) parts.push(`Priority: ${task.priority.toUpperCase()}`);
                  if (task.labels?.length) parts.push(`Labels: ${task.labels.join(", ")}`);
                  if (task.dueDate) parts.push(`Due: ${new Date(task.dueDate).toLocaleDateString()}`);
                  if (task.assigneeId) parts.push(`Assigned to: ${task.assigneeId}`);
                  if (task.checklist?.length) {
                    const done = task.checklist.filter(c => c.completed).length;
                    parts.push(`Checklist: ${done}/${task.checklist.length} complete`);
                  }
                  taskContext = parts.join("\n");
                }
              } catch (err) {
                ctx.log?.warn(`[moltboard] Failed to fetch task context: ${err}`);
              }
            }

            // Fetch board details for session context
            const boardId = msg.boardId || account.defaultBoardId || "default";
            try {
              const board = await fetchBoardDetails(account, boardId, { signal: abortSignal });
              if (board) {
                boardContext = `Board: "${board.name}"${board.description ? ` - ${board.description}` : ""}`;
              }
            } catch (err) {
              // Non-critical, continue without board context
            }

            // Build system hint with task/board context
            const contextParts: string[] = [];
            if (boardContext) contextParts.push(boardContext);
            if (taskContext) contextParts.push(taskContext);
            const systemHint = contextParts.length > 0 
              ? `Moltboard Context:\n${contextParts.join("\n\n")}`
              : undefined;

            // Route to Clawdbot agent pipeline
            try {
              await runtime.inbound({
                channel: "moltboard",
                accountId: account.accountId,
                sessionId: boardId,  // Per-board sessions
                senderId: msg.author,
                senderName: msg.author === "mike" ? "Mike" : msg.author,
                messageId: msg.id,
                text: msg.content,
                timestamp: new Date(msg.createdAt),
                context: {
                  boardId: msg.boardId,
                  taskId: msg.taskId,
                  taskTitle: msg.taskTitle,
                  replyTo: msg.replyTo,
                },
                systemHint,
              });

              ctx.setStatus({ lastInboundAt: Date.now() });
            } catch (err) {
              ctx.log?.error(`[moltboard] Failed to route inbound: ${err}`);
            }
          }

          // Update cursor
          if (data.meta?.latestTimestamp) {
            lastTimestamp = data.meta.latestTimestamp;
          } else if (messages.length > 0) {
            lastTimestamp = messages[messages.length - 1].createdAt;
          }

          pollCount++;
          if (pollCount % 60 === 0) {
            ctx.log?.info(
              `[moltboard:${account.accountId}] Poll #${pollCount}, cursor=${lastTimestamp ?? "null"}`
            );
          }
        } catch (error) {
          if (!abortSignal.aborted) {
            ctx.log?.warn(`[moltboard:${account.accountId}] Poll error: ${error}`);
            ctx.setStatus({ lastError: String(error) });
          }
        }
      };

      // Initial poll
      await poll();

      // Start interval
      const intervalId = setInterval(poll, account.pollIntervalMs);

      // Return cleanup function
      return () => {
        clearInterval(intervalId);
        ctx.setStatus({
          running: false,
          lastStopAt: Date.now(),
        });
        ctx.log?.info(`[moltboard:${account.accountId}] Stopped.`);
      };
    },
  },
};
