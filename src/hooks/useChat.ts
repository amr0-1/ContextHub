import { useCallback } from 'react';
import { useConversation } from '../context/ConversationContext';
import { sendMessage as llmSendMessage } from '../services/llm';
import { ProviderError } from '../services/errors';
import { countMessageTokens } from '../services/token_engine';
import { saveMessage as apiSaveMessage } from '../services/api';

/**
 * High-level chat hook.
 *
 * Provides `sendMessage(content)` which:
 * 1. Checks the context window safety guard
 * 2. Appends the user message via the Conversation Manager
 * 3. Persists the user message to the backend database
 * 4. Calls the LLM service (via provider abstraction layer)
 * 5. Appends the assistant reply
 * 6. Persists the assistant reply with token usage
 * 7. Updates token usage
 * 8. Refreshes the sidebar conversation list
 */
export function useChat() {
  const {
    state,
    dispatch,
    addMessage,
    canSendMessage,
    models,
    refreshConversationList,
  } = useConversation();
  const { conversation, isLoading } = state;

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Safety guard — block if context window is nearly full
      const estimated = countMessageTokens(content, models.active.tokenizer);
      if (!canSendMessage(estimated)) {
        addMessage(
          'assistant',
          '⚠ Context window is nearly full. Please start a new conversation to continue.',
        );
        return;
      }

      // 1 — user message (via Conversation Manager)
      const userMsg = addMessage('user', content);

      // 2 — persist user message to backend (fire-and-forget)
      apiSaveMessage(conversation.id, 'user', userMsg.content).catch((err) =>
        console.error('[persistence] Failed to save user message:', err),
      );

      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        // 3 — LLM call (routes through provider manager)
        const allMessages = [...conversation.messages, userMsg];
        const response = await llmSendMessage(allMessages, conversation.model);

        // 4 — assistant message (via Conversation Manager)
        addMessage('assistant', response.reply);

        // 5 — persist assistant message with token usage
        apiSaveMessage(conversation.id, 'assistant', response.reply, {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
        }).catch((err) =>
          console.error('[persistence] Failed to save assistant message:', err),
        );

        // 6 — usage (map UnifiedResponse → UPDATE_USAGE payload)
        dispatch({
          type: 'UPDATE_USAGE',
          payload: {
            inputTokens: response.usage.promptTokens,
            outputTokens: response.usage.completionTokens,
          },
        });

        // 7 — refresh sidebar list (updates timestamps/token counts)
        refreshConversationList().catch(() => {});
      } catch (err) {
        console.error('[useChat] LLM error:', err);

        const message =
          err instanceof ProviderError
            ? err.userMessage
            : 'An error occurred while generating a response. Please try again.';

        addMessage('assistant', message);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [conversation.messages, conversation.model, conversation.id, dispatch, isLoading, addMessage, canSendMessage, models.active.tokenizer, refreshConversationList],
  );

  return {
    messages: conversation.messages,
    isLoading,
    sendMessage,
  };
}
