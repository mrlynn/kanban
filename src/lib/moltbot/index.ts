/**
 * Moltbot - The AI Teammate
 *
 * Export all Moltbot features for easy importing.
 */

// Core
export { MoltbotAgent } from './core/agent';
export type {
  MoltbotContext,
  UserPatterns,
  BoardAnalysis,
  StuckTask,
  Activity,
} from './core/agent';

// Features
export {
  generateDailyBriefings,
  generateBriefingForBoard,
} from './features/briefing';
export type { BriefingResult, BriefingContent } from './features/briefing';

export {
  detectAndAlertStuckTasks,
  getStuckTasksSummary,
} from './features/stuck-detector';
export type { StuckDetectionResult } from './features/stuck-detector';
