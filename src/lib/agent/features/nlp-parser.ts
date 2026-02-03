/**
 * Natural Language Parser
 *
 * Detects task creation intents from chat messages.
 * This enables "conversational task management" - create tasks by talking.
 *
 * Examples:
 * - "Remind me to follow up with John tomorrow"
 * - "Draft a blog post about the new feature"
 * - "We should add dark mode eventually"
 * - "Create a task to review the PR"
 */

export interface TaskIntent {
  action: 'create' | 'update' | 'query' | 'none';
  confidence: 'high' | 'medium' | 'low';
  title?: string;
  dueDate?: Date;
  priority?: 'p0' | 'p1' | 'p2' | 'p3';
  labels?: string[];
  context?: string;
}

export interface ParseResult {
  intent: TaskIntent;
  originalMessage: string;
  explanation?: string;
}

/**
 * Parse a message for task creation intent
 */
export function parseTaskIntent(message: string): ParseResult {
  const lowerMessage = message.toLowerCase().trim();
  const originalMessage = message;

  // Skip very short messages
  if (lowerMessage.length < 5) {
    return {
      intent: { action: 'none', confidence: 'high' },
      originalMessage,
    };
  }

  // Skip greetings and small talk
  if (isSmallTalk(lowerMessage)) {
    return {
      intent: { action: 'none', confidence: 'high' },
      originalMessage,
    };
  }

  // Pattern 1: Explicit task creation ("create task", "add task", "new task")
  const explicitMatch = matchExplicitTaskCreation(message);
  if (explicitMatch) {
    return {
      intent: { ...explicitMatch, confidence: 'high' },
      originalMessage,
      explanation: 'Explicit task creation request',
    };
  }

  // Pattern 2: Reminder pattern ("remind me to", "reminder:", "todo:")
  const reminderMatch = matchReminderPattern(message);
  if (reminderMatch) {
    return {
      intent: { ...reminderMatch, confidence: 'high' },
      originalMessage,
      explanation: 'Reminder pattern detected',
    };
  }

  // Pattern 3: Action verbs ("draft", "write", "build", "fix", "review")
  const actionMatch = matchActionVerb(message);
  if (actionMatch) {
    return {
      intent: { ...actionMatch, confidence: 'medium' },
      originalMessage,
      explanation: 'Action verb detected',
    };
  }

  // Pattern 4: Future intent ("we should", "need to", "have to", "gonna")
  const futureMatch = matchFutureIntent(message);
  if (futureMatch) {
    return {
      intent: { ...futureMatch, confidence: 'low' },
      originalMessage,
      explanation: 'Future intent detected (consider as task)',
    };
  }

  return {
    intent: { action: 'none', confidence: 'high' },
    originalMessage,
  };
}

/**
 * Check if message is small talk / greeting
 */
function isSmallTalk(message: string): boolean {
  const smallTalkPatterns = [
    /^(hi|hey|hello|yo|sup|what'?s up|good morning|good afternoon|good evening|gm|gn)\b/i,
    /^(thanks|thank you|thx|ty|cool|nice|great|awesome|ok|okay|k|sure|yep|yup|yeah|yes|no|nope)\b/i,
    /^(how are you|how's it going|what's new|how do you|can you|could you|would you)\b/i,
    /^(lol|haha|hehe|👋|🔥|👍)/i,
  ];

  return smallTalkPatterns.some((pattern) => pattern.test(message));
}

/**
 * Match explicit task creation patterns
 */
function matchExplicitTaskCreation(message: string): TaskIntent | null {
  const patterns = [
    /(?:create|add|new|make)\s+(?:a\s+)?task[:\s]+(.+)/i,
    /task[:\s]+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const { title, dueDate, priority } = extractDetails(match[1]);
      return {
        action: 'create',
        confidence: 'high',
        title,
        dueDate,
        priority,
        context: 'explicit',
      };
    }
  }

  return null;
}

/**
 * Match reminder patterns
 */
function matchReminderPattern(message: string): TaskIntent | null {
  const patterns = [
    /remind(?:er)?\s*(?:me\s+)?(?:to\s+)?(.+)/i,
    /todo[:\s]+(.+)/i,
    /don'?t\s+(?:let\s+me\s+)?forget\s+(?:to\s+)?(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const { title, dueDate, priority } = extractDetails(match[1]);
      return {
        action: 'create',
        confidence: 'high',
        title,
        dueDate,
        priority: priority || 'p1', // Reminders default to high priority
        labels: ['reminder'],
        context: 'reminder',
      };
    }
  }

  return null;
}

/**
 * Match action verb patterns
 */
function matchActionVerb(message: string): TaskIntent | null {
  const actionVerbs = [
    'draft',
    'write',
    'build',
    'fix',
    'review',
    'update',
    'refactor',
    'implement',
    'design',
    'test',
    'deploy',
    'document',
    'research',
    'analyze',
    'prepare',
    'schedule',
    'send',
    'call',
    'email',
    'meet',
  ];

  const lowerMessage = message.toLowerCase();

  for (const verb of actionVerbs) {
    // Match "verb something" at start of message
    const pattern = new RegExp(`^${verb}\\s+(.+)`, 'i');
    const match = message.match(pattern);

    if (match && match[1]) {
      const { title, dueDate, priority } = extractDetails(message);
      return {
        action: 'create',
        confidence: 'medium',
        title: capitalizeFirst(title),
        dueDate,
        priority,
        labels: [verb],
        context: 'action-verb',
      };
    }
  }

  return null;
}

/**
 * Match future intent patterns
 */
