import 'dotenv/config';
import db from '../db/connection.js';
import { randomUUID } from 'node:crypto';

/* ------------------------------------------------------------------ */
/*  Row types (database shapes)                                        */
/* ------------------------------------------------------------------ */

export interface ConversationRow {
  id: string;
  title: string;
  model_id: string;
  created_at: number;
  updated_at: number;
  total_tokens_used: number;
}

/* ------------------------------------------------------------------ */
/*  Prepared statements                                                */
/* ------------------------------------------------------------------ */

const insertStmt = db.prepare<{
  id: string;
  title: string;
  model_id: string;
  created_at: number;
  updated_at: number;
}>(`
  INSERT INTO conversations (id, title, model_id, created_at, updated_at)
  VALUES (@id, @title, @model_id, @created_at, @updated_at)
`);

const selectAllStmt = db.prepare(`
  SELECT id, title, model_id, created_at, updated_at, total_tokens_used
  FROM conversations
  ORDER BY updated_at DESC
`);

const selectByIdStmt = db.prepare<{ id: string }>(`
  SELECT id, title, model_id, created_at, updated_at, total_tokens_used
  FROM conversations
  WHERE id = @id
`);

const updateTitleStmt = db.prepare<{ id: string; title: string; updated_at: number }>(`
  UPDATE conversations
  SET title = @title, updated_at = @updated_at
  WHERE id = @id
`);

const addTokensStmt = db.prepare<{ id: string; tokens: number; updated_at: number }>(`
  UPDATE conversations
  SET total_tokens_used = total_tokens_used + @tokens,
      updated_at = @updated_at
  WHERE id = @id
`);

const deleteStmt = db.prepare<{ id: string }>(`
  DELETE FROM conversations WHERE id = @id
`);

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Create a new conversation.
 * Returns the created conversation row.
 */
export function createConversation(modelId: string): ConversationRow {
  const now = Date.now();
  const row: ConversationRow = {
    id: randomUUID(),
    title: 'New Conversation',
    model_id: modelId,
    created_at: now,
    updated_at: now,
    total_tokens_used: 0,
  };

  insertStmt.run({
    id: row.id,
    title: row.title,
    model_id: row.model_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  return row;
}

/**
 * List all conversations, most recently updated first.
 */
export function getConversations(): ConversationRow[] {
  return selectAllStmt.all() as ConversationRow[];
}

/**
 * Fetch a single conversation by ID.
 */
export function getConversationById(id: string): ConversationRow | undefined {
  return selectByIdStmt.get({ id }) as ConversationRow | undefined;
}

/**
 * Update a conversation's title.
 */
export function updateConversationTitle(id: string, title: string): void {
  updateTitleStmt.run({ id, title, updated_at: Date.now() });
}

/**
 * Increment the total token count for a conversation.
 */
export function addTokensToConversation(id: string, tokens: number): void {
  addTokensStmt.run({ id, tokens, updated_at: Date.now() });
}

/**
 * Delete a conversation (messages are cascade-deleted).
 */
export function deleteConversation(id: string): boolean {
  const result = deleteStmt.run({ id });
  return result.changes > 0;
}
