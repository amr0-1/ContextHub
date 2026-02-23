import type { Message } from './messages';
import type { Model } from './models';

/** Token usage metadata for a conversation */
export interface UsageMetadata {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalUsedTokens: number;
  remainingTokens: number;
  contextLimit: number;
}

/** Context window health level */
export type ContextLevel = 'safe' | 'caution' | 'critical' | 'block';

/** Derived context window status */
export interface ContextStatus {
  used: number;
  remaining: number;
  percent: number;
  level: ContextLevel;
}

/** A full conversation */
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: Model;
  usage: UsageMetadata;
  createdAt: number;
  updatedAt: number;
}

/** Unified LLM response (legacy — retained for backward compatibility) */
export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/** Standardized provider-agnostic response (Phase 8) */
export interface UnifiedResponse {
  reply: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
