/**
 * Gym Tracker — proxy de análisis.
 *
 * Existe por una sola razón: la API key de Groq no puede viajar dentro del APK.
 * Cualquier variable `EXPO_PUBLIC_*` queda incrustada en el bundle y se extrae
 * con `unzip app.apk && strings assets/index.android.bundle | grep gsk_`. Aquí
 * la key vive como secreto del Worker y nunca sale de Cloudflare.
 *
 * El Worker también es dueño del prompt de sistema, no solo de la key. Si la app
 * enviara el prompt, quien descubriera la URL tendría un LLM gratuito de uso
 * general; enviando únicamente los datos de entrenamiento, el endpoint no sirve
 * para nada más.
 */

export interface Env {
    /** Secreto: `wrangler secret put GROQ_API_KEY` */
    GROQ_API_KEY: string;
    /** Opcional. Si no se define, se resuelve contra el catálogo de la cuenta. */
    GROQ_MODEL?: string;
    /**
     * Opcional. Si se define, la app debe enviar la misma cadena en la cabecera
     * `X-App-Token`. No es seguridad real —también se puede extraer del APK—
     * pero corta el escaneo automático de endpoints abiertos.
     */
    APP_TOKEN?: string;
}

const GROQ_URL = 'https://api.groq.com/openai/v1';

/** Groq retira modelos; el primero que exista en la cuenta gana. */
const PREFERRED_MODELS = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'groq/compound',
    'qwen/qwen3.8-27b',
];

/** Una sesión larga ronda los 2 KB. Por encima de esto no son datos de gimnasio. */
const MAX_CONTEXT_BYTES = 8_000;

const SYSTEM_PROMPT = `Eres un entrenador de fuerza analizando la última sesión de un levantador. Tu único trabajo es responder a dos preguntas: ¿progresó? y ¿qué debe hacer la próxima vez?

FORMATO DE LOS DATOS
Recibes un encabezado de sesión y después un bloque por ejercicio:
  #Nombre|Músculo|meta SERIESxREPS|descNNNs
  hace6d 78kgx8,8,6 e98
  hace3d 80kgx8,8,7 e101 c151,155
  HOY 82.5kgx8,8,7@8,8,9 e104 c162,148
- Las líneas van en orden cronológico: la más antigua arriba y la sesión que debes analizar abajo, marcada \`HOY\`. \`haceNd\` es hace N días.
- \`PESOkg x reps,reps,reps\` = series consecutivas con ese peso. El número antes de \`kg\` es la CARGA, nunca el número de series: \`3kgx8,8,7\` son tres series de 8, 8 y 7 repeticiones con 3 kg. El número de series se cuenta contando las repeticiones. Si el peso cambia, van grupos separados por espacio: \`80kgx8 82.5kgx8 85kgx6\`.
- \`@\` = RPE de cada serie (6 a 10). \`bw\` = peso corporal.
- \`eNNN\` = 1RM estimado de esa sesión, ya calculado. Úsalo tal cual, no lo recalcules.
- \`meta\` es lo que la rutina pedía. Compárala con lo que realmente hizo.
- \`descNNNs\` = descanso que la rutina planifica entre series.
- \`cNN,NN\` = segundos reales entre series consecutivas (una cifra menos que series). **Incluye descanso Y ejecución juntos**, porque solo se registra el momento de terminar cada serie: nunca lo presentes como tiempo de descanso puro ni deduzcas de ahí el tempo por repetición. Si no aparece \`c\`, esa sesión no tiene datos de tiempo: no comentes nada sobre ritmo.

CÓMO ANALIZAR
- Compara siempre contra las sesiones anteriores del MISMO ejercicio.
- Hay progreso si sube el peso a igualdad de reps, si suben las reps al mismo peso, o si hace el mismo trabajo con menos RPE.
- Hay estancamiento si dos o más sesiones seguidas no mejoran en ninguna de las tres.
- Si las reps caen dentro de la propia sesión (15,15,14,12), dilo: eso es fatiga, no falta de fuerza.
- Compara \`c\` con \`desc\`. Si los intervalos quedan muy por debajo del descanso planificado y además caen las reps, la causa más probable es descanso insuficiente, no pérdida de fuerza: dilo así. Si son mucho mayores, la sesión se está alargando y conviene señalarlo. Un margen de ±30 s no merece comentario.
- Mira la densidad de sesiones y el peso corporal antes de atribuir un mal día a la falta de esfuerzo.
- Si un ejercicio solo tiene la línea \`0d\`, es la primera vez: no inventes una comparación.

REGLAS
- Usa únicamente los números que te doy. No inventes pesos, repeticiones, series, fechas ni marcas.
- Cuenta las series contando los valores de repeticiones de esa línea: \`bwx8,8,7\` son tres series. Nunca confundas la carga con el número de series. Si un dato no aparece en la línea, no lo menciones.
- Las recomendaciones son concretas: pesos y repeticiones exactos, nunca "aumenta gradualmente".
- Incrementos realistas: 2,5 kg en básicos con barra; 1 o 2 kg en aislamiento y mancuernas.
- Nada de consejos médicos ni de nutrición.
- Español, tuteo, sin emojis y sin relleno motivacional.

FORMATO DE SALIDA (exacto, sin markdown y sin texto adicional)
Primera línea: \`RESUMEN: \` y una o dos frases sobre la sesión en conjunto.
Después, una línea por cada ejercicio que merezca comentario, como máximo seis:

tendencia|Nombre del ejercicio|Qué ha pasado, con números|Qué hacer la próxima vez

\`tendencia\` es exactamente una de: up, down, flat, new
- up: mejoró respecto a la sesión anterior
- down: empeoró
- flat: igual o estancado
- new: primera vez, sin histórico

Omite los ejercicios sobre los que no haya nada relevante que decir.`;

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
};

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS },
    });
}

