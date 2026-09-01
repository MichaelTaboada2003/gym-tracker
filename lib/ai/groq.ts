/**
 * Groq client.
 *
 * The request goes straight from the device to Groq with the user's own key,
 * which is fine for a personal app: there is no server to proxy through and no
 * other user's key at stake.
 *
 * The key comes from Ajustes (AsyncStorage) first, falling back to
 * `EXPO_PUBLIC_GROQ_API_KEY`. Note that anything `EXPO_PUBLIC_*` is inlined into
 * the shipped JS bundle and can be read out of the app file, so the Ajustes
 * route is the safer one for a build you hand to anyone else.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.groq.com/openai/v1';

const KEYS = {
    apiKey: '@gym_tracker_groq_key',
    model: '@gym_tracker_groq_model',
} as const;

/**
 * Preference order, best first.
 *
 * Groq retires models — `llama-3.3-70b-versatile` was the obvious default when
 * this was written and had already been withdrawn by the time it first ran. So
 * nothing here is assumed to exist: `resolveModel()` picks the first of these
 * the account actually offers, and falls back to whatever it does offer.
 */
const PREFERRED_MODELS = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'groq/compound',
    'qwen/qwen3.8-27b',
    'llama-3.3-70b-versatile',
];

/** Only used as a last resort when the catalogue cannot be read at all. */
export const DEFAULT_MODEL = PREFERRED_MODELS[0];

/** Thrown for anything the user can act on; `message` is shown verbatim. */
export class GroqError extends Error {
    constructor(
        message: string,
        readonly kind: 'no-key' | 'auth' | 'model' | 'rate-limit' | 'network' | 'server'
    ) {
        super(message);
        this.name = 'GroqError';
    }
}

export async function getApiKey(): Promise<string | null> {
    const stored = await AsyncStorage.getItem(KEYS.apiKey);
    if (stored?.trim()) return stored.trim();
    // Build-time fallback, for anyone who prefers to bake it in knowingly.
    const fromEnv = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    return fromEnv?.trim() || null;
}

export async function setApiKey(key: string): Promise<void> {
    const trimmed = key.trim();
    if (trimmed) await AsyncStorage.setItem(KEYS.apiKey, trimmed);
    else await AsyncStorage.removeItem(KEYS.apiKey);
}

export async function getModel(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.model);
}

/**
 * The model to use: the one chosen in Ajustes, or the best one this account
 * offers, discovered once and remembered.
 */
export async function resolveModel(): Promise<string> {
    const stored = await AsyncStorage.getItem(KEYS.model);
    if (stored) return stored;

    try {
        const available = await listModels();
        const chosen =
            PREFERRED_MODELS.find((id) => available.some((m) => m.id === id)) ?? available[0]?.id;
        if (chosen) {
            await setModel(chosen);
            return chosen;
        }
    } catch {
        // Fall through: a failed lookup should not block the actual request,
        // which will surface its own, more specific error.
    }

    return DEFAULT_MODEL;
}

export async function setModel(model: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.model, model);
}

export async function hasApiKey(): Promise<boolean> {
    return (await getApiKey()) !== null;
}

interface CompletionResult {
    content: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
}

/** Turns a failed response into an error the user can actually act on. */
async function toError(response: Response): Promise<GroqError> {
    let detail = '';
    try {
        const body = await response.json();
        detail = body?.error?.message ?? '';
    } catch {
        detail = await response.text().catch(() => '');
    }

    switch (response.status) {
        case 401:
        case 403:
            return new GroqError('La API key no es válida. Revísala en Ajustes.', 'auth');
        case 404:
            return new GroqError(
                `El modelo no está disponible en tu cuenta. Elige otro en Ajustes.${detail ? `\n\n${detail}` : ''}`,
                'model'
            );
        case 429:
            return new GroqError('Has alcanzado el límite de peticiones de Groq. Prueba en un minuto.', 'rate-limit');
        case 400:
            return new GroqError(detail || 'Groq rechazó la petición.', 'model');
        default:
            return new GroqError(
                detail || `Groq respondió ${response.status}. Inténtalo de nuevo.`,
                'server'
            );
    }
}

