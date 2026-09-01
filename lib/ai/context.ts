/**
 * Builds the training context sent to the model.
 *
 * The whole point of this module is density. A session of six exercises with
 * four sessions of history each is ~4 000 tokens as raw JSON; the line format
 * below carries the same information in roughly 450. That matters because the
 * context is re-sent on every analysis and the model is paid per token.
 *
 * The format, one exercise per block:
 *
 *     #Press Banca Plano|Pecho|3x6-8
 *     0d 82.5kgx8,8,7@8,8,9 e104
 *     3d 80kgx8,8,7 e101
 *     10d 80kgx8,8,6 e101
 *
 * `0d` is today; `3d` means three days ago. Consecutive sets at the same weight
 * collapse into one group (`82.5kgx8,8,7` = three sets at 82.5 kg). Mixed weights
 * are space-separated groups (`80kgx8 82.5kgx8 85kgx6`). `@` carries RPE, `bw`
 * means bodyweight, and `eNNN` is the estimated 1RM for that session —
 * precomputed because arithmetic is exactly what a model should not be doing.
 *
 * The legend lives in the system prompt, so it is paid for once per request
 * rather than repeated inside the data.
 */

import { storage } from '../localDatabase';
import { WorkoutLog } from '../database.types';
import { calculate1RM, daysBetween, formatWeight, toISODate } from '../utils';

/** How many previous sessions of the same exercise to include. */
const HISTORY_DEPTH = 4;

export interface AnalysisContext {
    /** The compact text handed to the model. */
    text: string;
    /** Rough token count (~4 chars/token) so the UI can show the cost up front. */
    estimatedTokens: number;
    exerciseCount: number;
    /** True when there is no prior data — the prompt asks for a different answer then. */
    isFirstSession: boolean;
}

interface SetLine {
    weight: number;
    reps: number;
    rpe: number | null;
}

/** Collapses consecutive same-weight sets: `82.5x8,8,7@8,8,9`. */
function serialiseSets(sets: SetLine[]): string {
    const groups: { weight: number; reps: number[]; rpe: (number | null)[] }[] = [];

    for (const set of sets) {
        const last = groups[groups.length - 1];
        if (last && last.weight === set.weight) {
            last.reps.push(set.reps);
            last.rpe.push(set.rpe);
        } else {
            groups.push({ weight: set.weight, reps: [set.reps], rpe: [set.rpe] });
        }
    }

    return groups
        .map((group) => {
            // La unidad no es decorativa: `3x8,8,7` se lee como "3 series de 8"
            // en notación de gimnasio, y el campo `meta` de la misma línea sí usa
            // esa convención. `3kgx8,8,7` no admite esa lectura.
            const weight = group.weight === 0 ? 'bw' : `${formatWeight(group.weight)}kg`;
            const base = `${weight}x${group.reps.join(',')}`;
            // RPE is only worth its tokens when it was actually logged for every set.
            const complete = group.rpe.every((value) => value != null);
            return complete ? `${base}@${group.rpe.join(',')}` : base;
        })
        .join(' ');
}

function bestE1RM(sets: SetLine[]): number {
    return Math.round(sets.reduce((best, set) => Math.max(best, calculate1RM(set.weight, set.reps)), 0));
}

function volume(sets: SetLine[]): number {
    return sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
}

/**
 * Assembles the context for one session.
 *
 * Returns `null` when the session no longer exists or logged nothing.
 */
