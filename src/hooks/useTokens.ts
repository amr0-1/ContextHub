import { useConversation } from '../context/ConversationContext';

/**
 * Derives token usage stats from the current conversation.
 */
export function useTokens() {
  const { state, contextStatus } = useConversation();
  const { usage } = state.conversation;

  return {
    usedTokens: contextStatus.used,
    remainingTokens: contextStatus.remaining,
    usagePercent: contextStatus.percent / 100,
    percent: contextStatus.percent,
    level: contextStatus.level,
    contextLimit: usage.contextLimit,
    totalInputTokens: usage.totalInputTokens,
    totalOutputTokens: usage.totalOutputTokens,
  };
}
