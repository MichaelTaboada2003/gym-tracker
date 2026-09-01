import { useCallback, useEffect, useRef, useState } from 'react';
import { generateId, storage } from '../lib/localDatabase';
import { buildAnalysisContext, AnalysisContext } from '../lib/ai/context';
import { complete, GroqError, hasApiKey } from '../lib/ai/groq';
import { Analysis, parseAnalysis, SYSTEM_PROMPT } from '../lib/ai/prompt';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export interface AnalysisState {
    status: Status;
    analysis: Analysis | null;
    /** True once a key is configured; the UI points at Ajustes when it is not. */
    configured: boolean;
    /** Compact payload preview, so the cost is visible before spending it. */
    context: AnalysisContext | null;
    error: string | null;
    /** Set when the saved analysis was read back rather than generated now. */
    generatedAt: string | null;
    model: string | null;
    tokensUsed: number | null;
}

/**
 * Analysis for one session: reads back a saved verdict, or generates one on
 * demand.
 *
 * Nothing here runs automatically — a request costs tokens and takes seconds,
 * so it happens only when the user asks for it.
 */
export function useWorkoutAnalysis(sessionId: string | null) {
    const [state, setState] = useState<AnalysisState>({
        status: 'idle',
        analysis: null,
        configured: false,
        context: null,
        error: null,
        generatedAt: null,
        model: null,
        tokensUsed: null,
    });

    const abortRef = useRef<AbortController | null>(null);

    /** Loads the saved analysis (if any) and prepares the payload preview. */
    const load = useCallback(async () => {
        if (!sessionId) return;

        const [configured, saved, context] = await Promise.all([
            hasApiKey(),
            storage.analyses.getBySessionId(sessionId),
            buildAnalysisContext(sessionId),
        ]);

        setState({
            status: saved ? 'ready' : 'idle',
            analysis: saved ? parseAnalysis(saved.raw) : null,
            configured,
            context,
            error: null,
            generatedAt: saved?.created_at ?? null,
            model: saved?.model ?? null,
            tokensUsed: saved ? saved.prompt_tokens + saved.completion_tokens : null,
        });
    }, [sessionId]);

    const generate = useCallback(async () => {
        if (!sessionId) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setState((prev) => ({ ...prev, status: 'loading', error: null }));

        try {
            const context = await buildAnalysisContext(sessionId);
            if (!context) {
                setState((prev) => ({
                    ...prev,
                    status: 'error',
                    error: 'No hay series registradas en esta sesión.',
                }));
                return;
            }

            const result = await complete({
                system: SYSTEM_PROMPT,
                user: context.text,
                signal: controller.signal,
            });

            await storage.analyses.upsert({
                id: generateId(),
                session_id: sessionId,
                created_at: new Date().toISOString(),
                model: result.model,
                raw: result.content,
                prompt_tokens: result.promptTokens,
                completion_tokens: result.completionTokens,
            });

            setState({
                status: 'ready',
                analysis: parseAnalysis(result.content),
                configured: true,
                context,
                error: null,
                generatedAt: new Date().toISOString(),
                model: result.model,
                tokensUsed: result.promptTokens + result.completionTokens,
            });
        } catch (error) {
            // A cancelled request is a navigation, not a failure.
            if (error instanceof Error && error.name === 'AbortError') return;

            console.error('[analysis] failed:', error);
            setState((prev) => ({
                ...prev,
                status: 'error',
                error:
                    error instanceof GroqError
                        ? error.message
                        : 'No se pudo generar el análisis. Inténtalo de nuevo.',
            }));
        }
    }, [sessionId]);

    useEffect(() => {
        void load();
        return () => abortRef.current?.abort();
    }, [load]);

    return { ...state, generate, reload: load };
}
