import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { Message, Role } from '../types/messages';
import type { Model } from '../types/models';
import type { ContextStatus, Conversation } from '../types/usage';
import { DEFAULT_MODEL_ID, getModel, MODEL_REGISTRY } from '../models/registry';
import { calculateContextStatus } from '../services/context_monitor';
import { sendMessage as llmSendMessage } from '../services/llm';
import {
  buildSummaryPrompt,
  buildSummarizedMessages,
  exportConversation,
  findLargerModels,
  recalculateUsage,
  trimOldestPairs,
} from '../services/overflow';
import { countMessageTokens } from '../services/token_engine';
import { CONTEXT_THRESHOLD_BLOCK } from '../utils/constants';
import {
  fetchConversations,
  fetchMessages,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  type ConversationRow,
} from '../services/api';

/* ------------------------------------------------------------------ */
/*  Conversation list item (sidebar)                                   */
/* ------------------------------------------------------------------ */

export interface ConversationListItem {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  totalTokensUsed: number;
}

function rowToListItem(row: ConversationRow): ConversationListItem {
  return {
    id: row.id,
    title: row.title,
    modelId: row.model_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalTokensUsed: row.total_tokens_used,
  };
}

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface ConversationState {
  conversation: Conversation;
  conversationList: ConversationListItem[];
  isLoading: boolean;
  activeModelId: string;
}

