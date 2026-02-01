/**
 * AI Command Parser for Moltboard
 * 
 * Parses natural language commands for task management.
 * Supports: create, update, move, query, archive, list
 */

import { Priority } from '@/types/kanban';

export type CommandType = 
  | 'create'
  | 'update'
  | 'move'
  | 'query'
  | 'list'
  | 'archive'
  | 'complete'
  | 'priority'
  | 'assign'
  | 'due'
  | 'unknown';

export interface ParsedCommand {
  type: CommandType;
  confidence: number; // 0-1
  taskRef?: string; // Task title, ID, or partial match
  params: {
    title?: string;
    description?: string;
    priority?: Priority;
    dueDate?: Date;
    column?: string; // "done", "in progress", "todo", etc.
    labels?: string[];
    assignee?: string;
    query?: string; // For search/list commands
    boardId?: string;
  };
  raw: string;
}

// Priority keywords
const PRIORITY_PATTERNS: Record<string, Priority> = {
  'critical': 'p0',
  'urgent': 'p0',
  'p0': 'p0',
  'high': 'p1',
  'important': 'p1',
  'p1': 'p1',
  'medium': 'p2',
  'normal': 'p2',
  'p2': 'p2',
  'low': 'p3',
  'minor': 'p3',
  'p3': 'p3',
};

// Column name patterns
const COLUMN_PATTERNS: Record<string, string[]> = {
  'todo': ['todo', 'to do', 'to-do', 'backlog', 'new'],
  'in_progress': ['in progress', 'doing', 'working on', 'started'],
  'review': ['review', 'testing', 'qa', 'needs review'],
  'done': ['done', 'complete', 'completed', 'finished', 'shipped'],
};

// Date parsing patterns
const DATE_PATTERNS: { pattern: RegExp; handler: (match: RegExpMatchArray) => Date }[] = [
  {
    pattern: /today/i,
    handler: () => {
      const d = new Date();
      d.setHours(23, 59, 59, 999);
      return d;
    },
  },
  {
    pattern: /tomorrow/i,
    handler: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 59, 999);
      return d;
    },
  },
  {
    pattern: /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    handler: (match) => {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(match[1].toLowerCase());
      const d = new Date();
      const currentDay = d.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      d.setDate(d.getDate() + daysToAdd);
      d.setHours(23, 59, 59, 999);
      return d;
    },
  },
  {
    pattern: /in\s+(\d+)\s+days?/i,
    handler: (match) => {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(match[1], 10));
      d.setHours(23, 59, 59, 999);
      return d;
    },
  },
  {
    pattern: /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/,
    handler: (match) => {
      const month = parseInt(match[1], 10) - 1;
      const day = parseInt(match[2], 10);
      const year = match[3] ? (match[3].length === 2 ? 2000 + parseInt(match[3], 10) : parseInt(match[3], 10)) : new Date().getFullYear();
      return new Date(year, month, day, 23, 59, 59, 999);
    },
  },
  {
    pattern: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i,
    handler: (match) => {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const month = months.indexOf(match[1].toLowerCase().slice(0, 3));
      const day = parseInt(match[2], 10);
      const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
      return new Date(year, month, day, 23, 59, 59, 999);
    },
  },
];

