/**
 * Agent - The AI Teammate
 *
 * Export all agent features for easy importing.
 */

// Core
export { AgentCore, MoltbotAgent } from './core/agent';
export type {
  AgentContext,
  MoltbotContext,
  UserPatterns,
  BoardAnalysis,
  StuckTask,
  Activity,
} from './core/agent';

// Features - Daily Briefing
export {
  generateDailyBriefings,
  generateBriefingForBoard,
} from './features/briefing';
export type { BriefingResult, BriefingContent } from './features/briefing';

// Features - Stuck Task Detection
export {
  detectAndAlertStuckTasks,
  getStuckTasksSummary,
} from './features/stuck-detector';
export type { StuckDetectionResult } from './features/stuck-detector';

// Features - Natural Language Task Creation
export {
  parseTaskIntent,
  formatTaskConfirmation,
} from './features/nlp-parser';
export type { TaskIntent, ParseResult } from './features/nlp-parser';

export {
  processMessageForTask,
  handleChatMessage,
} from './features/task-creator';
export type { TaskCreationResult } from './features/task-creator';