function createInitialConversation(): Conversation {
  const defaultModel = getModel(DEFAULT_MODEL_ID);
  return {
    id: crypto.randomUUID(),
    title: 'New Conversation',
    messages: [],
    model: defaultModel,
    usage: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalUsedTokens: 0,
      remainingTokens: defaultModel.contextWindow,
      contextLimit: defaultModel.contextWindow,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const initialState: ConversationState = {
  conversation: createInitialConversation(),
  conversationList: [],
  isLoading: false,
  activeModelId: DEFAULT_MODEL_ID,
};

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

type Action =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'UPDATE_USAGE'; payload: { inputTokens: number; outputTokens: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'REPLACE_MESSAGES'; payload: Message[] }
  | { type: 'CLEAR' }
  | { type: 'SET_CONVERSATION_LIST'; payload: ConversationListItem[] }
  | { type: 'LOAD_CONVERSATION'; payload: { conversation: Conversation; modelId: string } };

function conversationReducer(
  state: ConversationState,
  action: Action,
): ConversationState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          messages: [...state.conversation.messages, action.payload],
          updatedAt: Date.now(),
        },
      };

    case 'SET_MODEL': {
      const newModel = getModel(action.payload);
      const { totalInputTokens, totalOutputTokens } = state.conversation.usage;
      const totalUsed = totalInputTokens + totalOutputTokens;
      return {
        ...state,
        activeModelId: action.payload,
        conversation: {
          ...state.conversation,
          model: newModel,
          usage: {
            ...state.conversation.usage,
            totalUsedTokens: totalUsed,
            remainingTokens: Math.max(0, newModel.contextWindow - totalUsed),
            contextLimit: newModel.contextWindow,
          },
          updatedAt: Date.now(),
        },
      };
    }

    case 'UPDATE_USAGE': {
      const newInput =
        state.conversation.usage.totalInputTokens + action.payload.inputTokens;
      const newOutput =
        state.conversation.usage.totalOutputTokens + action.payload.outputTokens;
      const totalUsed = newInput + newOutput;
      return {
        ...state,
        conversation: {
          ...state.conversation,
          usage: {
            ...state.conversation.usage,
            totalInputTokens: newInput,
            totalOutputTokens: newOutput,
            totalUsedTokens: totalUsed,
            remainingTokens: Math.max(
              0,
              state.conversation.usage.contextLimit - totalUsed,
            ),
          },
          updatedAt: Date.now(),
        },
      };
    }

    case 'REPLACE_MESSAGES': {
      const newMessages = action.payload;
      const { totalInputTokens, totalOutputTokens } = recalculateUsage(newMessages);
      const totalUsed = totalInputTokens + totalOutputTokens;
      const limit = state.conversation.usage.contextLimit;
      return {
        ...state,
        conversation: {
          ...state.conversation,
          messages: newMessages,
          usage: {
            ...state.conversation.usage,
            totalInputTokens,
            totalOutputTokens,
            totalUsedTokens: totalUsed,
            remainingTokens: Math.max(0, limit - totalUsed),
          },
          updatedAt: Date.now(),
        },
      };
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'CLEAR':
      return {
        ...state,
        conversation: createInitialConversation(),
        isLoading: false,
        activeModelId: DEFAULT_MODEL_ID,
      };

    case 'SET_CONVERSATION_LIST':
      return { ...state, conversationList: action.payload };

    case 'LOAD_CONVERSATION':
      return {
        ...state,
        conversation: action.payload.conversation,
        activeModelId: action.payload.modelId,
        isLoading: false,
      };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface ConversationContextValue {
  state: ConversationState;
  dispatch: React.Dispatch<Action>;
  models: {
    active: Model;
    all: Model[];
  };
  addMessage: (role: Role, content: string) => Message;
  contextStatus: ContextStatus;
  canSendMessage: (estimatedTokens: number) => boolean;

  /* ── Phase 7: Overflow actions ─────────────────── */
  summarizeConversation: () => Promise<void>;
  trimMessages: (pairs: number) => void;
  switchModel: (modelId: string) => void;
  exportAndClear: () => void;
  largerModels: Model[];

  /* ── Phase 9: Persistence actions ──────────────── */
  newConversation: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
  refreshConversationList: () => Promise<void>;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  const activeModel = getModel(state.activeModelId);

  /* ── Phase 9: Fetch conversation list on mount ──── */

  const refreshConversationList = useCallback(async () => {
    try {
      const rows = await fetchConversations();
      dispatch({
        type: 'SET_CONVERSATION_LIST',
        payload: rows.map(rowToListItem),
      });
    } catch (err) {
      console.error('[persistence] Failed to fetch conversations:', err);
    }
  }, []);

  const addMessage = useCallback(
    (role: Role, content: string): Message => {
      const msg: Message = {
        id: crypto.randomUUID(),
        role,
        content,
        tokenCount: countMessageTokens(content, activeModel.tokenizer),
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: msg });
      return msg;
    },
    [dispatch, activeModel.tokenizer],
  );

  const contextStatus = useMemo(
    () =>
      calculateContextStatus({
        totalInputTokens: state.conversation.usage.totalInputTokens,
        totalOutputTokens: state.conversation.usage.totalOutputTokens,
        maxContext: activeModel.contextWindow,
      }),
    [
      state.conversation.usage.totalInputTokens,
      state.conversation.usage.totalOutputTokens,
      activeModel.contextWindow,
    ],
  );

  const canSendMessage = useCallback(
    (estimatedTokens: number): boolean => {
      const projected = contextStatus.used + estimatedTokens;
      return (projected / activeModel.contextWindow) < CONTEXT_THRESHOLD_BLOCK / 100;
    },
    [contextStatus.used, activeModel.contextWindow],
  );

  /* ── Phase 7: Overflow actions ───────────────────── */

  const largerModels = useMemo(
    () => findLargerModels(activeModel, Object.values(MODEL_REGISTRY)),
    [activeModel],
  );

  const summarizeConversation = useCallback(async () => {
    const { messages, model } = state.conversation;
    if (messages.length < 2) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const summaryPrompt = buildSummaryPrompt(messages);
      const summaryMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: summaryPrompt,
        tokenCount: countMessageTokens(summaryPrompt, model.tokenizer),
        timestamp: Date.now(),
      };

      const response = await llmSendMessage([summaryMsg], model);
      const newMessages = buildSummarizedMessages(response.reply, model);

      dispatch({ type: 'REPLACE_MESSAGES', payload: newMessages });
    } catch (err) {
      console.error('[summarize] error:', err);
      addMessage(
        'assistant',
        'Failed to summarize the conversation. Please try again.',
      );
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.conversation, addMessage]);

  const trimMessages = useCallback(
    (pairs: number) => {
      const trimmed = trimOldestPairs(state.conversation.messages, pairs);
      dispatch({ type: 'REPLACE_MESSAGES', payload: trimmed });
    },
    [state.conversation.messages],
  );

  const switchModel = useCallback(
    (modelId: string) => {
      dispatch({ type: 'SET_MODEL', payload: modelId });
    },
    [],
  );

  const exportAndClear = useCallback(() => {
    exportConversation(state.conversation);
    dispatch({ type: 'CLEAR' });
  }, [state.conversation]);

  /* ── Phase 9: Persistence actions ────────────────── */

  const newConversation = useCallback(async () => {
    try {
      const row = await apiCreateConversation(activeModel.id);
      const model = getModel(row.model_id);
      const conversation: Conversation = {
        id: row.id,
        title: row.title,
        messages: [],
        model,
        usage: {
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalUsedTokens: 0,
          remainingTokens: model.contextWindow,
          contextLimit: model.contextWindow,
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      dispatch({
        type: 'LOAD_CONVERSATION',
        payload: { conversation, modelId: model.id },
      });
      await refreshConversationList();
    } catch (err) {
      console.error('[persistence] Failed to create conversation:', err);
      // Fallback to local-only conversation
      dispatch({ type: 'CLEAR' });
    }
  }, [activeModel.id, refreshConversationList]);

  const loadConversation = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const rows = await fetchConversations();
      const convRow = rows.find((r) => r.id === id);
      if (!convRow) {
        console.error('[persistence] Conversation not found:', id);
        return;
      }

      const messageRows = await fetchMessages(id);
      const model = getModel(convRow.model_id);

      const messages: Message[] = messageRows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        tokenCount: m.prompt_tokens + m.completion_tokens,
        timestamp: m.timestamp,
      }));

      // Rebuild usage from messages
      const { totalInputTokens, totalOutputTokens } = recalculateUsage(messages);
      const totalUsed = totalInputTokens + totalOutputTokens;

      const conversation: Conversation = {
        id: convRow.id,
        title: convRow.title,
        messages,
        model,
        usage: {
          totalInputTokens,
          totalOutputTokens,
          totalUsedTokens: totalUsed,
          remainingTokens: Math.max(0, model.contextWindow - totalUsed),
          contextLimit: model.contextWindow,
        },
        createdAt: convRow.created_at,
        updatedAt: convRow.updated_at,
      };

      dispatch({
        type: 'LOAD_CONVERSATION',
        payload: { conversation, modelId: model.id },
      });
    } catch (err) {
      console.error('[persistence] Failed to load conversation:', err);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Bootstrap: load the most recent server conversation on mount, or create one if none exist.
  // Must be placed after newConversation and loadConversation are declared.
  // This ensures state.conversation.id always refers to a real server-side row.
  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchConversations();
        dispatch({
          type: 'SET_CONVERSATION_LIST',
          payload: rows.map(rowToListItem),
        });

        if (rows.length > 0) {
          const latest = rows.reduce((a, b) => (a.updated_at >= b.updated_at ? a : b));
          await loadConversation(latest.id);
        } else {
          await newConversation();
        }
      } catch (err) {
        console.error('[persistence] Failed to bootstrap initial conversation:', err);
      }
    })();
    // loadConversation and newConversation are stable at mount time — intentional omission
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeConversation = useCallback(async (id: string) => {
    try {
      await apiDeleteConversation(id);
      // If deleting the active conversation, create a fresh server-backed one first
      if (state.conversation.id === id) {
        await newConversation();
      } else {
        await refreshConversationList();
      }
    } catch (err) {
      console.error('[persistence] Failed to delete conversation:', err);
    }
  }, [state.conversation.id, newConversation, refreshConversationList]);

  const contextValue: ConversationContextValue = {
    state,
    dispatch,
    models: {
      active: activeModel,
      all: Object.values(MODEL_REGISTRY),
    },
    addMessage,
    contextStatus,
    canSendMessage,
    summarizeConversation,
    trimMessages,
    switchModel,
    exportAndClear,
    largerModels,
    newConversation,
    loadConversation,
    removeConversation,
    refreshConversationList,
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error('useConversation must be used inside <ConversationProvider>');
  }
  return ctx;
}
