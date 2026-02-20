/**
 * API Client placeholders.
 *
 * Export provider-specific client factories here when integrating
 * real APIs (OpenAI, Anthropic, Google, etc.).
 */

export interface ApiClientConfig {
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
}

/** Placeholder — returns a no-op client */
export function createOpenAIClient(_config: ApiClientConfig) {
  return { provider: 'openai' as const, config: _config };
}

/** Placeholder — returns a no-op client */
export function createAnthropicClient(_config: ApiClientConfig) {
  return { provider: 'anthropic' as const, config: _config };
}

/** Placeholder — returns a no-op client */
export function createGoogleClient(_config: ApiClientConfig) {
  return { provider: 'google' as const, config: _config };
}
