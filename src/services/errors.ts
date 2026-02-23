/**
 * Standardized provider error classes (Phase 8).
 *
 * All provider handlers throw these typed errors so the frontend
 * can display meaningful, actionable messages without parsing
 * raw API responses.
 */

export type ProviderErrorCode =
  | 'RATE_LIMIT'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'INVALID_API_KEY'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR';

export class ProviderError extends Error {
  public readonly code: ProviderErrorCode;
  public readonly provider: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: ProviderErrorCode,
    provider: string,
    statusCode?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.provider = provider;
    this.statusCode = statusCode;
  }

  /** Human-readable message suitable for display in the chat UI. */
  get userMessage(): string {
    switch (this.code) {
      case 'RATE_LIMIT':
        return `Rate limit exceeded for ${this.provider}. Please wait a moment and try again.`;
      case 'CONTEXT_LENGTH_EXCEEDED':
        return `The message exceeds the context window for ${this.provider}. Try trimming or summarizing the conversation.`;
      case 'INVALID_API_KEY':
        return `Invalid API key for ${this.provider}. Please check your configuration.`;
      case 'NETWORK_ERROR':
        return `Unable to reach ${this.provider}. Check your network connection and try again.`;
      case 'PROVIDER_ERROR':
        return `${this.provider} returned an error: ${this.message}`;
    }
  }
}

/**
 * Map a raw HTTP status code + body to a standardized ProviderError.
 */
export function classifyApiError(
  status: number,
  body: string,
  provider: string,
): ProviderError {
  if (status === 429) {
    return new ProviderError(body, 'RATE_LIMIT', provider, status);
  }
  if (status === 401 || status === 403) {
    return new ProviderError(body, 'INVALID_API_KEY', provider, status);
  }
  if (status === 400 && body.toLowerCase().includes('context length')) {
    return new ProviderError(body, 'CONTEXT_LENGTH_EXCEEDED', provider, status);
  }
  if (status === 400 && body.toLowerCase().includes('token')) {
    return new ProviderError(body, 'CONTEXT_LENGTH_EXCEEDED', provider, status);
  }
  return new ProviderError(body, 'PROVIDER_ERROR', provider, status);
}
