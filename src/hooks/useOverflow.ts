import { useMemo } from 'react';
import { useConversation } from '../context/ConversationContext';
import type { ContextLevel } from '../types/usage';
import type { Model } from '../types/models';

export interface OverflowState {
  /** Whether the overflow banner should be visible */
  showWarning: boolean;
  /** Current severity level */
  level: ContextLevel;
  /** True when level is 'block' (≥ 95%) */
  isBlocked: boolean;
  /** Models with a larger context window than the active one */
  largerModels: Model[];

  /* ── Actions ─────────────────────────────────────── */
  summarize: () => Promise<void>;
  trim: (pairs: number) => void;
  switchModel: (modelId: string) => void;
  exportAndClear: () => void;
}

/**
 * Monitors context-window overflow and exposes resolution actions.
 *
 * Shows warning when level is `critical` (85%+) or `block` (95%+).
 */
export function useOverflow(): OverflowState {
  const {
    contextStatus,
    summarizeConversation,
    trimMessages,
    switchModel,
    exportAndClear,
    largerModels,
  } = useConversation();

  const showWarning = useMemo(
    () => contextStatus.level === 'critical' || contextStatus.level === 'block',
    [contextStatus.level],
  );

  return {
    showWarning,
    level: contextStatus.level,
    isBlocked: contextStatus.level === 'block',
    largerModels,
    summarize: summarizeConversation,
    trim: trimMessages,
    switchModel,
    exportAndClear,
  };
}
