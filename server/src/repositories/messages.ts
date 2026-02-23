import 'dotenv/config';
import db from '../db/connection.js';
import { randomUUID } from 'node:crypto';

/* ------------------------------------------------------------------ */
/*  Row types                                                          */
/* ------------------------------------------------------------------ */

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  prompt_tokens: number;
  completion_tokens: number;
  timestamp: number;
}

export interface SaveMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface TokenUsageInput {
  promptTokens: number;
  completionTokens: number;
}

/* ------------------------------------------------------------------ */
/*  Prepared statements                                                */
/* ------------------------------------------------------------------ */

const insertStmt = db.prepare<{
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  prompt_tokens: number;
  completion_tokens: number;
  timestamp: number;
}>(`
  INSERT INTO messages (id, conversation_id, role, content, prompt_tokens, completion_tokens, timestamp)
  VALUES (@id, @conversation_id, @role, @content, @prompt_tokens, @completion_tokens, @timestamp)
`);

const selectByConversationStmt = db.prepare<{ conversation_id: string }>(`
  SELECT id, conversation_id, role, content, prompt_tokens, completion_tokens, timestamp
  FROM messages
  WHERE conversation_id = @conversation_id
  ORDER BY timestamp ASC
`);

const updateTokensStmt = db.prepare<{
  id: string;
  prompt_tokens: number;
  completion_tokens: number;
}>(`
  UPDATE messages
  SET prompt_tokens = @prompt_tokens, completion_tokens = @completion_tokens
  WHERE id = @id
`);

const addTokensToConversation = db.prepare<{
  id: string;
  tokens: number;
  updated_at: number;
}>(`
  UPDATE conversations
  SET total_tokens_used = total_tokens_used + @tokens,
      updated_at = @updated_at
  WHERE id = @id
`);

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Save a message to a conversation.
 *
 * Token usage is optional — user messages may not have usage data yet;
 * assistant messages will typically include it from the LLM response.
 */
export function saveMessage(
  conversationId: string,
  messageData: SaveMessageInput,
  tokenUsage?: TokenUsageInput,
): MessageRow {
  const now = Date.now();
  const promptTokens = tokenUsage?.promptTokens ?? 0;
  const completionTokens = tokenUsage?.completionTokens ?? 0;

  const row: MessageRow = {
    id: randomUUID(),
    conversation_id: conversationId,
    role: messageData.role,
    content: messageData.content,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    timestamp: now,
  };

  const totalTokens = promptTokens + completionTokens;

  // Use a transaction to save message + update conversation atomically
  const saveTransaction = db.transaction(() => {
    insertStmt.run({
      id: row.id,
      conversation_id: row.conversation_id,
      role: row.role,
      content: row.content,
      prompt_tokens: row.prompt_tokens,
      completion_tokens: row.completion_tokens,
      timestamp: row.timestamp,
    });

    if (totalTokens > 0) {
      addTokensToConversation.run({
        id: conversationId,
        tokens: totalTokens,
        updated_at: now,
      });
    }
  });

  saveTransaction();

  return row;
}

/**
 * Retrieve all messages for a conversation, ordered by timestamp.
 */
export function getConversationMessages(conversationId: string): MessageRow[] {
  return selectByConversationStmt.all({ conversation_id: conversationId }) as MessageRow[];
}

/**
 * Update token usage for an existing message (e.g., after LLM response returns usage).
 */
export function updateMessageTokens(
  messageId: string,
  promptTokens: number,
  completionTokens: number,
): void {
  updateTokensStmt.run({
    id: messageId,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
  });
}
