/**
 * Session orchestration: reads history to pre-fill the live workout, and writes
 * the finished session back to storage.
 */

import { useCallback } from 'react';
import { storage, generateId } from '../lib/localDatabase';
import { useWorkoutStore, PreviousSetData, ExerciseOverrides } from '../store/workoutStore';
import { Exercise, WorkoutLog, WorkoutSession } from '../lib/database.types';
import { calculate1RM, toISODate } from '../lib/utils';

/** A best-ever lift that was beaten during the session just finished. */
export interface PersonalRecord {
    exerciseId: string;
    exerciseName: string;
    weight: number;
    reps: number;
    estimated1RM: number;
    /** Previous best 1RM, or null when this is the first time the lift is logged. */
    previous1RM: number | null;
    improvement: string;
}

export interface SavedWorkout {
    session: WorkoutSession;
    logs: WorkoutLog[];
    personalRecords: PersonalRecord[];
}

/** History for one exercise, resolved in a single pass over the log table. */
interface ExerciseHistorySnapshot {
    previousBest: { weight: number; reps: number } | null;
    previousSets: PreviousSetData[];
    best1RM: number;
}

/**
 * Builds per-exercise history for every requested exercise at once.
 *
 * The previous implementation re-read and re-scanned the entire log table once
 * per exercise, so starting an 8-exercise routine did 16 full scans.
 */
async function loadHistory(exerciseIds: string[]): Promise<Map<string, ExerciseHistorySnapshot>> {
    const wanted = new Set(exerciseIds);
    const result = new Map<string, ExerciseHistorySnapshot>();
    if (wanted.size === 0) return result;

    const [logs, sessions] = await Promise.all([
        storage.workoutLogs.getAll(),
        storage.workoutSessions.getAll(),
    ]);

    const sessionDate = new Map(sessions.map((s) => [s.id, s.session_date]));

    // exercise -> session -> sets
    const bySession = new Map<string, Map<string, WorkoutLog[]>>();
    for (const log of logs) {
        if (!wanted.has(log.exercise_id) || log.is_warmup) continue;
        let sessions = bySession.get(log.exercise_id);
        if (!sessions) {
            sessions = new Map();
            bySession.set(log.exercise_id, sessions);
        }
        const bucket = sessions.get(log.session_id);
        if (bucket) bucket.push(log);
        else sessions.set(log.session_id, [log]);
    }

    for (const exerciseId of wanted) {
        const sessionsForExercise = bySession.get(exerciseId);
        if (!sessionsForExercise || sessionsForExercise.size === 0) {
            result.set(exerciseId, { previousBest: null, previousSets: [], best1RM: 0 });
            continue;
        }

        let latestSessionId: string | null = null;
        let latestDate = '';
        let best: WorkoutLog | null = null;
        let best1RM = 0;

        for (const [sessionId, sessionLogs] of sessionsForExercise) {
            const date = sessionDate.get(sessionId) ?? '';
            if (!latestSessionId || date > latestDate) {
                latestDate = date;
                latestSessionId = sessionId;
            }
            for (const log of sessionLogs) {
                const weight = Number(log.weight_kg) || 0;
                if (!best || weight > best.weight_kg || (weight === best.weight_kg && log.reps > best.reps)) {
                    best = log;
                }
                best1RM = Math.max(best1RM, calculate1RM(weight, log.reps));
            }
        }

        const previousSets = (latestSessionId ? (sessionsForExercise.get(latestSessionId) ?? []) : [])
            .slice()
            .sort((a, b) => a.set_number - b.set_number)
            .map((log) => ({
                setNumber: log.set_number,
                weight: Number(log.weight_kg) || 0,
                reps: log.reps || 0,
            }));

        result.set(exerciseId, {
            previousBest: best ? { weight: Number(best.weight_kg) || 0, reps: best.reps || 0 } : null,
            previousSets,
            best1RM,
        });
    }

    return result;
}

