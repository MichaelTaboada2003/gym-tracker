/**
 * Cliente del proxy de análisis.
 *
 * La app ya no conoce ninguna API key. Envía los datos de entrenamiento al
 * Worker de Cloudflare y este habla con Groq usando una key que vive como
 * secreto del servidor. Ver `worker/README.md`.
 *
 * Lo que sí viaja dentro del APK es la URL del Worker y, si se configura, un
 * token compartido. Ninguno de los dos es un secreto real —ambos se extraen del
 * bundle— pero una URL no cuesta dinero si se filtra y el token corta el escaneo
 * automático de endpoints abiertos.
 */

const BASE_URL = process.env.EXPO_PUBLIC_ANALYSIS_URL?.replace(/\/+$/, '') ?? '';
const APP_TOKEN = process.env.EXPO_PUBLIC_ANALYSIS_TOKEN ?? '';

/** Errores con mensaje ya redactado para enseñar al usuario. */
export class AnalysisError extends Error {
    constructor(
        message: string,
        readonly kind: 'not-configured' | 'network' | 'rate-limit' | 'server'
    ) {
        super(message);
        this.name = 'AnalysisError';
    }
}

/** False cuando no se ha compilado con una URL de proxy. */
export function isConfigured(): boolean {
    return BASE_URL.length > 0;
}

/** La URL a la que apunta esta build, para el diagnóstico de Ajustes. */
export function getEndpoint(): string {
    return BASE_URL;
}

function headers(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        ...(APP_TOKEN ? { 'X-App-Token': APP_TOKEN } : {}),
    };
}

export interface AnalysisResult {
    content: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
}

export async function analyse(context: string, signal?: AbortSignal): Promise<AnalysisResult> {
    if (!isConfigured()) {
        throw new AnalysisError(
            'Esta versión de la app no tiene configurado el servicio de análisis.',
            'not-configured'
        );
    }

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}/analyze`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ context }),
            signal,
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        throw new AnalysisError('No se pudo conectar con el servicio. Comprueba tu conexión.', 'network');
    }

    const body = (await response.json().catch(() => ({}))) as {
        content?: string;
        model?: string;
        promptTokens?: number;
        completionTokens?: number;
        error?: string;
    };

    if (!response.ok) {
        // El Worker ya devuelve mensajes redactados; se muestran tal cual.
        throw new AnalysisError(
            body.error ?? 'El servicio de análisis no está disponible.',
            response.status === 429 ? 'rate-limit' : 'server'
        );
    }

    if (!body.content) {
        throw new AnalysisError('El servicio devolvió una respuesta vacía.', 'server');
    }

    return {
        content: body.content,
        model: body.model ?? 'desconocido',
        promptTokens: body.promptTokens ?? 0,
        completionTokens: body.completionTokens ?? 0,
    };
}

/** Comprueba que el Worker responde. Usado por el diagnóstico de Ajustes. */
export async function checkHealth(): Promise<boolean> {
    if (!isConfigured()) return false;
    try {
        const response = await fetch(`${BASE_URL}/health`, { headers: headers() });
        return response.ok;
    } catch {
        return false;
    }
}
