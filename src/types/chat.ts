import { ObjectId } from 'mongodb';
import { Actor } from './kanban';

export interface ChatMessage {
  _id?: ObjectId;
  id: string;
  boardId: string;
  author: Actor;
  content: string;
  // Optional context - if message relates to a specific task
  taskId?: string;
  taskTitle?: string;
  // For threading
  replyTo?: string;
  // Status for bot messages
  status?: 'pending' | 'processing' | 'complete';
  createdAt: Date;
  updatedAt?: Date;
}

export interface ChatSession {
  _id?: ObjectId;
  id: string;
  boardId: string;
  lastMessageAt: Date;
  messageCount: number;
  createdAt: Date;
}
