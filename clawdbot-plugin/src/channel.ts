/**
 * Moltboard Channel Plugin for Clawdbot
 * 
 * Integrates Moltboard as a native messaging channel.
 * 
 * Uses internal Clawdbot APIs for inbound message dispatch.
 */

import { createRequire } from "module";
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
const DEFAULT_API_URL = "https://kanban.mlynn.org";

// Clawdbot installation paths to try
const CLAWDBOT_PATHS = [
  "/opt/homebrew/lib/node_modules/clawdbot/package.json",
  "/usr/local/lib/node_modules/clawdbot/package.json",
  "/usr/lib/node_modules/clawdbot/package.json",
];

/**
 * Resolve account configuration from Clawdbot config
 */
function resolveMoltboardAccount(
  cfg: ClawdbotConfig,
  accountId: string = "default"
): ResolvedMoltboardAccount {
  const moltboardCfg = (cfg.channels?.moltboard ?? {}) as MoltboardChannelConfig;
  
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
  
  if (moltboardCfg.accounts && Object.keys(moltboardCfg.accounts).length > 0) {
    return Object.keys(moltboardCfg.accounts);
  }
  
  if (moltboardCfg.apiUrl && moltboardCfg.apiKey) {
    return ["default"];
  }
  
  return [];
}

const meta = {
  id: "moltboard",
  label: "Moltboard",
  selectionLabel: "Moltboard (Task Board)",
  detailLabel: "Moltboard",
  docsPath: "/channels/moltboard",
  docsLabel: "moltboard",
  blurb: "Task management chat via Moltboard. 🔥",
  aliases: ["mb", "tasks"],
  order: 80,
};

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

  config: {
    listAccountIds: (cfg: ClawdbotConfig) => listMoltboardAccountIds(cfg),
    resolveAccount: (cfg: ClawdbotConfig, accountId: string) => resolveMoltboardAccount(cfg, accountId),
    defaultAccountId: () => "default",
    isConfigured: (account: ResolvedMoltboardAccount) => account.configured,
    describeAccount: (account: ResolvedMoltboardAccount): ChannelAccountSnapshot => ({
      accountId: account.accountId,
      name: `Moltboard (${account.apiUrl})`,
      enabled: account.enabled,
      configured: account.configured,
      baseUrl: account.apiUrl,
    }),
  },

  // Messaging configuration - tells Clawdbot how to resolve targets
  messaging: {
    // Normalize target input (board IDs, "default", etc.)
    normalizeTarget: (target: string) => {
      const trimmed = target?.trim();
      if (!trimmed || trimmed === "default") return "default";
      return trimmed;
    },
    // Target resolver configuration
    targetResolver: {
      // Accept any target - board IDs, "default", etc.
      looksLikeId: (target: string) => {
        const trimmed = target?.trim();
        // Accept: board_xxx, default, or any non-empty string
        return Boolean(trimmed && (
          trimmed === "default" ||
          trimmed.startsWith("board_") ||
          /^[a-zA-Z0-9_-]+$/.test(trimmed)
        ));
      },
      hint: "<boardId|default>",
    },
    // Format target for display
    formatTargetDisplay: ({ target, display }: { target: string; display?: string }) => {
      if (display) return display;
      if (target === "default") return "Default Board";
      if (target.startsWith("board_")) return `Board ${target.slice(6, 14)}...`;
      return target;
    },
  },

  outbound: {
    deliveryMode: "direct",
    textChunkLimit: 10000,

    resolveTarget: ({ to }: { to?: string }) => {
      const target = to?.trim() || "default";
      return { ok: true, to: target };
    },

    sendText: async ({
      cfg,
      to,
      text,
      accountId,
      replyToId,
      context,
    }: {
      cfg: ClawdbotConfig;
      to?: string;
      text: string;
      accountId: string;
      replyToId?: string;
      context?: unknown;
    }) => {
      try {
        const account = resolveMoltboardAccount(cfg, accountId);
        
        if (!account.configured) {
          return {
            ok: false,
            error: new Error("Moltboard channel not configured"),
          };
        }

        const boardId = to || account.defaultBoardId || "default";
        const inboundContext = context as { taskId?: string; taskTitle?: string; boardId?: string } | undefined;

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

    // Media sending - Moltboard doesn't support media yet, but we need this for outbound to work
    sendMedia: async ({
      cfg,
      to,
      text,
      accountId,
      replyToId,
    }: {
      cfg: ClawdbotConfig;
      to?: string;
      text?: string;
      mediaUrl?: string;
      accountId: string;
      replyToId?: string;
    }) => {
      // Moltboard doesn't support media - just send the text/caption if provided
      if (text) {
        const account = resolveMoltboardAccount(cfg, accountId);
        if (!account.configured) {
          return { ok: false, error: new Error("Moltboard channel not configured") };
        }
        const boardId = to || account.defaultBoardId || "default";
        const result = await sendMessage(account, {
          content: text + "\n\n[Media attachments not supported]",
          boardId,
          replyTo: replyToId ?? undefined,
        });
        return { ok: true, messageId: result.id, channel: "moltboard" };
      }
      return {
        ok: false,
        error: new Error("Moltboard does not support media attachments"),
      };
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

    buildChannelSummary: ({ snapshot }: { snapshot: ChannelAccountSnapshot & Record<string, unknown> }) => ({
      configured: snapshot.configured ?? false,
      baseUrl: snapshot.baseUrl ?? null,
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      probe: snapshot.probe,
      lastProbeAt: snapshot.lastProbeAt ?? null,
    }),

    probeAccount: async ({ account, timeoutMs }: { account: ResolvedMoltboardAccount; timeoutMs?: number }) => {
      return probeMoltboard(account, { timeoutMs });
    },

    buildAccountSnapshot: ({ account, runtime, probe }: { 
      account: ResolvedMoltboardAccount; 
      runtime?: Record<string, unknown>; 
      probe?: unknown 
    }) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startAccount: async (ctx: any) => {
      const { account, abortSignal, cfg } = ctx;

      if (!account.configured) {
        ctx.log?.warn(`[moltboard:${account.accountId}] Not configured, skipping.`);
        return () => {};
      }

      // Load internal Clawdbot dispatch API
      let dispatchInboundMessageWithDispatcher: any = null;
      
      for (const clawdbotPath of CLAWDBOT_PATHS) {
        try {
          const clawdbotRequire = createRequire(clawdbotPath);
          const dispatchModule = clawdbotRequire("./dist/auto-reply/dispatch.js");
          dispatchInboundMessageWithDispatcher = dispatchModule.dispatchInboundMessageWithDispatcher;
          ctx.log?.info(`[moltboard] Loaded dispatch API from ${clawdbotPath}`);
          break;
        } catch (err) {
          // Try next path
        }
      }

      if (!dispatchInboundMessageWithDispatcher) {
        ctx.log?.error(`[moltboard] Could not load Clawdbot dispatch API`);
        ctx.log?.error(`[moltboard] Tried paths: ${CLAWDBOT_PATHS.join(", ")}`);
        ctx.log?.error(`[moltboard] Inbound messages will NOT be routed to agent.`);
      }

      ctx.log?.info(`[moltboard:${account.accountId}] Starting poller (interval=${account.pollIntervalMs}ms)...`);

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
            // Skip bot messages
            if (msg.author === "moltbot" || msg.author === "api") continue;
            
            // Skip already-processing messages (avoid re-processing on restart)
            if (msg.status === "processing") {
              const msgAge = Date.now() - new Date(msg.updatedAt || msg.createdAt).getTime();
              if (msgAge < 5 * 60 * 1000) continue; // Skip if < 5 min old
              ctx.log?.info(`[moltboard] Retrying stale message: ${msg.id}`);
            }

            ctx.log?.info(`[moltboard:${account.accountId}] Inbound from ${msg.author}: ${msg.content.slice(0, 50)}...`);

            // Mark as processing
            try {
              await updateMessageStatus(account, msg.id, "processing", { signal: abortSignal });
            } catch (err) {
              ctx.log?.warn(`[moltboard] Failed to update status: ${err}`);
            }

            // Build context
            let taskContext: string | undefined;
            let boardContext: string | undefined;
            
            if (msg.taskId) {
              try {
                const task = await fetchTaskDetails(account, msg.taskId, { signal: abortSignal });
                if (task) {
                  const parts: string[] = [`Task: "${task.title}" (${task.id})`];
                  if (task.description) parts.push(`Description: ${task.description}`);
                  if (task.priority) parts.push(`Priority: ${task.priority.toUpperCase()}`);
                  if (task.labels?.length) parts.push(`Labels: ${task.labels.join(", ")}`);
                  if (task.dueDate) parts.push(`Due: ${new Date(task.dueDate).toLocaleDateString()}`);
                  taskContext = parts.join("\n");
                }
              } catch (err) {
                ctx.log?.warn(`[moltboard] Failed to fetch task context: ${err}`);
              }
            }

            const boardId = msg.boardId || account.defaultBoardId || "general";
            try {
              const board = await fetchBoardDetails(account, boardId, { signal: abortSignal });
              if (board) {
                boardContext = `Board: "${board.name}"${board.description ? ` - ${board.description}` : ""}`;
              }
            } catch {
              // Non-critical
            }

            const contextParts: string[] = [];
            if (boardContext) contextParts.push(boardContext);
            if (taskContext) contextParts.push(taskContext);
            const systemHint = contextParts.length > 0 
              ? `Moltboard Context:\n${contextParts.join("\n\n")}`
              : undefined;

            // Dispatch to agent
            if (dispatchInboundMessageWithDispatcher && cfg) {
              try {
                // Build inbound context matching what built-in channels use
                const inboundCtx = {
                  channel: "moltboard" as const,
                  accountId: account.accountId,
                  chatType: "direct" as const,
                  from: msg.author,
                  chatId: boardId,
                  senderId: msg.author,
                  senderName: msg.author === "mike" ? "Mike" : msg.author,
                  messageId: msg.id,
                  body: msg.content,
                  timestamp: new Date(msg.createdAt),
                  replyContext: msg.replyTo ? { id: msg.replyTo } : undefined,
                  envelope: systemHint,
                  moltboardContext: {
                    boardId,
                    taskId: msg.taskId,
                    taskTitle: msg.taskTitle,
                    replyTo: msg.replyTo,
                  },
                };

                // Create reply function that sends back to Moltboard
                const sendReply = async (text: string) => {
                  ctx.log?.info(`[moltboard] sendReply called with ${text.length} chars`);
                  try {
                    const result = await sendMessage(account, {
                      content: text,
                      boardId,
                      taskId: msg.taskId,
                      taskTitle: msg.taskTitle,
                      replyTo: msg.id,
                    });
                    ctx.log?.info(`[moltboard] Sent reply: ${result.id}`);
                    
                    // Mark original as complete after successful reply
                    await updateMessageStatus(account, msg.id, "complete", { signal: abortSignal });
                    ctx.setStatus({ lastOutboundAt: Date.now() });
                  } catch (err) {
                    ctx.log?.error(`[moltboard] Failed to send reply: ${err}`);
                  }
                };

                ctx.log?.info(`[moltboard] Calling dispatchInboundMessageWithDispatcher...`);
                const dispatchResult = await dispatchInboundMessageWithDispatcher({
                  ctx: inboundCtx,
                  cfg,  // Use ctx.cfg directly instead of loading config
                  dispatcherOptions: {
                    send: sendReply,
                    channel: "moltboard",
                  },
                });
                ctx.log?.info(`[moltboard] Dispatch returned: ${JSON.stringify(dispatchResult)?.slice(0, 200)}`);

                ctx.setStatus({ lastInboundAt: Date.now() });
                ctx.log?.info(`[moltboard] Dispatched message ${msg.id} to agent`);
              } catch (err) {
                ctx.log?.error(`[moltboard] Failed to dispatch: ${err}`);
                // Reset to pending so it can be retried
                try {
                  await updateMessageStatus(account, msg.id, "pending" as any, { signal: abortSignal });
                } catch {
                  // Ignore
                }
              }
            } else {
              ctx.log?.warn(`[moltboard] Dispatch API not available - message ${msg.id} not routed`);
              // Mark as complete anyway to avoid infinite retry
              await updateMessageStatus(account, msg.id, "complete", { signal: abortSignal });
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
            ctx.log?.info(`[moltboard:${account.accountId}] Poll #${pollCount}, cursor=${lastTimestamp ?? "null"}`);
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

      return () => {
        clearInterval(intervalId);
        ctx.setStatus({ running: false, lastStopAt: Date.now() });
        ctx.log?.info(`[moltboard:${account.accountId}] Stopped.`);
      };
    },
  },
};