// Command patterns
interface CommandPattern {
  patterns: RegExp[];
  type: CommandType;
  extractor: (text: string, match: RegExpMatchArray) => Partial<ParsedCommand['params']> & { taskRef?: string };
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // CREATE: "create a task: ...", "add task ...", "new task: ..."
  {
    patterns: [
      /^(?:create|add|new)\s+(?:a\s+)?task[:\s]+(.+)/i,
      /^(?:create|add|new)[:\s]+(.+)/i,
      /^task[:\s]+(.+)/i,
    ],
    type: 'create',
    extractor: (text, match) => {
      const content = match[1].trim();
      const result: Partial<ParsedCommand['params']> = {};
      
      // Extract title (everything before priority/due/etc.)
      let title = content;
      
      // Extract priority
      for (const [keyword, priority] of Object.entries(PRIORITY_PATTERNS)) {
        const prioRegex = new RegExp(`\\b(?:priority\\s+)?${keyword}\\b`, 'i');
        if (prioRegex.test(content)) {
          result.priority = priority;
          title = title.replace(prioRegex, '').trim();
          break;
        }
      }
      
      // Extract due date
      for (const { pattern, handler } of DATE_PATTERNS) {
        const dueRegex = new RegExp(`(?:due\\s+)?${pattern.source}`, 'i');
        const dateMatch = content.match(dueRegex);
        if (dateMatch) {
          result.dueDate = handler(dateMatch);
          title = title.replace(dueRegex, '').trim();
          break;
        }
      }
      
      // Clean up title
      title = title.replace(/,\s*$/, '').replace(/\s+/g, ' ').trim();
      result.title = title;
      
      return result;
    },
  },
  
