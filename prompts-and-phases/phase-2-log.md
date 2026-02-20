# Phase 2: Model Registry System

**Project:** ContextHub
**Date:** 2026-02-20

## Implementation Plan

1.  **Research & Planning**: Analyzed existing codebase (`src/context`, `src/types`, `src/components`) to ensure seamless integration.
2.  **Type Definitions**: Updated `src/types/models.ts` to support `ModelProvider`, `ModelConfig`, and detailed model metadata (pricing, tokenizer).
3.  **Model Registry**: Created `src/models/registry.ts` as the single source of truth for model configurations (OpenAI, Google).
4.  **State Management**: Refactored `ConversationContext.tsx` to:
    - Initialize with a default model from the registry.
    - Provide `activeModel` and `allModels` to consumers.
    - Handle `SET_MODEL` actions to update the active model and recalculate context limits.
5.  **UI Component**: Created `ModelSelector` component (`src/components/ModelSelector`) to allow users to switch models.
6.  **Integration**: Added `ModelSelector` to the `Sidebar` component.

## File Manifest

### Created

- `src/models/registry.ts`: Centralized model configurations.
- `src/components/ModelSelector/ModelSelector.tsx`: Dropdown component for model selection.
- `src/components/ModelSelector/ModelSelector.module.css`: Styles for the selector.
- `prompts-and-phases/phase-2-log.md`: This documentation file.

### Modified

- `src/types/models.ts`: Enhanced `Model` interface and removed hardcoded values.
- `src/context/ConversationContext.tsx`: Integrated registry and updated state logic.
- `src/components/Sidebar/Sidebar.tsx`: Added `ModelSelector`.

## System Architecture

The **Model Registry** acts as the core configuration layer.

- **Data Flow**: `registry.ts` -> `ConversationContext` -> `UI Components` (Sidebar, ContextMeter).
- **State Updates**: When a user selects a model in `ModelSelector`, a `SET_MODEL` action is dispatched. The reducer updates `activeModelId` and recalculates the `contextLimit` based on the new model's capacity.
- **Context Meter**: Components like `ContextMeter` automatically reflect the new limits via the `useTokens` hook, which derives data from the updated context.
