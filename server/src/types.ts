/**
 * Shared type definitions for the ContextHub server (Phase 8.5).
 *
 * Kept intentionally minimal — only the shapes that cross the boundary
 * between the chat route and the provider handlers.
 */

/** A single chat message received from the frontend. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  timestamp: number;
}

/** Standardized response returned to the frontend (mirrors frontend UnifiedResponse). */
export interface UnifiedResponse {
  reply: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
