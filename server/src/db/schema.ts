import type Database from 'better-sqlite3';

const CREATE_CONVERSATIONS = `
  CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT    PRIMARY KEY,
    title       TEXT    NOT NULL DEFAULT 'New Conversation',
    model_id    TEXT    NOT NULL,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    total_tokens_used INTEGER NOT NULL DEFAULT 0
  );
`;

const CREATE_MESSAGES = `
  CREATE TABLE IF NOT EXISTS messages (
    id                TEXT    PRIMARY KEY,
    conversation_id   TEXT    NOT NULL,
    role              TEXT    NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content           TEXT    NOT NULL,
    prompt_tokens     INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    timestamp         INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
`;

const CREATE_MESSAGES_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages(conversation_id, timestamp ASC);
`;

export function initSchema(db: Database.Database): void {
  db.exec(CREATE_CONVERSATIONS);
  db.exec(CREATE_MESSAGES);
  db.exec(CREATE_MESSAGES_INDEX);
}