function matchFutureIntent(message: string): TaskIntent | null {
  const patterns = [
    /(?:we\s+)?should\s+(?:probably\s+)?(.+)/i,
    /(?:i\s+)?need\s+to\s+(.+)/i,
    /(?:i\s+)?have\s+to\s+(.+)/i,
    /(?:i'm\s+)?gonna\s+(.+)/i,
    /(?:i\s+)?want\s+to\s+(.+)/i,
    /let'?s\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const { title, dueDate, priority } = extractDetails(match[1]);
      return {
        action: 'create',
        confidence: 'low',
        title: capitalizeFirst(title),
        dueDate,
        priority: priority || 'p3', // Future intents default to low priority
        labels: ['idea'],
        context: 'future-intent',
      };
    }
  }

  return null;
}

/**
 * Extract details (due date, priority) from task text
 */
function extractDetails(text: string): {
  title: string;
  dueDate?: Date;
  priority?: 'p0' | 'p1' | 'p2' | 'p3';
} {
  let title = text.trim();
  let dueDate: Date | undefined;
  let priority: 'p0' | 'p1' | 'p2' | 'p3' | undefined;

  // Extract due date
  const dateResult = extractDueDate(title);
  title = dateResult.remainingText;
  dueDate = dateResult.dueDate;

  // Extract priority
  const priorityResult = extractPriority(title);
  title = priorityResult.remainingText;
  priority = priorityResult.priority;

  // Clean up title
  title = title
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '')
    .trim();

  return { title, dueDate, priority };
}

/**
 * Extract due date from text
 */
function extractDueDate(text: string): {
  remainingText: string;
  dueDate?: Date;
} {
  const now = new Date();
  let dueDate: Date | undefined;
  let remainingText = text;

  // "tomorrow"
  if (/\btomorrow\b/i.test(text)) {
    dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 1);
    dueDate.setHours(9, 0, 0, 0);
    remainingText = text.replace(/\btomorrow\b/i, '');
  }

  // "today"
  if (/\btoday\b/i.test(text)) {
    dueDate = new Date(now);
    dueDate.setHours(17, 0, 0, 0);
    remainingText = text.replace(/\btoday\b/i, '');
  }

  // "next week"
  if (/\bnext\s+week\b/i.test(text)) {
    dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);
    dueDate.setHours(9, 0, 0, 0);
    remainingText = text.replace(/\bnext\s+week\b/i, '');
  }

  // "in X days"
  const inDaysMatch = text.match(/\bin\s+(\d+)\s+days?\b/i);
  if (inDaysMatch) {
    dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + parseInt(inDaysMatch[1], 10));
    dueDate.setHours(9, 0, 0, 0);
    remainingText = text.replace(/\bin\s+\d+\s+days?\b/i, '');
  }

  // "by [day]" - next occurrence of day
  const byDayMatch = text.match(
    /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
  );
  if (byDayMatch) {
    const targetDay = getDayNumber(byDayMatch[1]);
    dueDate = getNextDayOfWeek(targetDay);
    remainingText = text.replace(
      /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      ''
    );
  }

  // "next [day]"
  const nextDayMatch = text.match(
    /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
  );
  if (nextDayMatch) {
    const targetDay = getDayNumber(nextDayMatch[1]);
    dueDate = getNextDayOfWeek(targetDay);
    remainingText = text.replace(
      /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      ''
    );
  }

  // Clean up "by" or "on" prefixes left behind
  remainingText = remainingText.replace(/\b(by|on)\s*$/i, '').trim();

  return { remainingText, dueDate };
}

/**
 * Extract priority from text
 */
function extractPriority(text: string): {
  remainingText: string;
  priority?: 'p0' | 'p1' | 'p2' | 'p3';
} {
  let priority: 'p0' | 'p1' | 'p2' | 'p3' | undefined;
  let remainingText = text;

  // Explicit priority markers
  if (/\b(urgent|critical|asap|p0)\b/i.test(text)) {
    priority = 'p0';
    remainingText = text.replace(/\b(urgent|critical|asap|p0)\b/i, '');
  } else if (/\b(high\s*priority|important|p1)\b/i.test(text)) {
    priority = 'p1';
    remainingText = text.replace(/\b(high\s*priority|important|p1)\b/i, '');
  } else if (/\b(low\s*priority|eventually|someday|p3)\b/i.test(text)) {
    priority = 'p3';
    remainingText = text.replace(/\b(low\s*priority|eventually|someday|p3)\b/i, '');
  }

  return { remainingText, priority };
}

/**
 * Get day number from name (0 = Sunday)
 */
function getDayNumber(dayName: string): number {
  const days: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return days[dayName.toLowerCase()] ?? 1;
}

/**
 * Get next occurrence of a day of week
 */
function getNextDayOfWeek(targetDay: number): Date {
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;

  if (daysUntil <= 0) {
    daysUntil += 7; // Next week
  }

  const result = new Date(now);
  result.setDate(result.getDate() + daysUntil);
  result.setHours(9, 0, 0, 0);
  return result;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format task confirmation message
 */
export function formatTaskConfirmation(
  title: string,
  dueDate?: Date,
  priority?: string,
  labels?: string[]
): string {
  let message = `✅ Created task: "**${title}**"`;

  const details: string[] = [];

  if (dueDate) {
    details.push(`Due: ${dueDate.toLocaleDateString()}`);
  }

  if (priority) {
    const priorityLabels: Record<string, string> = {
      p0: '🔴 Critical',
      p1: '🟠 High',
      p2: '🟡 Medium',
      p3: '⚪ Low',
    };
    details.push(priorityLabels[priority] || priority);
  }

  if (labels && labels.length > 0) {
    details.push(`Labels: ${labels.join(', ')}`);
  }

  if (details.length > 0) {
    message += `\n${details.join(' • ')}`;
  }

  return message;
}
