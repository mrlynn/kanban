/**
 * Agent Identity Configuration
 * 
 * Controls how the AI agent appears in the Moltboard UI.
 * Can be configured per-tenant or fall back to defaults.
 */
export interface AgentIdentity {
  name: string;
  shortName: string;
  avatar: string;
  color: string;
}

// Default agent identity — can be overridden by OpenClaw config or tenant settings
const DEFAULT_AGENT_IDENTITY: AgentIdentity = {
  name: 'AI Assistant',
  shortName: 'AI',
  avatar: '🤖',
  color: '#F97316',
};

let currentIdentity: AgentIdentity = { ...DEFAULT_AGENT_IDENTITY };

export function getAgentIdentity(): AgentIdentity {
  return currentIdentity;
}

export function setAgentIdentity(identity: Partial<AgentIdentity>): void {
  currentIdentity = { ...currentIdentity, ...identity };
}

/**
 * Actor key used in database records.
 * New records use 'agent'; legacy data may have 'moltbot'.
 * Queries should match BOTH for backwards compatibility.
 */
export const AGENT_ACTOR = 'agent' as const;

/**
 * Legacy actor key from before the rebrand.
 * Kept for backwards compatibility with existing MongoDB data.
 */
export const LEGACY_AGENT_ACTOR = 'moltbot' as const;

/**
 * Get the actor display config for a given actor key.
 * Handles both 'agent' (new) and 'moltbot' (legacy) keys.
 */
export function getActorDisplay(actor: string): { name: string; color: string; avatar?: string } {
  const identity = getAgentIdentity();
  
  switch (actor) {
    case 'agent':
    case 'moltbot': // Legacy alias — display same as 'agent'
      return { name: identity.name, color: identity.color, avatar: identity.avatar };
    case 'mike':
      return { name: 'Mike', color: '#3B82F6' };
    case 'system':
      return { name: 'System', color: '#6B7280', avatar: '⚙️' };
    case 'api':
      return { name: 'API', color: '#8B5CF6', avatar: '🔌' };
    default:
      return { name: actor, color: '#6B7280' };
  }
}

/**
 * Check if a given actor is the AI agent (handles legacy 'moltbot' key).
 */
export function isAgentActor(actor: string): boolean {
  return actor === 'agent' || actor === 'moltbot';
}
