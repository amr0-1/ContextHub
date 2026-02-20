// Provider types
export type ModelProvider = "OpenAI" | "Google" | "Anthropic" | "Meta";

// Tokenizer types
export type TokenizerType = "cl100k_base" | "o200k_base" | "gemini" | "claude";

export interface ModelPricing {
  input: number; // Cost per 1M tokens
  output: number; // Cost per 1M tokens
}

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  tokenizer: TokenizerType;
  pricing: ModelPricing;
  description?: string;
  isExperimental?: boolean;
}

export interface ModelConfig {
  default: string;
  models: Record<string, Model>;
}
