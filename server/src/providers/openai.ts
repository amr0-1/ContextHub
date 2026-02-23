/**
 * OpenAI Provider Handler — Server Side (Phase 8.5).
 *
 * Uses the official `openai` npm SDK.  The API key is read from
 * process.env.OPENAI_API_KEY (populated by dotenv) and is NEVER
 * passed from or exposed to the frontend.
 */

import OpenAI from 'openai';
import type { ChatMessage, UnifiedResponse } from '../types.js';

/**
 * Send a message array to OpenAI Chat Completions and return a
 * UnifiedResponse.  The client is instantiated per-request so that
 * a runtime change to the environment variable is always picked up.
 *
 * Throws with `{ code: 'NO_API_KEY' }` when OPENAI_API_KEY is absent.
 * OpenAI SDK errors (`OpenAI.APIError`) include a `.status` property
 * that the route handler uses for HTTP status mapping.
 */
export async function sendToOpenAI(
  modelId: string,
  messages: ChatMessage[],
): Promise<UnifiedResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    const err = new Error('OPENAI_API_KEY is not configured on the server');
    (err as Error & { code: string }).code = 'NO_API_KEY';
    throw err;
  }

  // Lazy instantiation — key comes from env, never from the client
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: modelId,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const reply = completion.choices[0]?.message?.content ?? '';
  const usage = completion.usage;

  return {
    reply,
    usage: {
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
  };
}
