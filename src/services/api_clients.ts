/**
 * API Client configuration and key management.
 *
 * Re-exports the Phase 8 provider key management from provider_manager
 * for convenient access from UI/settings code.
 */

export { setApiKey, hasApiKey } from './provider_manager';

export interface ApiClientConfig {
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
}