export function useWorkoutSession() {
    const store = useWorkoutStore();
    const { addExercise, addExercises, endWorkout } = store;

    /** Adds one exercise with its history pre-filled. */
    const addExerciseWithHistory = useCallback(
        async (exercise: Exercise, overrides?: ExerciseOverrides) => {
            const history = await loadHistory([exercise.id]);
            const snapshot = history.get(exercise.id);
            addExercise(exercise, snapshot?.previousBest ?? null, overrides, snapshot?.previousSets ?? []);
        },
        [addExercise]
    );

    /** Adds a whole routine in one store write, with history for every exercise. */
    const addExercisesWithHistory = useCallback(
        async (entries: { exercise: Exercise; overrides?: ExerciseOverrides }[]) => {
            const history = await loadHistory(entries.map((entry) => entry.exercise.id));
            addExercises(
                entries.map((entry) => {
                    const snapshot = history.get(entry.exercise.id);
                    return {
                        exercise: entry.exercise,
                        previousBest: snapshot?.previousBest ?? null,
                        previousSets: snapshot?.previousSets ?? [],
                        overrides: entry.overrides,
                    };
                })
            );
        },
        [addExercises]
    );

    /**
     * Persists the session.
     *
     * Returns `null` when nothing was completed — an empty session is discarded
     * rather than stored as a zero-volume workout that would pollute stats.
     */
    const saveWorkout = useCallback(async (): Promise<SavedWorkout | null> => {
        const state = useWorkoutStore.getState();
        if (!state.isActive) throw new Error('No hay un entrenamiento activo');

        const completed = state.exercises.flatMap((ex) =>
            ex.sets
                .filter((s) => s.isCompleted && s.reps > 0)
                .map((s) => ({ exercise: ex.exercise, set: s }))
        );

        if (completed.length === 0) {
            endWorkout();
            return null;
        }

        // Records are judged against history *before* this session is written.
        const priorBests = await loadHistory(state.exercises.map((ex) => ex.exercise.id));

        const now = new Date();
        const nowIso = now.toISOString();
        const sessionId = generateId();

        const session: WorkoutSession = {
            id: sessionId,
            routine_id: state.routineId,
            session_date: toISODate(now),
            started_at: state.startedAt ? new Date(state.startedAt).toISOString() : nowIso,
            completed_at: nowIso,
            duration_minutes: state.startedAt
                ? Math.max(1, Math.round((now.getTime() - state.startedAt) / 60_000))
                : null,
            notes: null,
        };

        const logs: WorkoutLog[] = completed.map(({ exercise, set }) => ({
            id: generateId(),
            session_id: sessionId,
            exercise_id: exercise.id,
            set_number: set.setNumber,
            weight_kg: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            is_warmup: set.isWarmup,
            // Cuándo se hizo la serie, no cuándo se guardó el entreno. Antes
            // todas compartían el mismo instante y el ritmo era inobservable.
            logged_at: set.completedAt ? new Date(set.completedAt).toISOString() : nowIso,
        }));

        await storage.workoutSessions.add(session);
        await storage.workoutLogs.addMany(logs);

        const personalRecords = detectPersonalRecords(state.exercises, priorBests);

        endWorkout();
        return { session, logs, personalRecords };
    }, [endWorkout]);

    return {
        ...store,
        addExerciseWithHistory,
        addExercisesWithHistory,
        saveWorkout,
        discardWorkout: endWorkout,
    };
}

/** Compares the best work set of each exercise against its all-time best 1RM. */
function detectPersonalRecords(
    exercises: ReturnType<typeof useWorkoutStore.getState>['exercises'],
    priorBests: Map<string, ExerciseHistorySnapshot>
): PersonalRecord[] {
    const records: PersonalRecord[] = [];

    for (const ex of exercises) {
        const workSets = ex.sets.filter((s) => s.isCompleted && !s.isWarmup && s.weight > 0 && s.reps > 0);
        if (workSets.length === 0) continue;

        const best = workSets.reduce((top, set) =>
            calculate1RM(set.weight, set.reps) > calculate1RM(top.weight, top.reps) ? set : top
        );
        const estimated1RM = calculate1RM(best.weight, best.reps);
        const previous1RM = priorBests.get(ex.exercise.id)?.best1RM ?? 0;

        if (estimated1RM <= previous1RM) continue;

        records.push({
            exerciseId: ex.exercise.id,
            exerciseName: ex.exercise.name,
            weight: best.weight,
            reps: best.reps,
            estimated1RM,
            previous1RM: previous1RM > 0 ? previous1RM : null,
            improvement:
                previous1RM > 0
                    ? `+${Math.round(estimated1RM - previous1RM)}kg 1RM`
                    : 'Primer registro',
        });
    }

    return records.sort((a, b) => b.estimated1RM - a.estimated1RM);
}
