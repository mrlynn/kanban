/**
 * Ambient type declarations for clawdbot/plugin-sdk.
 * Used when clawdbot is provided as a peer (e.g. at runtime by the host);
 * types are not shipped with the plugin.
 */
declare module "clawdbot/plugin-sdk" {
  export interface ClawdbotConfig {
    channels?: Record<string, unknown>;
  }

  export interface ClawdbotPluginApi {
    registerChannel(options: { plugin: ChannelPlugin<unknown> }): void;
    logger: { info(message: string): void };
  }

  export interface ChannelAccountSnapshot {
    accountId: string;
    name: string;
    enabled: boolean;
    configured: boolean;
    baseUrl?: string;
    [key: string]: unknown;
  }

  export interface ChannelPlugin<TAccount = unknown> {
    id: string;
    meta: Record<string, unknown>;
    capabilities?: Record<string, unknown>;
    reload?: { configPrefixes: string[] };
    config: Record<string, unknown>;
    [key: string]: unknown;
  }
}
