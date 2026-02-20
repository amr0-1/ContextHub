import { getEncoding, type Tiktoken } from 'js-tiktoken';
import type { TokenizerType } from '../types/models';
import type { Message } from '../types/messages';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Per-message overhead: role marker + separators (<|im_start|>, role, \n, <|im_end|>) */
const MESSAGE_OVERHEAD = 4;

/** Conversation reply priming overhead (assistant prompt) */
const CONVERSATION_OVERHEAD = 3;

/* ------------------------------------------------------------------ */
/*  Encoder cache (lazy-loaded, one instance per encoding)             */
/* ------------------------------------------------------------------ */

const encoderCache = new Map<string, Tiktoken>();

function getEncoder(tokenizerType: TokenizerType): Tiktoken | null {
  // Only OpenAI encodings are supported by js-tiktoken
  if (tokenizerType !== 'cl100k_base' && tokenizerType !== 'o200k_base') {
    return null;
  }

  let enc = encoderCache.get(tokenizerType);
  if (!enc) {
    enc = getEncoding(tokenizerType);
    encoderCache.set(tokenizerType, enc);
  }
  return enc;
}

/* ------------------------------------------------------------------ */
/*  Estimation fallbacks (non-OpenAI models)                           */
/* ------------------------------------------------------------------ */

/**
 * Robust heuristic for models without a client-side tokenizer.
 *
 * Gemini uses SentencePiece which averages ~3.5 chars/token for English;
 * Claude uses a BPE variant close to ~3.7 chars/token.
 */
function estimateFallback(text: string, tokenizerType: TokenizerType): number {
  if (!text) return 0;

  switch (tokenizerType) {
    case 'gemini':
      return Math.ceil(text.length / 3.5);
    case 'claude':
      return Math.ceil(text.length / 3.7);
    default:
      return Math.ceil(text.length / 4);
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Count tokens for a single string using the model's encoding.
 *
 * - OpenAI (cl100k_base / o200k_base): uses js-tiktoken for exact BPE counts.
 * - Gemini / Claude: uses a calibrated character-ratio heuristic as a fallback
 *   (prepared for live API counting when keys are configured).
 */
export function countMessageTokens(
  content: string,
  tokenizerType: TokenizerType,
): number {
  if (!content) return 0;

  const encoder = getEncoder(tokenizerType);
  if (encoder) {
    return encoder.encode(content).length;
  }

  return estimateFallback(content, tokenizerType);
}

/**
 * Count the total tokens a full conversation would consume, including
 * per-message metadata overhead and reply priming.
 *
 * Overhead model (OpenAI ChatML style, applied uniformly):
 *   each message   = content_tokens + 4   (role/separator markers)
 *   reply priming  = 3                    (assistant turn start)
 */
export function countConversationTokens(
  messages: Message[],
  tokenizerType: TokenizerType,
): number {
  let total = CONVERSATION_OVERHEAD;

  for (const msg of messages) {
    const contentTokens =
      msg.tokenCount ?? countMessageTokens(msg.content, tokenizerType);
    total += contentTokens + MESSAGE_OVERHEAD;
  }

  return total;
}

/**
 * Quick estimate without model awareness (legacy fallback).
 * ~4 characters ≈ 1 token for GPT-family English text.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
