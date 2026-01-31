/**
 * Moltboard Channel Types
 */

export interface MoltboardChannelConfig {
  enabled?: boolean;
  apiUrl?: string;
  apiKey?: string;
  pollIntervalMs?: number;
  defaultBoardId?: string;
  accounts?: Record<string, MoltboardAccountConfig>;
}

export interface MoltboardAccountConfig {
  enabled?: boolean;
  apiUrl?: string;
  apiKey?: string;
  pollIntervalMs?: number;
  defaultBoardId?: string;
}

export interface ResolvedMoltboardAccount {
  accountId: string;
  apiUrl: string;
  apiKey: string;
  pollIntervalMs: number;
  defaultBoardId?: string;
  enabled: boolean;
  configured: boolean;
}

export interface MoltboardMessage {
  id: string;
  author: "mike" | "moltbot" | "system" | "api";
  content: string;
  boardId?: string;
  taskId?: string;
  taskTitle?: string;
  replyTo?: string;
  status?: "pending" | "processing" | "complete";
  createdAt: string;
  updatedAt?: string;
}

export interface MoltboardChatResponse {
  messages: MoltboardMessage[];
  meta: {
    count: number;
    since: string | null;
    latestTimestamp: string | null;
  };
}

export interface MoltboardSendResult {
  id: string;
  author: string;
  content: string;
  status: string;
  createdAt: string;
}
