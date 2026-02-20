import { useCallback } from 'react';
import { useConversation } from '../context/ConversationContext';
import { sendMessage as llmSendMessage } from '../services/llm';
import { countMessageTokens } from '../services/token_engine';

/**
 * High-level chat hook.
 *
 * Provides `sendMessage(content)` which:
 * 1. Checks the context window safety guard
 * 2. Appends the user message via the Conversation Manager
 * 3. Calls the LLM service
 * 4. Appends the assistant reply
 * 5. Updates token usage
 */
export function useChat() {
  const { state, dispatch, addMessage, canSendMessage, models } = useConversation();
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

      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        // 2 — LLM call
        const allMessages = [...conversation.messages, userMsg];
        const response = await llmSendMessage(allMessages, conversation.model);

        // 3 — assistant message (via Conversation Manager)
        addMessage('assistant', response.content);

        // 4 — usage
        dispatch({
          type: 'UPDATE_USAGE',
          payload: response.usage,
        });
      } catch (err) {
        console.error('[useChat] LLM error:', err);
        addMessage(
          'assistant',
          'An error occurred while generating a response. Please try again.',
        );
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [conversation.messages, conversation.model, dispatch, isLoading, addMessage, canSendMessage, models.active.tokenizer],
  );

  return {
    messages: conversation.messages,
    isLoading,
    sendMessage,
  };
}
