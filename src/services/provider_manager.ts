/**
 * Provider Manager — Multi-Provider Abstraction Layer (Phase 8).
 *
 * Central routing service that exposes a single `sendMessage(modelId, messages)`
 * entry point. It resolves the provider from the Model Registry and delegates
 * to the appropriate provider handler.
 */

import type { Message } from '../types/messages';
import type { UnifiedResponse } from '../types/usage';
import { getModel } from '../models/registry';
import { ProviderError } from './errors';
import { sendToOpenAI } from './providers/openai';
import { sendToGemini } from './providers/gemini';

/* ------------------------------------------------------------------ */
/*  API key storage                                                    */
/* ------------------------------------------------------------------ */

const apiKeys: Record<string, string> = {};

/**
 * Register an API key for a provider. Call this once per provider
 * (e.g. on app init or from a settings panel).
 *
 * @param provider Lowercase provider key: "openai" | "gemini"
 * @param key      The API key string.
 */
export function setApiKey(provider: string, key: string): void {
  apiKeys[provider.toLowerCase()] = key;
}

/**
 * Check whether an API key has been registered for a provider.
 */
export function hasApiKey(provider: string): boolean {
  return Boolean(apiKeys[provider.toLowerCase()]);
}

/* ------------------------------------------------------------------ */
/*  Provider routing                                                   */
/* ------------------------------------------------------------------ */

/**
 * Resolve a `ModelProvider` value from the registry to the internal
 * provider key used for routing and key lookup.
 */
function resolveProviderKey(provider: string): string {
  switch (provider) {
    case 'OpenAI':
      return 'openai';
    case 'Google':
      return 'gemini';
    default:
      return provider.toLowerCase();
  }
}

/**
 * Send a message through the unified provider abstraction layer.
 *
 * 1. Looks up the model in the registry to determine the provider.
 * 2. Validates that an API key is available.
 * 3. Delegates to the appropriate provider handler.
 * 4. Returns a standardised `UnifiedResponse`.
 *
 * @param modelId  Model identifier from the registry (e.g. "gpt-4o").
 * @param messages The conversation history in internal format.
 */
export async function sendMessage(
  modelId: string,
  messages: Message[],
): Promise<UnifiedResponse> {
  const model = getModel(modelId);
  const providerKey = resolveProviderKey(model.provider);
  const apiKey = apiKeys[providerKey];

  if (!apiKey) {
    throw new ProviderError(
      `No API key configured for ${model.provider}`,
      'INVALID_API_KEY',
      model.provider,
    );
  }

  switch (providerKey) {
    case 'openai':
      return sendToOpenAI(model.id, messages, apiKey);

    case 'gemini':
      return sendToGemini(model.id, messages, apiKey);

    default:
      throw new ProviderError(
        `Provider "${model.provider}" is not supported yet`,
        'PROVIDER_ERROR',
        model.provider,
      );
  }
}
