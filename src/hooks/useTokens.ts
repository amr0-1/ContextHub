import { useMemo } from 'react';
import { useConversation } from '../context/ConversationContext';

/**
 * Derives token usage stats from the current conversation.
 */
export function useTokens() {
  const { state } = useConversation();
  const { usage } = state.conversation;

  return useMemo(() => {
    const usedTokens = usage.totalInputTokens + usage.totalOutputTokens;
    const remainingTokens = Math.max(0, usage.contextLimit - usedTokens);
    const usagePercent =
      usage.contextLimit > 0 ? usedTokens / usage.contextLimit : 0;

    return {
      usedTokens,
      remainingTokens,
      usagePercent,
      contextLimit: usage.contextLimit,
      totalInputTokens: usage.totalInputTokens,
      totalOutputTokens: usage.totalOutputTokens,
    };
  }, [usage]);
}
