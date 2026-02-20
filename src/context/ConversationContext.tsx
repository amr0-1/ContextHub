import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { Message, Role } from '../types/messages';
import type { Model } from '../types/models';
import type { ContextStatus, Conversation } from '../types/usage';
import { DEFAULT_MODEL_ID, getModel, MODEL_REGISTRY } from '../models/registry';
import { countMessageTokens } from '../services/token_engine';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function deriveContextStatus(
  totalInput: number,
  totalOutput: number,
  contextWindow: number,
): ContextStatus {
  const used = totalInput + totalOutput;
  const remaining = Math.max(0, contextWindow - used);
  const percent = contextWindow > 0 ? (used / contextWindow) * 100 : 0;
  const level =
    percent >= 85 ? 'critical' : percent >= 60 ? 'caution' : 'safe';
  return { used, remaining, percent, level };
}

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface ConversationState {
  conversation: Conversation;
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
  | { type: 'CLEAR' };

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

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'CLEAR':
      return {
        conversation: createInitialConversation(),
        isLoading: false,
        activeModelId: DEFAULT_MODEL_ID,
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
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  const activeModel = getModel(state.activeModelId);

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
      deriveContextStatus(
        state.conversation.usage.totalInputTokens,
        state.conversation.usage.totalOutputTokens,
        activeModel.contextWindow,
      ),
    [
      state.conversation.usage.totalInputTokens,
      state.conversation.usage.totalOutputTokens,
      activeModel.contextWindow,
    ],
  );

  const canSendMessage = useCallback(
    (estimatedTokens: number): boolean => {
      const projected = contextStatus.used + estimatedTokens;
      return (projected / activeModel.contextWindow) < 0.95;
    },
    [contextStatus.used, activeModel.contextWindow],
  );

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
