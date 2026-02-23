/** App-wide constants */

export const APP_NAME = 'ContextHub AI';
export const APP_VERSION = '0.1.0';

/** Default context window limit (tokens) */
export const DEFAULT_CONTEXT_LIMIT = 128_000;

/** Maximum message length (characters) */
export const MAX_MESSAGE_LENGTH = 32_000;

/* ---- Context-window threshold percentages ---- */
export const CONTEXT_THRESHOLD_CAUTION = 60;
export const CONTEXT_THRESHOLD_CRITICAL = 85;
export const CONTEXT_THRESHOLD_BLOCK = 95;
