import type { Message } from '../types/messages';
import type { LLMResponse } from '../types/usage';
import type { Model } from '../types/models';
import { estimateTokens } from './token_engine';

/**
 * Send messages to an LLM and get a unified response.
 *
 * Currently returns a mock response; swap the body out
 * for a real fetch call when wiring up a live provider.
 */
export async function sendMessage(
  messages: Message[],
  model: Model,
): Promise<LLMResponse> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');

  const mockContent = generateMockReply(lastUserMsg?.content ?? '');
  const inputTokens = messages.reduce((sum, m) => sum + m.tokenCount, 0);
  const outputTokens = estimateTokens(mockContent);

  // keep TS happy — model is used for routing in a real impl
  void model;

  return {
    content: mockContent,
    usage: {
      inputTokens,
      outputTokens,
    },
  };
}

/* ------------------------------------------------------------------ */

function generateMockReply(userContent: string): string {
  const lower = userContent.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi')) {
    return "Hello! I'm Nexus AI, your intelligent assistant with full context-window transparency. I can help you with coding, analysis, creative writing, and much more. How can I assist you today?";
  }

  if (lower.includes('context') || lower.includes('token')) {
    return "Great question about context windows! The context window represents the maximum number of tokens an AI model can process in a single conversation. I track this in real-time so you always know exactly how much capacity remains. The meter at the top shows your current usage — green means plenty of room, amber means you're getting closer to the limit, and red means you're approaching capacity.";
  }

  if (lower.includes('code') || lower.includes('program')) {
    return "I'd be happy to help with coding! Here's a quick example:\n\n```typescript\nfunction greet(name: string): string {\n  return `Hello, ${name}! Welcome to Nexus AI.`;\n}\n\nconsole.log(greet('Developer'));\n```\n\nLet me know what language or framework you'd like to work with and I'll provide more detailed assistance.";
  }

  return `That's an interesting topic! Let me share some thoughts.\n\nI can help you explore this further by breaking it down into key components. The context window tracker above shows our conversation's token usage in real-time, so you'll always know how much capacity we have left for deeper analysis.\n\nWould you like me to elaborate on any specific aspect?`;
}
