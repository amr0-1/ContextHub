/* ------------------------------------------------------------------ */
/*  API Client — Persistence Layer (Phase 9)                           */
/* ------------------------------------------------------------------ */

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ── Row shapes returned by the backend ──────────── */

export interface ConversationRow {
  id: string;
  title: string;
  model_id: string;
  created_at: number;
  updated_at: number;
  total_tokens_used: number;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  prompt_tokens: number;
  completion_tokens: number;
  timestamp: number;
}

/* ── Conversations ───────────────────────────────── */

export function fetchConversations(): Promise<ConversationRow[]> {
  return request<ConversationRow[]>('/conversations');
}

export function fetchConversation(id: string): Promise<ConversationRow> {
  return request<ConversationRow>(`/conversations/${encodeURIComponent(id)}`);
}

export function createConversation(modelId: string): Promise<ConversationRow> {
  return request<ConversationRow>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ modelId }),
  });
}

export function updateConversationTitle(id: string, title: string): Promise<ConversationRow> {
  return request<ConversationRow>(`/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export function deleteConversation(id: string): Promise<void> {
  return request<void>(`/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/* ── Messages ────────────────────────────────────── */

export function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  return request<MessageRow[]>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
}

export function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  tokenUsage?: { promptTokens: number; completionTokens: number },
): Promise<MessageRow> {
  return request<MessageRow>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ role, content, tokenUsage }),
    },
  );
}
