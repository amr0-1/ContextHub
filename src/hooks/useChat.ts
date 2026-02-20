import { useCallback } from 'react';
import { useConversation } from '../context/ConversationContext';
import { sendMessage as llmSendMessage } from '../services/llm';
import { estimateTokens } from '../services/token_engine';
import type { Message } from '../types/messages';

/**
 * High-level chat hook.
 *
 * Provides `sendMessage(content)` which:
 * 1. Appends the user message to state
 * 2. Calls the LLM service
 * 3. Appends the assistant reply
 * 4. Updates token usage
 */
export function useChat() {
  const { state, dispatch } = useConversation();
  const { conversation, isLoading } = state;

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // 1 — user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        tokenCount: estimateTokens(content),
        timestamp: Date.now(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        // 2 — LLM call
        const allMessages = [...conversation.messages, userMsg];
        const response = await llmSendMessage(allMessages, conversation.model);

        // 3 — assistant message
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.content,
          tokenCount: estimateTokens(response.content),
          timestamp: Date.now(),
        };

        dispatch({ type: 'ADD_MESSAGE', payload: assistantMsg });

        // 4 — usage
        dispatch({
          type: 'UPDATE_USAGE',
          payload: response.usage,
        });
      } catch (err) {
        console.error('[useChat] LLM error:', err);

        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'An error occurred while generating a response. Please try again.',
          tokenCount: 0,
          timestamp: Date.now(),
        };
        dispatch({ type: 'ADD_MESSAGE', payload: errorMsg });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [conversation.messages, conversation.model, dispatch, isLoading],
  );

  return {
    messages: conversation.messages,
    isLoading,
    sendMessage,
  };
}
