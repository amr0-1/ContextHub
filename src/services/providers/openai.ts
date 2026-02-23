/**
 * OpenAI Provider Handler (Phase 8).
 *
 * Maps internal Message[] → OpenAI ChatCompletion request format,
 * calls the OpenAI-compatible API, and maps the response back
 * to the standardized UnifiedResponse.
 */

import type { Message } from '../../types/messages';
import type { UnifiedResponse } from '../../types/usage';
import { classifyApiError, ProviderError } from '../errors';

/* ------------------------------------------------------------------ */
/*  OpenAI-specific types                                              */
/* ------------------------------------------------------------------ */

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIChatChoice {
  index: number;
  message: { role: string; content: string | null };
  finish_reason: string;
}

interface OpenAIChatCompletionResponse {
  id: string;
  choices: OpenAIChatChoice[];
  usage: OpenAIUsage;
}

/* ------------------------------------------------------------------ */
/*  Message mapping                                                    */
/* ------------------------------------------------------------------ */

function toOpenAIMessages(messages: Message[]): OpenAIChatMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

/**
 * Send messages to the OpenAI Chat Completions API and return a
 * UnifiedResponse.
 *
 * @param modelId  The OpenAI model identifier (e.g. "gpt-4o").
 * @param messages The conversation history in internal format.
 * @param apiKey   The user's OpenAI API key.
 */
export async function sendToOpenAI(
  modelId: string,
  messages: Message[],
  apiKey: string,
): Promise<UnifiedResponse> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const body = JSON.stringify({
    model: modelId,
    messages: toOpenAIMessages(messages),
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });
  } catch (err) {
    throw new ProviderError(
      (err as Error).message ?? 'Network request failed',
      'NETWORK_ERROR',
      'OpenAI',
    );
  }

  if (!res.ok) {
    const errorBody = await res.text();
    throw classifyApiError(res.status, errorBody, 'OpenAI');
  }

  const data: OpenAIChatCompletionResponse = await res.json();
  const choice = data.choices[0];

  return {
    reply: choice?.message?.content ?? '',
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
}
