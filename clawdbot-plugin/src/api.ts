/**
 * Moltboard API Client
 */

import type {
  ResolvedMoltboardAccount,
  MoltboardChatResponse,
  MoltboardMessage,
  MoltboardSendResult,
} from "./types.js";

const DEFAULT_TIMEOUT = 10000;

interface FetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  opts: FetchOptions = {}
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const controller = new AbortController();
  
  // Combine with external signal if provided
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller.abort());
  }
  
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch pending messages from Moltboard API
 */
export async function fetchPendingMessages(
  account: ResolvedMoltboardAccount,
  since?: string | null,
  opts: FetchOptions = {}
): Promise<MoltboardChatResponse> {
  const url = new URL(`${account.apiUrl}/api/chat`);
  url.searchParams.set("pendingOnly", "true");
  if (since) {
    url.searchParams.set("since", since);
  }

  const response = await fetchWithTimeout(
    url.toString(),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": account.apiKey,
      },
    },
    opts
  );

  if (!response.ok) {
    throw new Error(`Moltboard API error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as MoltboardChatResponse;
}

/**
 * Send a message to Moltboard
 */
export async function sendMessage(
  account: ResolvedMoltboardAccount,
  params: {
    content: string;
    boardId?: string;
    taskId?: string;
    taskTitle?: string;
    replyTo?: string;
  },
  opts: FetchOptions = {}
): Promise<MoltboardSendResult> {
  const response = await fetchWithTimeout(
    `${account.apiUrl}/api/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": account.apiKey,
      },
      body: JSON.stringify({
        content: params.content,
        boardId: params.boardId || account.defaultBoardId,
        taskId: params.taskId,
        taskTitle: params.taskTitle,
        replyTo: params.replyTo,
      }),
    },
    opts
  );

  if (!response.ok) {
    throw new Error(`Moltboard send error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as MoltboardSendResult;
}

/**
 * Update message status
 */
export async function updateMessageStatus(
  account: ResolvedMoltboardAccount,
  messageId: string,
  status: "processing" | "complete",
  opts: FetchOptions = {}
): Promise<void> {
  const response = await fetchWithTimeout(
    `${account.apiUrl}/api/chat/${messageId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": account.apiKey,
      },
      body: JSON.stringify({ status }),
    },
    opts
  );

  if (!response.ok) {
    throw new Error(`Moltboard status update error: ${response.status}`);
  }
}

/**
 * Fetch task details for context injection
 */
export async function fetchTaskDetails(
  account: ResolvedMoltboardAccount,
  taskId: string,
  opts: FetchOptions = {}
): Promise<{
  id: string;
  title: string;
  description?: string;
  labels?: string[];
  priority?: string;
  dueDate?: string;
  assigneeId?: string;
  checklist?: Array<{ text: string; completed: boolean }>;
  columnId?: string;
} | null> {
  try {
    const response = await fetchWithTimeout(
      `${account.apiUrl}/api/tasks/${taskId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": account.apiKey,
        },
      },
      opts
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as {
      id: string;
      title: string;
      description?: string;
      labels?: string[];
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
      checklist?: Array<{ text: string; completed: boolean }>;
      columnId?: string;
    };
  } catch {
    return null;
  }
}

/**
 * Fetch board details
 */
export async function fetchBoardDetails(
  account: ResolvedMoltboardAccount,
  boardId: string,
  opts: FetchOptions = {}
): Promise<{ id: string; name: string; description?: string } | null> {
  try {
    const response = await fetchWithTimeout(
      `${account.apiUrl}/api/boards/${boardId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": account.apiKey,
        },
      },
      opts
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as { id: string; name: string; description?: string };
  } catch {
    return null;
  }
}

/**
 * Execute a natural language command
 */
export async function executeCommand(
  account: ResolvedMoltboardAccount,
  text: string,
  boardId?: string,
  opts: FetchOptions = {}
): Promise<{
  success: boolean;
  command: { type: string; description: string; confidence: number };
  result?: { action: string; message: string };
  error?: string;
}> {
  const response = await fetchWithTimeout(
    `${account.apiUrl}/api/commands`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": account.apiKey,
      },
      body: JSON.stringify({
        text,
        boardId: boardId || account.defaultBoardId,
      }),
    },
    opts
  );

  const data = await response.json();
  
  if (!response.ok && !data.command) {
    throw new Error(data.error || `Command API error: ${response.status}`);
  }

  return data;
}

/**
 * Check if text looks like a command
 */
export function looksLikeCommand(text: string): boolean {
  const lowered = text.toLowerCase().trim();
  const commandStarters = [
    'create', 'add', 'new', 'task:',
    'move', 'set', 'change',
    'complete', 'finish', 'close', 'mark',
    'archive',
    'show', 'list', 'what', 'find', 'search',
    'priority',
  ];
  
  return commandStarters.some(starter => lowered.startsWith(starter));
}

/**
 * Probe Moltboard API health
 */
export async function probeMoltboard(
  account: ResolvedMoltboardAccount,
  opts: FetchOptions = {}
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetchWithTimeout(
      `${account.apiUrl}/api/chat?limit=1`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": account.apiKey,
        },
      },
      { ...opts, timeoutMs: opts.timeoutMs ?? 5000 }
    );

    if (response.ok) {
      return { ok: true };
    }
    return { ok: false, error: `HTTP ${response.status}` };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
