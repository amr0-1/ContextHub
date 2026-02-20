import type { Message } from './messages';
import type { Model } from './models';

/** Token usage metadata for a conversation */
export interface UsageMetadata {
  totalInputTokens: number;
  totalOutputTokens: number;
  contextLimit: number;
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

/** Unified LLM response */
export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}