export async function buildAnalysisContext(sessionId: string): Promise<AnalysisContext | null> {
    const [sessions, logs, exercises, routines, routineExercises, weights] = await Promise.all([
        storage.workoutSessions.getAll(),
        storage.workoutLogs.getAll(),
        storage.exercises.getAll(),
        storage.routines.getAll(),
        storage.routineExercises.getAll(),
        storage.bodyWeight.getAll(),
    ]);

    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;

    const exercisesById = new Map(exercises.map((e) => [e.id, e]));
    const sessionDate = new Map(sessions.map((s) => [s.id, s.session_date]));

    // exercise -> session -> its work sets, ordered as performed.
    const byExercise = new Map<string, Map<string, SetLine[]>>();
    for (const log of logs) {
        if (log.is_warmup) continue;
        let perSession = byExercise.get(log.exercise_id);
        if (!perSession) {
            perSession = new Map();
            byExercise.set(log.exercise_id, perSession);
        }
        const bucket = perSession.get(log.session_id) ?? [];
        bucket.push({ weight: Number(log.weight_kg) || 0, reps: log.reps || 0, rpe: log.rpe });
        perSession.set(log.session_id, bucket);
    }

    const todaysLogs = logs.filter((l) => l.session_id === sessionId && !l.is_warmup);
    if (todaysLogs.length === 0) return null;

    // Preserve the order the exercises were trained in.
    const orderedExerciseIds: string[] = [];
    for (const log of todaysLogs) {
        if (!orderedExerciseIds.includes(log.exercise_id)) orderedExerciseIds.push(log.exercise_id);
    }

    // Routine targets, so the model can say "hiciste 2 de 3 series".
    const routine = session.routine_id ? routines.find((r) => r.id === session.routine_id) : undefined;
    const targets = new Map(
        routineExercises
            .filter((re) => re.routine_id === session.routine_id)
            .map((re) => [re.exercise_id, `${re.target_sets}x${re.target_reps}`])
    );

    const blocks: string[] = [];
    let hasHistory = false;

    for (const exerciseId of orderedExerciseIds) {
        const exercise = exercisesById.get(exerciseId);
        const perSession = byExercise.get(exerciseId);
        if (!exercise || !perSession) continue;

        const target = targets.get(exerciseId);
        blocks.push(
            `#${exercise.name}|${exercise.muscle_group}${target ? `|${target}` : ''}`
        );

        // Today first, then the most recent history, newest to oldest.
        const ordered = Array.from(perSession.entries())
            .map(([id, sets]) => ({ id, date: sessionDate.get(id) ?? '', sets }))
            .filter((entry) => entry.date)
            .sort((a, b) => b.date.localeCompare(a.date));

        const relevant = [
            ...ordered.filter((entry) => entry.id === sessionId),
            ...ordered.filter((entry) => entry.id !== sessionId && entry.date <= session.session_date),
        ].slice(0, HISTORY_DEPTH + 1);

        if (relevant.length > 1) hasHistory = true;

        for (const entry of relevant) {
            const age = daysBetween(entry.date, session.session_date);
            const e1rm = bestE1RM(entry.sets);
            blocks.push(`${age}d ${serialiseSets(entry.sets)}${e1rm > 0 ? ` e${e1rm}` : ''}`);
        }
    }

    // ── Session-level header ────────────────────────────────────────────────
    const header: string[] = [];
    header.push(
        `SESIÓN ${session.session_date}` +
            (routine ? ` · ${routine.name}` : ' · libre') +
            (session.duration_minutes ? ` · ${session.duration_minutes}min` : '') +
            ` · ${todaysLogs.length} series · ${Math.round(volume(
                todaysLogs.map((l) => ({ weight: Number(l.weight_kg) || 0, reps: l.reps, rpe: l.rpe }))
            ))}kg`
    );

    // Training density: a drop in performance often just means too many sessions.
    const recent = sessions.filter(
        (s) => s.session_date <= session.session_date && daysBetween(s.session_date, session.session_date) <= 14
    );
    header.push(`Sesiones últimos 14d: ${recent.length}`);

    const previousSession = sessions
        .filter((s) => s.id !== sessionId && s.session_date <= session.session_date)
        .sort((a, b) => b.session_date.localeCompare(a.session_date))[0];
    if (previousSession) {
        header.push(
            `Días desde la sesión anterior: ${daysBetween(previousSession.session_date, session.session_date)}`
        );
    }

    // Bodyweight matters for interpreting strength changes.
    const sortedWeights = [...weights].sort((a, b) => b.date.localeCompare(a.date));
    const currentWeight = sortedWeights.find((w) => w.date <= session.session_date);
    if (currentWeight) {
        const monthAgo = sortedWeights.find(
            (w) => daysBetween(w.date, session.session_date) >= 28
        );
        const drift = monthAgo
            ? ` (${currentWeight.weight_kg - monthAgo.weight_kg >= 0 ? '+' : ''}${(
                  currentWeight.weight_kg - monthAgo.weight_kg
              ).toFixed(1)} en ~30d)`
            : '';
        header.push(`Peso corporal: ${formatWeight(currentWeight.weight_kg)}kg${drift}`);
    }

    const text = `${header.join('\n')}\n\n${blocks.join('\n')}`;

    return {
        text,
        estimatedTokens: Math.ceil(text.length / 4),
        exerciseCount: orderedExerciseIds.length,
        isFirstSession: !hasHistory,
    };
}

/** Convenience for the summary screen, which has the session id to hand. */
export async function buildContextForLatestSession(): Promise<AnalysisContext | null> {
    const sessions = await storage.workoutSessions.getAll();
    const latest = [...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date))[0];
    return latest ? buildAnalysisContext(latest.id) : null;
}

/** Exposed for the debug view in Settings, so the exact payload can be inspected. */
export const __internals = { serialiseSets, bestE1RM, toISODate };

export type { WorkoutLog };
