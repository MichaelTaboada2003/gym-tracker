/**
 * The system prompt.
 *
 * It carries the legend for the compact format from `context.ts`, which is why
 * the data itself needs no field names: the schema is explained once per
 * request instead of being repeated on every line.
 *
 * Written in Spanish because the output is Spanish — asking in one language for
 * output in another wastes tokens and drifts.
 */
export const SYSTEM_PROMPT = `Eres un entrenador de fuerza analizando la última sesión de un levantador. Tu único trabajo es responder a dos preguntas: ¿progresó? y ¿qué debe hacer la próxima vez?

FORMATO DE LOS DATOS
Recibes un encabezado de sesión y después un bloque por ejercicio:
  #Nombre|Músculo|meta SERIESxREPS
  0d 82.5x8,8,7@8,8,9 e104
  3d 80x8,8,7 e101
- \`Nd\` = hace N días. \`0d\` es la sesión que analizas.
- \`peso x reps,reps,reps\` = series consecutivas con ese peso. Si el peso cambia, van grupos separados por espacio: \`80x8 82.5x8 85x6\`.
- \`@\` = RPE de cada serie (6 a 10). \`bw\` = peso corporal.
- \`eNNN\` = 1RM estimado de esa sesión, ya calculado. Úsalo tal cual, no lo recalcules.
- \`meta\` es lo que la rutina pedía. Compárala con lo que realmente hizo.

CÓMO ANALIZAR
- Compara siempre contra las sesiones anteriores del MISMO ejercicio.
- Hay progreso si sube el peso a igualdad de reps, si suben las reps al mismo peso, o si hace el mismo trabajo con menos RPE.
- Hay estancamiento si dos o más sesiones seguidas no mejoran en ninguna de las tres.
- Si las reps caen dentro de la propia sesión (15,15,14,12), dilo: eso es fatiga, no falta de fuerza.
- Mira la densidad de sesiones y el peso corporal antes de atribuir un mal día a la falta de esfuerzo.
- Si un ejercicio solo tiene la línea \`0d\`, es la primera vez: no inventes una comparación.

REGLAS
- Usa únicamente los números que te doy. No inventes pesos, repeticiones, series, fechas ni marcas.
- Cuenta las series contando los valores de repeticiones de esa línea: \`bwx8,8,7\` son tres series, no cuatro. Si un dato no aparece en la línea, no lo menciones.
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

export type Trend = 'up' | 'down' | 'flat' | 'new';

export interface ExerciseVerdict {
    trend: Trend;
    exercise: string;
    diagnosis: string;
    action: string;
}

export interface Analysis {
    summary: string;
    verdicts: ExerciseVerdict[];
    /** The untouched reply, kept so nothing is lost when parsing falls short. */
    raw: string;
}

const TRENDS: Trend[] = ['up', 'down', 'flat', 'new'];

/**
 * Parses the reply.
 *
 * Deliberately forgiving: a model that adds a stray bullet or bolds a name
 * should still produce a readable card, and anything unparseable survives in
 * `raw` so the UI can fall back to showing the reply verbatim.
 */
export function parseAnalysis(raw: string): Analysis {
    const lines = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    let summary = '';
    const verdicts: ExerciseVerdict[] = [];

    for (const line of lines) {
        const summaryMatch = line.match(/^\**RESUMEN\**\s*:\s*(.+)$/i);
        if (summaryMatch) {
            summary = summaryMatch[1].trim();
            continue;
        }

        // Tolerate leading bullets/markdown the model may add despite instructions.
        const cleaned = line.replace(/^[-*•\d.\s]+/, '');
        const parts = cleaned.split('|').map((part) => part.replace(/\*\*/g, '').trim());
        if (parts.length < 4) continue;

        const trend = parts[0].toLowerCase() as Trend;
        if (!TRENDS.includes(trend)) continue;

        verdicts.push({
            trend,
            exercise: parts[1],
            diagnosis: parts[2],
            action: parts.slice(3).join(' · '),
        });
    }

    // No structure recognised at all — treat the whole reply as the summary.
    if (!summary && verdicts.length === 0) {
        summary = raw.trim();
    }

    return { summary, verdicts, raw };
}
