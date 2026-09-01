/**
 * Tipos y parser de la respuesta del análisis.
 *
 * El prompt de sistema ya no vive aquí: está en `worker/src/index.ts`, junto a
 * la API key. Si la app enviara el prompt, quien descubriera la URL del Worker
 * tendría un LLM de uso general gratis; enviando solo los datos de
 * entrenamiento, el endpoint no sirve para otra cosa. El precio es que cambiar
 * el prompt exige redesplegar el Worker, lo que además lo versiona con él.
 */

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