/**
 * Reasoning models think before they answer, and that thinking is billed
 * against `max_tokens`. At 800 tokens, `gpt-oss-120b` spent 798 of them
 * reasoning and returned empty content — so the budget is generous and the
 * effort is capped.
 */
const MAX_TOKENS = 2000;

export async function complete(options: {
    system: string;
    user: string;
    maxTokens?: number;
    signal?: AbortSignal;
    /** Internal: guards the single automatic retry after a retired model. */
    isRetry?: boolean;
    /** Internal: set once `reasoning_effort` has been rejected by the model. */
    withoutReasoningEffort?: boolean;
}): Promise<CompletionResult> {
    const apiKey = await getApiKey();
    if (!apiKey) {
        throw new GroqError('Añade tu API key de Groq en Ajustes para usar el análisis.', 'no-key');
    }

    const model = await resolveModel();

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: options.system },
                    { role: 'user', content: options.user },
                ],
                // Low but not zero: the analysis should be consistent between
                // runs on the same data, not creative.
                temperature: 0.3,
                max_tokens: options.maxTokens ?? MAX_TOKENS,
                // Only reasoning models accept this. Rather than keep a list of
                // which ones do, it is sent and dropped if rejected.
                ...(options.withoutReasoningEffort ? {} : { reasoning_effort: 'low' }),
            }),
            signal: options.signal,
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        throw new GroqError('No se pudo conectar con Groq. Comprueba tu conexión.', 'network');
    }

    if (!response.ok) {
        const error = await toError(response);

        // This model does not take `reasoning_effort`; send it again without.
        if (/reasoning_effort/i.test(error.message) && !options.withoutReasoningEffort) {
            return complete({ ...options, withoutReasoningEffort: true });
        }

        // The saved model was withdrawn by Groq. Forget it, pick another and
        // retry once, so a retired model does not become the user's problem.
        if (error.kind === 'model' && !options.isRetry) {
            await AsyncStorage.removeItem(KEYS.model);
            return complete({ ...options, isRetry: true });
        }

        throw error;
    }

    const body = await response.json();
    const choice = body?.choices?.[0];
    const content = choice?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
        // Reasoning ran to the token ceiling before writing an answer.
        if (choice?.finish_reason === 'length') {
            throw new GroqError(
                'El modelo agotó su presupuesto de tokens razonando. Prueba con otro modelo en Ajustes.',
                'server'
            );
        }
        throw new GroqError('Groq devolvió una respuesta vacía.', 'server');
    }

    return {
        content: content.trim(),
        model: body?.model ?? model,
        promptTokens: body?.usage?.prompt_tokens ?? 0,
        completionTokens: body?.usage?.completion_tokens ?? 0,
    };
}

export interface GroqModel {
    id: string;
    contextWindow: number;
}

/**
 * Lists the models the key can actually use, so Ajustes never offers a model
 * that Groq has since retired.
 */
export async function listModels(): Promise<GroqModel[]> {
    const apiKey = await getApiKey();
    if (!apiKey) throw new GroqError('Añade primero tu API key de Groq.', 'no-key');

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
    } catch {
        throw new GroqError('No se pudo conectar con Groq.', 'network');
    }

    if (!response.ok) throw await toError(response);

    const body = await response.json();
    const models: GroqModel[] = (body?.data ?? [])
        .filter((entry: { id?: string }) => typeof entry.id === 'string')
        .map((entry: { id: string; context_window?: number }) => ({
            id: entry.id,
            contextWindow: entry.context_window ?? 0,
        }))
        // Whisper and guard models cannot hold this conversation.
        .filter((model: GroqModel) => !/whisper|tts|guard|prompt-?guard/i.test(model.id))
        .sort((a: GroqModel, b: GroqModel) => a.id.localeCompare(b.id));

    return models;
}
