import type { Model, ModelConfig } from '../types/models';

export const MODEL_REGISTRY: Record<string, Model> = {
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    contextWindow: 128000,
    tokenizer: 'o200k_base',
    pricing: { input: 5, output: 15 },
    description: 'Most capable model for complex tasks',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    contextWindow: 128000,
    tokenizer: 'o200k_base',
    pricing: { input: 0.15, output: 0.6 },
    description: 'Cost-effective model for fast tasks',
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    contextWindow: 2097152,
    tokenizer: 'gemini',
    pricing: { input: 3.5, output: 10.5 },
    description: 'Mid-sized multimodal model',
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    contextWindow: 1048576,
    tokenizer: 'gemini',
    pricing: { input: 0.35, output: 1.05 },
    description: 'Fast and efficient multimodal model',
  },
};

export const DEFAULT_MODEL_ID = 'gpt-4o';

export const CONFIG: ModelConfig = {
  default: DEFAULT_MODEL_ID,
  models: MODEL_REGISTRY,
};

export function getModel(modelId: string): Model {
  const model = MODEL_REGISTRY[modelId];
  if (!model) {
    console.warn(`Model ${modelId} not found, falling back to default`);
    return MODEL_REGISTRY[DEFAULT_MODEL_ID];
  }
  return model;
}

export function getAllModels(): Model[] {
  return Object.values(MODEL_REGISTRY);
}