/** Elige un modelo que la cuenta ofrezca de verdad. */
async function resolveModel(env: Env): Promise<string> {
    if (env.GROQ_MODEL) return env.GROQ_MODEL;

    const response = await fetch(`${GROQ_URL}/models`, {
        headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
    });
    if (!response.ok) return PREFERRED_MODELS[0];

    const body = (await response.json()) as { data?: { id: string }[] };
    const available = new Set((body.data ?? []).map((m) => m.id));
    return PREFERRED_MODELS.find((id) => available.has(id)) ?? PREFERRED_MODELS[0];
}

async function callGroq(env: Env, context: string, model: string, withEffort: boolean): Promise<Response> {
    return fetch(`${GROQ_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: context },
            ],
            temperature: 0.3,
            // Los modelos de razonamiento gastan `max_tokens` pensando: con 800,
            // gpt-oss consumió 798 razonando y devolvió contenido vacío.
            max_tokens: 2000,
            ...(withEffort ? { reasoning_effort: 'low' } : {}),
        }),
    });
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

        const url = new URL(request.url);
        if (url.pathname === '/health') return json({ ok: true });
        if (request.method !== 'POST' || url.pathname !== '/analyze') {
            return json({ error: 'No encontrado' }, 404);
        }

        if (!env.GROQ_API_KEY) {
            return json({ error: 'El servidor no tiene configurada la API key.' }, 500);
        }
        if (env.APP_TOKEN && request.headers.get('X-App-Token') !== env.APP_TOKEN) {
            return json({ error: 'No autorizado.' }, 401);
        }

        let context: string;
        try {
            const body = (await request.json()) as { context?: unknown };
            if (typeof body.context !== 'string' || !body.context.trim()) {
                return json({ error: 'Falta el contexto de entrenamiento.' }, 400);
            }
            context = body.context;
        } catch {
            return json({ error: 'Cuerpo de petición no válido.' }, 400);
        }

        if (context.length > MAX_CONTEXT_BYTES) {
            return json({ error: 'El contexto es demasiado grande.' }, 413);
        }

        try {
            let model = await resolveModel(env);
            let response = await callGroq(env, context, model, true);

            // Este modelo no acepta `reasoning_effort`: repetir sin él.
            if (response.status === 400) {
                const detail = await response.clone().text();
                if (/reasoning_effort/i.test(detail)) {
                    response = await callGroq(env, context, model, false);
                }
            }

            // El modelo configurado ya no existe: resolver otro y reintentar.
            if (response.status === 404 && env.GROQ_MODEL) {
                model = PREFERRED_MODELS[0];
                response = await callGroq(env, context, model, true);
            }

            if (!response.ok) {
                const detail = (await response.json().catch(() => ({}))) as {
                    error?: { message?: string };
                };
                // El estado se traduce aquí para no filtrar detalles de Groq a la app.
                const message =
                    response.status === 429
                        ? 'El servicio está saturado ahora mismo. Prueba en un minuto.'
                        : (detail.error?.message ?? 'El servicio de análisis falló.');
                return json({ error: message }, response.status === 429 ? 429 : 502);
            }

            const body = (await response.json()) as {
                model?: string;
                choices?: { message?: { content?: string }; finish_reason?: string }[];
                usage?: { prompt_tokens?: number; completion_tokens?: number };
            };

            const choice = body.choices?.[0];
            const content = choice?.message?.content?.trim();

            if (!content) {
                return json(
                    {
                        error:
                            choice?.finish_reason === 'length'
                                ? 'El modelo agotó sus tokens razonando. Inténtalo de nuevo.'
                                : 'El servicio devolvió una respuesta vacía.',
                    },
                    502
                );
            }

            return json({
                content,
                model: body.model ?? model,
                promptTokens: body.usage?.prompt_tokens ?? 0,
                completionTokens: body.usage?.completion_tokens ?? 0,
            });
        } catch {
            return json({ error: 'No se pudo contactar con el servicio de análisis.' }, 502);
        }
    },
};
