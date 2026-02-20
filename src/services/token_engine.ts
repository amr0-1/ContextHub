/**
 * Rough token estimator.
 *
 * Uses the common heuristic of ~4 characters per token for English text.
 * Replace with a proper tokenizer (e.g. tiktoken) for production accuracy.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // ~4 chars ≈ 1 token (GPT-family heuristic)
  return Math.ceil(text.length / 4);
}
