    /**
     * Google Gemini Provider Handler — Server Side (Phase 8.5).
     *
     * Uses the official `@google/genai` npm SDK.  The API key is read from
     * process.env.GEMINI_API_KEY (populated by dotenv) and is NEVER
     * passed from or exposed to the frontend.
     */

    import { GoogleGenAI } from '@google/genai';
    import type { ChatMessage, UnifiedResponse } from '../types.js';

    /* ------------------------------------------------------------------ */
    /*  Gemini-compatible content shapes                                   */
    /* ------------------------------------------------------------------ */

    interface GeminiPart {
    text: string;
    }

    interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
    }

    /* ------------------------------------------------------------------ */
    /*  Message mapping                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * Convert internal ChatMessage[] to Gemini's `contents` array.
     *
     * - `system` messages are extracted as a single `systemInstruction` string.
     * - `assistant` → `model` (Gemini role convention).
     * - Consecutive same-role turns are merged to satisfy Gemini's alternating
     *   turn requirement.
     */
    function toGeminiContents(messages: ChatMessage[]): {
    contents: GeminiContent[];
    systemInstruction?: string;
    } {
    let systemInstruction: string | undefined;
    const contents: GeminiContent[] = [];

    for (const msg of messages) {
        if (msg.role === 'system') {
        systemInstruction = systemInstruction
            ? `${systemInstruction}\n${msg.content}`
            : msg.content;
        continue;
        }

        const geminiRole: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';

        // Merge consecutive turns with the same role (Gemini requires strict alternation)
        const last = contents[contents.length - 1];
        if (last && last.role === geminiRole) {
        last.parts.push({ text: msg.content });
        } else {
        contents.push({ role: geminiRole, parts: [{ text: msg.content }] });
        }
    }

    return { contents, systemInstruction };
    }

    /* ------------------------------------------------------------------ */
    /*  Handler                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Send a message array to Google Gemini generateContent and return a
     * UnifiedResponse.  The client is instantiated per-request.
     *
     * Throws with `{ code: 'NO_API_KEY' }` when GEMINI_API_KEY is absent.
     */
    export async function sendToGemini(
    modelId: string,
    messages: ChatMessage[],
    ): Promise<UnifiedResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        const err = new Error('GEMINI_API_KEY is not configured on the server');
        (err as Error & { code: string }).code = 'NO_API_KEY';
        throw err;
    }

    // Lazy instantiation — key comes from env, never from the client
    const ai = new GoogleGenAI({ apiKey });

    const { contents, systemInstruction } = toGeminiContents(messages);

    const response = await ai.models.generateContent({
        model: modelId,
        contents,
        ...(systemInstruction && {
        config: { systemInstruction },
        }),
    });

    const reply = response.text ?? '';
    const meta = response.usageMetadata;

    return {
        reply,
        usage: {
        promptTokens: meta?.promptTokenCount ?? 0,
        completionTokens: meta?.candidatesTokenCount ?? 0,
        totalTokens: meta?.totalTokenCount ?? 0,
        },
    };
    }
