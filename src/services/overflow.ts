import type { Message } from '../types/messages';
import type { Model } from '../types/models';
import type { Conversation } from '../types/usage';
import { countMessageTokens } from './token_engine';

/* ------------------------------------------------------------------ */
/*  Summarize                                                          */
/* ------------------------------------------------------------------ */

const SUMMARIZE_SYSTEM_PROMPT =
  'Summarize the following conversation while retaining key technical details, ' +
  'context, decisions made, and any code snippets discussed. Keep the summary ' +
  'concise but comprehensive enough to continue the conversation seamlessly.';

/**
 * Build a summary prompt from the current message history.
 */
export function buildSummaryPrompt(messages: Message[]): string {
  const transcript = messages
    .map((m) => `[${m.role}]: ${m.content}`)
    .join('\n\n');
  return `${SUMMARIZE_SYSTEM_PROMPT}\n\n---\n\n${transcript}`;
}

/**
 * Create a new messages array containing only the summary as a system message.
 */
export function buildSummarizedMessages(
  summaryContent: string,
  model: Model,
): Message[] {
  return [
    {
      id: crypto.randomUUID(),
      role: 'system',
      content: `[Conversation Summary]\n${summaryContent}`,
      tokenCount: countMessageTokens(summaryContent, model.tokenizer),
      timestamp: Date.now(),
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Trim oldest messages                                               */
/* ------------------------------------------------------------------ */

/**
 * Remove the oldest `pairsToTrim` user/assistant message pairs.
 * Preserves leading system messages. Leaves at least 1 message.
 */
export function trimOldestPairs(
  messages: Message[],
  pairsToTrim: number,
): Message[] {
  if (pairsToTrim <= 0 || messages.length === 0) return messages;

  // Separate leading system messages
  let systemEnd = 0;
  while (systemEnd < messages.length && messages[systemEnd].role === 'system') {
    systemEnd++;
  }

  const systemMessages = messages.slice(0, systemEnd);
  const chatMessages = messages.slice(systemEnd);

  let pairsDropped = 0;
  let dropIndex = 0;

  while (dropIndex < chatMessages.length && pairsDropped < pairsToTrim) {
    const msg = chatMessages[dropIndex];
    dropIndex++;

    if (msg.role === 'user') {
      if (
        dropIndex < chatMessages.length &&
        chatMessages[dropIndex].role === 'assistant'
      ) {
        dropIndex++;
      }
      pairsDropped++;
    } else if (msg.role === 'assistant') {
      pairsDropped++;
    }
  }

  const remaining = chatMessages.slice(dropIndex);

  // Safety: never return a completely empty array if there were messages
  if (remaining.length === 0 && chatMessages.length > 0) {
    return [...systemMessages, chatMessages[chatMessages.length - 1]];
  }

  return [...systemMessages, ...remaining];
}

/* ------------------------------------------------------------------ */
/*  Find larger-context models                                         */
/* ------------------------------------------------------------------ */

/**
 * Return models with a strictly larger context window, sorted largest-first.
 */
export function findLargerModels(
  currentModel: Model,
  allModels: Model[],
): Model[] {
  return allModels
    .filter((m) => m.contextWindow > currentModel.contextWindow)
    .sort((a, b) => b.contextWindow - a.contextWindow);
}

/* ------------------------------------------------------------------ */
/*  Export conversation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Download the conversation as a JSON file.
 */
export function exportConversation(conversation: Conversation): void {
  const payload = {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model.name,
    messages: conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
      tokenCount: m.tokenCount,
      timestamp: m.timestamp,
    })),
    usage: conversation.usage,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contexthub-${conversation.id.slice(0, 8)}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Recalculate usage from messages                                    */
/* ------------------------------------------------------------------ */

/**
 * Recompute token usage from a fresh set of messages.
 * Used after summarize/trim to reset cumulative counters.
 */
export function recalculateUsage(
  messages: Message[],
): { totalInputTokens: number; totalOutputTokens: number } {
  let totalInput = 0;
  let totalOutput = 0;

  for (const msg of messages) {
    const tokens = msg.tokenCount ?? 0;
    if (msg.role === 'assistant') {
      totalOutput += tokens;
    } else {
      totalInput += tokens;
    }
  }

  return { totalInputTokens: totalInput, totalOutputTokens: totalOutput };
}
