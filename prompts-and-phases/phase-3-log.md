# Phase 3 — Conversation Manager

**Project Name:** ContextHub AI  
**Phase:** 3 — Conversation Manager  
**Date:** 2026-02-20

---

## Implementation Plan

Phase 3 centralises all conversation logic into the `ConversationProvider`, transforming it
from a thin state container into a full **Conversation Manager** that owns message creation,
context-window tracking, and safety enforcement.

### Steps Taken

1. **Schema hardening** — Updated `Message` (made `tokenCount` optional for future
   flexibility) and extended `UsageMetadata` with `totalUsedTokens` and `remainingTokens`
   fields. Introduced `ContextLevel` and `ContextStatus` types for standardised status reporting.

2. **Conversation Manager core** — Refactored `ConversationProvider` to expose three new
   capabilities through context:
   - `addMessage(role, content)` — single entry-point for message creation (UUID, token
     estimation, timestamp) that dispatches to the reducer and returns the created `Message`.
   - `contextStatus` — memoised derived state (`used`, `remaining`, `percent`, `level`)
     computed from cumulative token usage and the active model's context window.
   - `canSendMessage(estimatedTokens)` — safety guard that prevents API calls when the
     projected usage would exceed 95 % of the context window.

3. **Reducer enhancements** — `UPDATE_USAGE` and `SET_MODEL` actions now recompute
   `totalUsedTokens` and `remainingTokens` in-place, keeping the `UsageMetadata` slice
   fully consistent after every dispatch.

4. **Hook updates** — `useTokens` delegates to the manager's `contextStatus` (eliminating
   duplicated derivation logic) and now surfaces `level`. `useChat` uses `addMessage` instead
   of manually constructing `Message` objects and integrates the `canSendMessage` guard before
   each LLM call.

5. **UI sync** — `ContextMeter` reads `level` from the hook and uses it for severity
   colouring (CSS classes renamed from `healthy`/`warning` to `safe`/`caution`).
   `MessageList` defensively renders `msg.tokenCount ?? 0` to handle the optional field.

6. **Service compatibility** — `llm.ts` updated to handle the now-optional `tokenCount`
   on `Message` (`m.tokenCount ?? 0`).

---

## File Manifest

| File | Status | Summary |
|---|---|---|
| `src/types/messages.ts` | Modified | `tokenCount` made optional (`tokenCount?: number`) |
| `src/types/usage.ts` | Modified | Added `totalUsedTokens`, `remainingTokens` to `UsageMetadata`; new `ContextLevel` and `ContextStatus` types |
| `src/context/ConversationContext.tsx` | Modified | Added `addMessage()`, `contextStatus`, `canSendMessage()`; updated reducer for new usage fields |
| `src/hooks/useTokens.ts` | Modified | Delegates to `contextStatus` from context; exposes `level` |
| `src/hooks/useChat.ts` | Modified | Uses `addMessage()` + `canSendMessage()` guard; removed manual `Message` construction |
| `src/services/llm.ts` | Modified | Handles optional `tokenCount` (`?? 0`) |
| `src/components/ContextMeter/ContextMeter.tsx` | Modified | Uses `level` from hook instead of local severity calculation |
| `src/components/ContextMeter/ContextMeter.module.css` | Modified | Renamed `.healthy` → `.safe`, `.warning` → `.caution` |
| `src/components/Chat/MessageList.tsx` | Modified | Token badge renders `msg.tokenCount ?? 0` |
| `prompts-and-phases/phase-3-log.md` | Created | This file |

---

## Logic Summary

### Context Status Levels

The Conversation Manager computes a `ContextStatus` object from the cumulative input + output
token counts and the active model's `contextWindow`:

| Level | Condition | Meaning |
|---|---|---|
| **safe** | `percent < 60 %` | Plenty of context remaining — green UI indicators |
| **caution** | `60 % ≤ percent < 85 %` | Approaching capacity — amber UI indicators |
| **critical** | `percent ≥ 85 %` | Near limit — red UI indicators |

A separate **safety guard** (`canSendMessage`) blocks new API calls when the *projected*
usage (current used + estimated new tokens) would reach **≥ 95 %** of the context window,
preventing wasted API calls and potential truncation errors.

### Interaction with the Model Registry

```
  MODEL_REGISTRY (registry.ts)
        │
        │  getModel(id)
        ▼
  ConversationProvider
        │
        ├─ state.activeModelId ── resolves to ─── models.active (Model)
        │                                              │
        │                                    contextWindow ────┐
        │                                                      │
        ├─ state.conversation.usage                            │
        │     totalInputTokens ─────┐                          │
        │     totalOutputTokens ────┤                          │
        │                           ▼                          ▼
        │               deriveContextStatus(input, output, contextWindow)
        │                           │
        │                           ▼
        ├─ contextStatus: { used, remaining, percent, level }
        │
        ├─ canSendMessage(est) ── (used + est) / contextWindow < 0.95
        │
        └─ addMessage(role, content) ── creates Message ── dispatches ADD_MESSAGE
```

When the user switches models via the `ModelSelector`, the `SET_MODEL` action updates
`activeModelId`, resolves the new `Model` from the registry, and recalculates
`remainingTokens` and `contextLimit` using the new model's `contextWindow`. The memoised
`contextStatus` recomputes automatically, causing the `ContextMeter` and any guard checks
to reflect the new capacity instantly.
