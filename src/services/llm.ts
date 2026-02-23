import type { Message } from '../types/messages';
import type { UnifiedResponse } from '../types/usage';
import type { Model } from '../types/models';
import { countMessageTokens } from './token_engine';

/* ------------------------------------------------------------------ */
/*  Backend proxy call                                                  */
/* ------------------------------------------------------------------ */

/**
 * POST /api/chat  — sends messages through the secure backend proxy.
 *
 * The server reads API keys from its own environment variables; this
 * function intentionally carries NO API keys.
 *
 * Throws an error with `.statusCode` set on non-2xx responses.
 */
async function callChatProxy(
  modelId: string,
  messages: Message[],
): Promise<UnifiedResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, messages }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    const err = new Error(body.error ?? `Chat proxy error ${res.status}`);
    (err as Error & { statusCode: number }).statusCode = res.status;
    throw err;
  }

  return res.json() as Promise<UnifiedResponse>;
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

/**
 * Send messages to an LLM and get a unified response.
 *
 * Routes through the secure backend proxy (Phase 8.5).
 * Falls back to a local mock response when:
 *  - The server returns 503 (no API key configured), OR
 *  - The backend is not reachable (TypeError — local dev without server)
 */
export async function sendMessage(
  messages: Message[],
  model: Model,
): Promise<UnifiedResponse> {
  try {
    return await callChatProxy(model.id, messages);
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode;
    // 503 = server running but no key configured; TypeError = server not running
    const useMock = statusCode === 503 || err instanceof TypeError;
    if (!useMock) throw err; // real API error (401, 429, 502, …) — surface to UI
  }

  // ── Mock fallback for development ──────────────────────────────
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const mockContent = generateMockReply(lastUserMsg?.content ?? '');
  const promptTokens = messages.reduce((sum, m) => sum + (m.tokenCount ?? 0), 0);
  const completionTokens = countMessageTokens(mockContent, model.tokenizer);

  return {
    reply: mockContent,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}

/* ------------------------------------------------------------------ */

function generateMockReply(userContent: string): string {
  const lower = userContent.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi')) {
    return "Hello! I'm ContextHub AI, your intelligent assistant with full context-window transparency. I can help you with coding, analysis, creative writing, and much more. How can I assist you today?";
  }

  if (lower.includes('context') || lower.includes('token')) {
    return "Great question about context windows! The context window represents the maximum number of tokens an AI model can process in a single conversation. I track this in real-time so you always know exactly how much capacity remains. The meter at the top shows your current usage — green means plenty of room, amber means you're getting closer to the limit, and red means you're approaching capacity.";
  }

  if (lower.includes('code') || lower.includes('program')) {
    return "I'd be happy to help with coding! Here's a quick example:\n\n```typescript\nfunction greet(name: string): string {\n  return `Hello, ${name}! Welcome to ContextHub AI.`;\n}\n\nconsole.log(greet('Developer'));\n```\n\nLet me know what language or framework you'd like to work with and I'll provide more detailed assistance.";
  }

  return `That's an interesting topic! Let me share some thoughts.\n\nI can help you explore this further by breaking it down into key components. The context window tracker above shows our conversation's token usage in real-time, so you'll always know how much capacity we have left for deeper analysis.\n\nWould you like me to elaborate on any specific aspect?`;
}
