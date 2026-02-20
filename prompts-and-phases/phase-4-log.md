# Phase 4 — Token Engine

**Project Name:** ContextHub AI  
**Phase:** 4 — Token Engine  
**Date:** 2026-02-20

---

## Implementation Plan

Phase 4 replaces the naive character-based token estimator with an accurate, model-aware
Token Engine powered by `js-tiktoken` for OpenAI models and calibrated heuristics for
Gemini/Claude models. Every call site that previously used `estimateTokens(text)` now
routes through the tokenizer-aware `countMessageTokens(content, tokenizerType)`.

### Steps Taken

1. **Library installation** — Added `js-tiktoken` (v1.0.x) as a runtime dependency. This
   is a lightweight JavaScript port of OpenAI's `tiktoken` library that bundles BPE rank
   data and exposes synchronous `getEncoding()` / `encode()` APIs.

2. **Token Engine rewrite** (`src/services/token_engine.ts`) — Replaced the single
   `estimateTokens` function with a full tokenizer-aware service:
   - `countMessageTokens(content, tokenizerType)` — dispatches to `js-tiktoken` for OpenAI
     encodings (`cl100k_base`, `o200k_base`) or to calibrated heuristics for Gemini/Claude.
   - `countConversationTokens(messages, tokenizerType)` — sums per-message token counts
     plus metadata overhead (4 tokens per message for role/separator markers, 3 tokens for
     reply priming).
   - `estimateTokens(text)` — retained as a legacy quick-estimate fallback.
   - Lazy encoder cache: `getEncoding()` is called once per encoding type and the `Tiktoken`
     instance is cached in a `Map` for all subsequent calls.

3. **Conversation Manager integration** — Updated `addMessage()` in `ConversationContext`
   to call `countMessageTokens(content, activeModel.tokenizer)` instead of the old
   `estimateTokens(content)`. Every message now has accurate `tokenCount` upon creation.

4. **Chat hook integration** — Updated `useChat` to use `countMessageTokens` with the
   active model's tokenizer for the `canSendMessage()` safety guard estimate.

5. **LLM service integration** — Updated `llm.ts` to use `countMessageTokens` with
   `model.tokenizer` when computing mock output token counts.

6. **Live Token Counter** — Added a real-time token preview to the `MessageInput` toolbar
   that shows `~N tokens` as the user types. The count is debounced (150 ms) to avoid
   expensive re-tokenization on every keystroke. Resets to hidden when the input is empty.

---

## Library Choice

**`js-tiktoken`** was chosen over alternatives for the following reasons:

| Criterion | js-tiktoken | gpt-tokenizer | tiktoken (WASM) |
|---|---|---|---|
| Accuracy | Exact BPE (official ranks) | Exact BPE | Exact BPE |
| Bundle approach | Bundled rank data | Bundled rank data | WASM binary |
| Encoding support | cl100k, o200k, p50k, r50k | cl100k, o200k | All |
| API simplicity | `getEncoding` → `encode` | Class-based | `init` → `encode` |
| Browser compat | Native JS, no WASM loader | Native JS | Needs WASM loader |
| Maintenance | OpenAI-adjacent community | Community | Official OpenAI |

`js-tiktoken` provides exact BPE token counts matching OpenAI's production tokenizer,
runs as pure JavaScript (no WASM initialization overhead), and supports both `o200k_base`
(GPT-4o) and `cl100k_base` (GPT-4/3.5) encodings that the Model Registry requires.

For **Gemini** and **Claude** models, no client-side tokenizer library exists. The service
is structured to call the Gemini `countTokens` API endpoint when API keys are configured;
until then, calibrated character-ratio heuristics serve as the offline fallback:
- Gemini (SentencePiece): ~3.5 chars/token
- Claude (BPE variant): ~3.7 chars/token

---

## File Manifest

| File | Status | Summary |
|---|---|---|
| `package.json` | Modified | Added `js-tiktoken` dependency |
| `src/services/token_engine.ts` | Modified | Full rewrite: `countMessageTokens`, `countConversationTokens`, encoder cache, fallback heuristics |
| `src/context/ConversationContext.tsx` | Modified | `addMessage` uses `countMessageTokens(content, activeModel.tokenizer)` |
| `src/hooks/useChat.ts` | Modified | Safety guard uses `countMessageTokens` with active model tokenizer |
| `src/services/llm.ts` | Modified | Mock output tokens use `countMessageTokens(content, model.tokenizer)` |
| `src/components/Chat/MessageInput.tsx` | Modified | Added live token counter with 150 ms debounce |
| `src/components/Chat/MessageInput.module.css` | Modified | Added `.liveCounter` styling |
| `prompts-and-phases/phase-4-log.md` | Created | This file |

---

## Technical Note: Message Metadata Overhead

OpenAI's ChatML format wraps each message with structural tokens that consume context
window capacity beyond the message content itself:

```
<|im_start|>role\n       ← 3 tokens (start marker, role, newline)
...message content...
<|im_end|>\n              ← 1 token  (end marker + newline)
─────────────────────
Total overhead per message: 4 tokens
```

Additionally, every API call includes **3 tokens** of reply priming overhead (the
`<|im_start|>assistant\n` prefix for the model's response).

The `countConversationTokens` function accounts for both:

```
total = 3 (reply priming)
      + Σ (content_tokens + 4)  for each message
```

This overhead model is applied uniformly across all tokenizer types for consistency,
since Gemini and Claude use comparable structural wrapping in their respective formats.

The per-message `tokenCount` stored on `Message` objects reflects **content tokens only**
(excluding overhead), while `countConversationTokens` adds the structural overhead when
computing total context window consumption. This separation allows the UI to show
meaningful per-message counts while the Conversation Manager tracks accurate cumulative
usage.
