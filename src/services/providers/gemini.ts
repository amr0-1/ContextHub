/**
 * Gemini Provider Handler (Phase 8).
 *
 * Maps internal Message[] → Gemini generateContent request format,
 * calls the Google Generative AI API, and maps the response back
 * to the standardized UnifiedResponse.
 */

import type { Message } from '../../types/messages';
import type { UnifiedResponse } from '../../types/usage';
import { classifyApiError, ProviderError } from '../errors';

/* ------------------------------------------------------------------ */
/*  Gemini-specific types                                              */
/* ------------------------------------------------------------------ */

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

interface GeminiCandidate {
  content: { parts: GeminiPart[]; role: string };
  finishReason: string;
}

interface GeminiGenerateContentResponse {
  candidates: GeminiCandidate[];
  usageMetadata: GeminiUsageMetadata;
}

/* ------------------------------------------------------------------ */
/*  Message mapping                                                    */
/* ------------------------------------------------------------------ */

/**
 * Map internal messages to Gemini's content array.
 *
 * Gemini uses "user" / "model" roles (not "assistant").
 * System messages are prepended to the first user message since
 * the v1 generateContent endpoint does not have a dedicated
 * system instruction field in the contents array.
 */
function toGeminiContents(messages: Message[]): {
  contents: GeminiContent[];
  systemInstruction?: string;
} {
  let systemInstruction: string | undefined;
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = systemInstruction
        ? `${systemInstruction}\n${msg.content}`
        : msg.content;
      continue;
    }

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  return { contents, systemInstruction };
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

/**
 * Send messages to the Google Gemini generateContent API and return a
 * UnifiedResponse.
 *
 * @param modelId  The Gemini model identifier (e.g. "gemini-1.5-pro").
 * @param messages The conversation history in internal format.
 * @param apiKey   The user's Google AI API key.
 */
export async function sendToGemini(
  modelId: string,
  messages: Message[],
  apiKey: string,
): Promise<UnifiedResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const { contents, systemInstruction } = toGeminiContents(messages);

  const requestBody: Record<string, unknown> = { contents };
  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    throw new ProviderError(
      (err as Error).message ?? 'Network request failed',
      'NETWORK_ERROR',
      'Google Gemini',
    );
  }

  if (!res.ok) {
    const errorBody = await res.text();
    throw classifyApiError(res.status, errorBody, 'Google Gemini');
  }

  const data: GeminiGenerateContentResponse = await res.json();
  const candidate = data.candidates?.[0];
  const replyText =
    candidate?.content?.parts?.map((p) => p.text).join('') ?? '';

  return {
    reply: replyText,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}
