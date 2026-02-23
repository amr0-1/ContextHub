import type { ContextLevel, ContextStatus } from '../types/usage';
import {
  CONTEXT_THRESHOLD_BLOCK,
  CONTEXT_THRESHOLD_CAUTION,
  CONTEXT_THRESHOLD_CRITICAL,
} from '../utils/constants';

/* ------------------------------------------------------------------ */
/*  Input interface                                                    */
/* ------------------------------------------------------------------ */

/** Arguments for context-window status calculation. */
export interface ContextMonitorInput {
  totalInputTokens: number;
  totalOutputTokens: number;
  maxContext: number;
}

/* ------------------------------------------------------------------ */
/*  Pure calculation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Calculates the current context-window status from raw token counts.
 *
 * Pure function — no side-effects, no React dependency.
 * Designed to be called from the ConversationProvider whenever token
 * usage changes.
 *
 * @returns A `ContextStatus` object with `used`, `remaining`, `percent`,
 *          and a severity `level`.
 */
export function calculateContextStatus(
  input: ContextMonitorInput,
): ContextStatus {
  const { totalInputTokens, totalOutputTokens, maxContext } = input;

  const used = totalInputTokens + totalOutputTokens;
  const remaining = Math.max(0, maxContext - used);
  const percent = maxContext > 0 ? (used / maxContext) * 100 : 0;

  const level: ContextLevel =
    percent >= CONTEXT_THRESHOLD_BLOCK
      ? 'block'
      : percent >= CONTEXT_THRESHOLD_CRITICAL
        ? 'critical'
        : percent >= CONTEXT_THRESHOLD_CAUTION
          ? 'caution'
          : 'safe';

  return { used, remaining, percent, level };
}