  // MOVE: "move 'task name' to done", "move task X to in progress"
  {
    patterns: [
      /^move\s+['"]?(.+?)['"]?\s+to\s+(.+)/i,
      /^(?:set|change)\s+['"]?(.+?)['"]?\s+(?:status\s+)?to\s+(.+)/i,
    ],
    type: 'move',
    extractor: (text, match) => {
      const taskRef = match[1].trim();
      const targetColumn = match[2].trim().toLowerCase();
      
      let column: string | undefined;
      for (const [colId, patterns] of Object.entries(COLUMN_PATTERNS)) {
        if (patterns.some(p => targetColumn.includes(p))) {
          column = colId;
          break;
        }
      }
      
      return { taskRef, column: column || targetColumn };
    },
  },
  
  // COMPLETE: "complete 'task name'", "mark X as done", "finish task Y"
  {
    patterns: [
      /^(?:complete|finish|close)\s+['"]?(.+?)['"]?$/i,
      /^mark\s+['"]?(.+?)['"]?\s+(?:as\s+)?(?:done|complete|finished)/i,
    ],
    type: 'complete',
    extractor: (text, match) => {
      return { taskRef: match[1].trim(), column: 'done' };
    },
  },
  
  // PRIORITY: "set priority of X to high", "make X critical"
  {
    patterns: [
      /^(?:set|change)\s+(?:the\s+)?priority\s+(?:of\s+)?['"]?(.+?)['"]?\s+to\s+(\w+)/i,
      /^make\s+['"]?(.+?)['"]?\s+(critical|urgent|high|medium|low|p[0-3])/i,
    ],
    type: 'priority',
    extractor: (text, match) => {
      const taskRef = match[1].trim();
      const priorityWord = match[2].toLowerCase();
      const priority = PRIORITY_PATTERNS[priorityWord];
      return { taskRef, priority };
    },
  },
  
  // DUE: "set due date of X to tomorrow", "X due Friday"
  {
    patterns: [
      /^(?:set|change)\s+(?:the\s+)?due\s*(?:date)?\s+(?:of\s+)?['"]?(.+?)['"]?\s+to\s+(.+)/i,
      /^['"]?(.+?)['"]?\s+due\s+(.+)/i,
    ],
    type: 'due',
    extractor: (text, match) => {
      const taskRef = match[1].trim();
      const dateText = match[2].trim();
      
      for (const { pattern, handler } of DATE_PATTERNS) {
        const dateMatch = dateText.match(pattern);
        if (dateMatch) {
          return { taskRef, dueDate: handler(dateMatch) };
        }
      }
      
      return { taskRef };
    },
  },
  
  // ARCHIVE: "archive 'task name'", "archive all done tasks"
  {
    patterns: [
      /^archive\s+['"]?(.+?)['"]?$/i,
      /^archive\s+all\s+(?:done|completed)\s+tasks?/i,
    ],
    type: 'archive',
    extractor: (text, match) => {
      if (text.toLowerCase().includes('all done') || text.toLowerCase().includes('all completed')) {
        return { query: 'all_done' };
      }
      return { taskRef: match[1]?.trim() };
    },
  },
  
  // QUERY/LIST: "show me all p1 tasks", "what's overdue", "list tasks"
  {
    patterns: [
      /^(?:show|list|what(?:'s|s)?|find|search)\s+(?:me\s+)?(?:all\s+)?(.+?)(?:\s+tasks?)?$/i,
      /^(?:what's|whats)\s+(.+)/i,
    ],
    type: 'query',
    extractor: (text, match) => {
      const queryText = match[1].trim().toLowerCase();
      
      // Check for specific query types
      if (queryText.includes('overdue')) {
        return { query: 'overdue' };
      }
      if (queryText.includes('stuck')) {
        return { query: 'stuck' };
      }
      if (queryText.includes('in progress') || queryText.includes('doing')) {
        return { query: 'in_progress' };
      }
      if (queryText.includes('todo') || queryText.includes('to do')) {
        return { query: 'todo' };
      }
      
      // Check for priority queries
      for (const [keyword, priority] of Object.entries(PRIORITY_PATTERNS)) {
        if (queryText.includes(keyword)) {
          return { query: `priority:${priority}` };
        }
      }
      
      return { query: queryText };
    },
  },
  
  // LIST: "list tasks", "show board", "what's on my plate"
  {
    patterns: [
      /^list\s*(?:all\s+)?tasks?$/i,
      /^show\s+(?:the\s+)?board$/i,
      /^what(?:'s|s)?\s+on\s+my\s+plate/i,
    ],
    type: 'list',
    extractor: () => ({ query: 'all' }),
  },
];

/**
 * Parse a natural language command
 */
export function parseCommand(text: string): ParsedCommand {
  const trimmed = text.trim();
  
  for (const { patterns, type, extractor } of COMMAND_PATTERNS) {
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const extracted = extractor(trimmed, match);
        return {
          type,
          confidence: 0.9, // High confidence for explicit pattern match
          taskRef: extracted.taskRef,
          params: {
            title: extracted.title,
            description: extracted.description,
            priority: extracted.priority,
            dueDate: extracted.dueDate,
            column: extracted.column,
            labels: extracted.labels,
            assignee: extracted.assignee,
            query: extracted.query,
            boardId: extracted.boardId,
          },
          raw: text,
        };
      }
    }
  }
  
  // No pattern matched - return unknown
  return {
    type: 'unknown',
    confidence: 0,
    params: {},
    raw: text,
  };
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
 * Generate a human-readable description of the command
 */
export function describeCommand(cmd: ParsedCommand): string {
  switch (cmd.type) {
    case 'create':
      let createDesc = `Create task: "${cmd.params.title}"`;
      if (cmd.params.priority) createDesc += ` (${cmd.params.priority.toUpperCase()})`;
      if (cmd.params.dueDate) createDesc += ` due ${cmd.params.dueDate.toLocaleDateString()}`;
      return createDesc;
    
    case 'move':
      return `Move "${cmd.taskRef}" to ${cmd.params.column}`;
    
    case 'complete':
      return `Complete "${cmd.taskRef}"`;
    
    case 'priority':
      return `Set priority of "${cmd.taskRef}" to ${cmd.params.priority?.toUpperCase()}`;
    
    case 'due':
      return `Set due date of "${cmd.taskRef}" to ${cmd.params.dueDate?.toLocaleDateString()}`;
    
    case 'archive':
      if (cmd.params.query === 'all_done') return 'Archive all completed tasks';
      return `Archive "${cmd.taskRef}"`;
    
    case 'query':
      return `Search: ${cmd.params.query}`;
    
    case 'list':
      return 'List all tasks';
    
    default:
      return `Unknown command: ${cmd.raw}`;
  }
}
