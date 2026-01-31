/**
 * Moltboard Channel Plugin for Clawdbot
 * 
 * Enables Moltboard as a native messaging channel alongside
 * WhatsApp, Telegram, Discord, etc.
 * 
 * Configuration:
 * 
 * ```yaml
 * channels:
 *   moltboard:
 *     enabled: true
 *     apiUrl: "https://moltboard.app"
 *     apiKey: "your-api-key"
 *     pollIntervalMs: 5000
 *     defaultBoardId: "board_xxx"
 * ```
 */

import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";
import { moltboardPlugin } from "./src/channel.js";

const plugin = {
  id: "moltboard",
  name: "Moltboard",
  description: "Moltboard task management channel 🔥",

  register(api: ClawdbotPluginApi) {
    // Register the channel plugin
    api.registerChannel({ plugin: moltboardPlugin });
    
    api.logger.info("[moltboard] Channel plugin registered");
    api.logger.info("[moltboard] Configure at: channels.moltboard.{apiUrl, apiKey}");
  },
};

export default plugin;
