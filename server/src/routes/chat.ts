// /**
//  * Chat Proxy Route — POST /api/chat  (Phase 8.5)
//  *
//  * Secure backend endpoint that proxies LLM requests to OpenAI or
//  * Google Gemini.  API keys are read from server-side environment
//  * variables; the browser never sees or transmits them.
//  *
//  * Request body:  { modelId: string; messages: ChatMessage[] }
//  * Response body: UnifiedResponse  |  { error: string }
//  */

// import { Router, type Request, type Response } from 'express';
// import { sendToOpenAI } from '../providers/openai.js';
// import { sendToGemini } from '../providers/gemini.js';
// import type { ChatMessage } from '../types.js';

// const router = Router();

// /* ------------------------------------------------------------------ */
// /*  Allowlist of known, supported model IDs                           */
// /* ------------------------------------------------------------------ */

// const ALLOWED_MODELS = new Set([
//   'gpt-4o',
//   'gpt-4o-mini',
//   'gemini-1.5-pro',
//   'gemini-1.5-flash',
// ]);

// /* ------------------------------------------------------------------ */
// /*  Helpers                                                            */
// /* ------------------------------------------------------------------ */

// function getProvider(modelId: string): 'openai' | 'gemini' {
//   if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3')) {
//     return 'openai';
//   }
//   if (modelId.startsWith('gemini-')) {
//     return 'gemini';
//   }
//   throw new Error(`Cannot determine provider for model: ${modelId}`);
// }

// function isValidRole(role: unknown): role is 'user' | 'assistant' | 'system' {
//   return role === 'user' || role === 'assistant' || role === 'system';
// }

// function parseMessages(raw: unknown): ChatMessage[] | null {
//   if (!Array.isArray(raw) || raw.length === 0 || raw.length > 500) return null;

//   const out: ChatMessage[] = [];
//   for (const item of raw) {
//     if (
//       typeof item !== 'object' ||
//       item === null ||
//       !isValidRole((item as Record<string, unknown>).role) ||
//       typeof (item as Record<string, unknown>).content !== 'string'
//     ) {
//       return null;
//     }
//     out.push(item as ChatMessage);
//   }
//   return out;
// }

// /* ------------------------------------------------------------------ */
// /*  POST /api/chat                                                     */
// /* ------------------------------------------------------------------ */

// router.post('/', async (req: Request, res: Response): Promise<void> => {
//   const body = req.body as { modelId?: unknown; messages?: unknown };

//   // ── Input validation ─────────────────────────────────────────────
//   if (!body.modelId || typeof body.modelId !== 'string') {
//     res.status(400).json({ error: 'modelId is required and must be a string' });
//     return;
//   }

//   const modelId = body.modelId;

//   if (!ALLOWED_MODELS.has(modelId)) {
//     res.status(400).json({ error: `Unsupported model: ${modelId}` });
//     return;
//   }

//   const messages = parseMessages(body.messages);
//   if (!messages) {
//     res.status(400).json({
//       error: 'messages must be a non-empty array (max 500) of valid chat messages',
//     });
//     return;
//   }

//   // ── Route to provider ────────────────────────────────────────────
//   try {
//     const provider = getProvider(modelId);
//     const result =
//       provider === 'openai'
//         ? await sendToOpenAI(modelId, messages)
//         : await sendToGemini(modelId, messages);

//     res.json(result);
//   } catch (err) {
//     const error = err as Error & {
//       code?: string;
//       status?: number;       // OpenAI SDK
//       statusCode?: number;   // generic
//     };

//     // No API key configured on the server → 503 Service Unavailable
//     if (error.code === 'NO_API_KEY') {
//       res.status(503).json({ error: error.message });
//       return;
//     }

//     const httpStatus = error.status ?? error.statusCode;

//     if (httpStatus === 401 || httpStatus === 403) {
//       res.status(401).json({ error: 'Invalid API key configured on the server' });
//       return;
//     }
//     if (httpStatus === 429) {
//       res.status(429).json({ error: 'Rate limit exceeded — please wait and try again' });
//       return;
//     }
//     if (httpStatus === 400) {
//       res.status(400).json({ error: error.message ?? 'Bad request to provider' });
//       return;
//     }

//     // Unexpected provider error — log server-side, return 502 to client
//     console.error('[/api/chat] Provider error:', err);
//     res.status(502).json({ error: 'The AI provider returned an unexpected error' });
//   }
// });

// export default router;
/**
 * Chat Proxy Route — POST /api/chat  (Phase 8.5)
 *
 * Gemini-only version (OpenAI temporarily disabled).
 * API key is read from server-side environment variables.
 *
 * Request body:  { modelId: string; messages: ChatMessage[] }
 * Response body: UnifiedResponse  |  { error: string }
 */

import { Router, type Request, type Response } from 'express';
import { sendToGemini } from '../providers/gemini.js';
import type { ChatMessage } from '../types.js';

const router = Router();

/* ------------------------------------------------------------------ */
/*  Allowlist of known, supported model IDs (Gemini only)             */
/* ------------------------------------------------------------------ */

const ALLOWED_MODELS = new Set([
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isValidRole(role: unknown): role is 'user' | 'assistant' | 'system' {
  return role === 'user' || role === 'assistant' || role === 'system';
}

function parseMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 500) return null;

  const out: ChatMessage[] = [];
  for (const item of raw) {
    if (
      typeof item !== 'object' ||
      item === null ||
      !isValidRole((item as Record<string, unknown>).role) ||
      typeof (item as Record<string, unknown>).content !== 'string'
    ) {
      return null;
    }
    out.push(item as ChatMessage);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  POST /api/chat                                                     */
/* ------------------------------------------------------------------ */

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { modelId?: unknown; messages?: unknown };

  // ── Input validation ─────────────────────────────────────────────
  if (!body.modelId || typeof body.modelId !== 'string') {
    res.status(400).json({ error: 'modelId is required and must be a string' });
    return;
  }

  const modelId = body.modelId;

  if (!ALLOWED_MODELS.has(modelId)) {
    res.status(400).json({ error: `Unsupported model: ${modelId}` });
    return;
  }

  const messages = parseMessages(body.messages);
  if (!messages) {
    res.status(400).json({
      error: 'messages must be a non-empty array (max 500) of valid chat messages',
    });
    return;
  }

  // ── Route directly to Gemini ─────────────────────────────────────
  try {
    const result = await sendToGemini(modelId, messages);
    res.json(result);
  } catch (err) {
    const error = err as Error & {
      code?: string;
      status?: number;
      statusCode?: number;
    };

    // No API key configured on the server → 503
    if (error.code === 'NO_API_KEY') {
      res.status(503).json({ error: error.message });
      return;
    }

    const httpStatus = error.status ?? error.statusCode;

    if (httpStatus === 401 || httpStatus === 403) {
      res.status(401).json({ error: 'Invalid Gemini API key configured on the server' });
      return;
    }

    if (httpStatus === 429) {
      res.status(429).json({ error: 'Rate limit exceeded — please wait and try again' });
      return;
    }

    if (httpStatus === 400) {
      res.status(400).json({ error: error.message ?? 'Bad request to Gemini' });
      return;
    }

    console.error('[/api/chat] Gemini error:', err);
    res.status(502).json({ error: 'Gemini returned an unexpected error' });
  }
});

export default router;