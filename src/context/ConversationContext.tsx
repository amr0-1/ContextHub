import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from 'react';
import type { Message } from '../types/messages';
import type { Model } from '../types/models';
import type { Conversation } from '../types/usage';
import { AVAILABLE_MODELS } from '../types/models';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface ConversationState {
  conversation: Conversation;
  isLoading: boolean;
}

const defaultModel = AVAILABLE_MODELS[0];

function createInitialConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'New Conversation',
    messages: [],
    model: defaultModel,
    usage: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      contextLimit: defaultModel.contextWindow,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const initialState: ConversationState = {
  conversation: createInitialConversation(),
  isLoading: false,
};

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

type Action =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MODEL'; payload: Model }
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

    case 'SET_MODEL':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          model: action.payload,
          usage: {
            ...state.conversation.usage,
            contextLimit: action.payload.contextWindow,
          },
          updatedAt: Date.now(),
        },
      };

    case 'UPDATE_USAGE':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          usage: {
            ...state.conversation.usage,
            totalInputTokens:
              state.conversation.usage.totalInputTokens + action.payload.inputTokens,
            totalOutputTokens:
              state.conversation.usage.totalOutputTokens + action.payload.outputTokens,
          },
          updatedAt: Date.now(),
        },
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'CLEAR':
      return {
        conversation: createInitialConversation(),
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
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  return (
    <ConversationContext.Provider value={{ state, dispatch }}>
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
