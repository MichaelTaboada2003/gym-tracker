import { storage, generateId } from '../lib/localDatabase';
import { useWorkoutStore, SetData, ExerciseInProgress } from '../store/workoutStore';
import { Exercise } from '../lib/database.types';

export interface PreviousSetData {
    setNumber: number;
    weight: number;
    reps: number;
}

export function useWorkoutSession() {
    const store = useWorkoutStore();

    // Get the previous best (weight/reps) for an exercise (overall best)
    const getPreviousBest = async (exerciseId: string): Promise<{ weight: number; reps: number } | null> => {
        try {
            const logs = await storage.workoutLogs.getAll() as any[];

            // Filter logs for this exercise (work sets only)
            const exerciseLogs = logs.filter(
                (log: any) => log.exercise_id === exerciseId && !log.is_warmup
            );

            if (exerciseLogs.length === 0) return null;

            // Find the best set (highest weight, then highest reps at that weight)
            const bestLog = exerciseLogs.reduce((best: any, log: any) => {
                const logWeight = Number(log.weight_kg) || 0;
                const bestWeight = Number(best?.weight_kg) || 0;

                if (logWeight > bestWeight) return log;
                if (logWeight === bestWeight && log.reps > (best?.reps || 0)) return log;
                return best;
            }, null);

            if (!bestLog) return null;

            return {
                weight: Number(bestLog.weight_kg) || 0,
                reps: bestLog.reps || 0,
            };
        } catch (error) {
            console.error('Error getting previous best:', error);
            return null;
        }
    };

    // Get the previous sets from the LAST session for an exercise (per-set data)
    const getPreviousSets = async (exerciseId: string): Promise<PreviousSetData[]> => {
        try {
            const logs = await storage.workoutLogs.getAll() as any[];
            const sessions = await storage.workoutSessions.getAll() as any[];

            // Filter logs for this exercise (work sets only)
            const exerciseLogs = logs.filter(
                (log: any) => log.exercise_id === exerciseId && !log.is_warmup
            );

            if (exerciseLogs.length === 0) return [];

            // Get session dates to find the most recent one
            const sessionMap = new Map(sessions.map((s: any) => [s.id, s.session_date]));

            // Group logs by session and find the most recent session
            const logsBySession = new Map<string, any[]>();
            exerciseLogs.forEach((log: any) => {
                const sessionLogs = logsBySession.get(log.session_id) || [];
                sessionLogs.push(log);
                logsBySession.set(log.session_id, sessionLogs);
            });

            // Find the most recent session with this exercise
            let mostRecentSessionId: string | null = null;
            let mostRecentDate: string | null = null;

            logsBySession.forEach((_, sessionId) => {
                const date = sessionMap.get(sessionId);
                if (date && (!mostRecentDate || date > mostRecentDate)) {
                    mostRecentDate = date;
                    mostRecentSessionId = sessionId;
                }
            });

            if (!mostRecentSessionId) return [];

            // Get the sets from the most recent session, sorted by set number
            const lastSessionLogs = logsBySession.get(mostRecentSessionId) || [];
            return lastSessionLogs
                .sort((a: any, b: any) => a.set_number - b.set_number)
                .map((log: any) => ({
                    setNumber: log.set_number,
                    weight: Number(log.weight_kg) || 0,
                    reps: log.reps || 0,
                }));
        } catch (error) {
            console.error('Error getting previous sets:', error);
            return [];
        }
    };

    // Wrapper that fetches previous sets before adding exercise
    const addExerciseWithHistory = async (
        exercise: Exercise,
        overrides?: { targetSets?: number; targetReps?: string; restSeconds?: number; notes?: string | null }
    ) => {
        const previousSets = await getPreviousSets(exercise.id);
        const previousBest = previousSets.length > 0
            ? previousSets.reduce((best, set) =>
                set.weight > best.weight ? set : best, previousSets[0])
            : null;
        store.addExercise(exercise, previousBest, overrides, previousSets);
    };

    // Save workout to AsyncStorage
    const saveWorkout = async () => {
        if (!store.isActive) {
            throw new Error('No hay un entrenamiento activo');
        }

        const completedSets = store.exercises.flatMap(ex =>
            ex.sets.filter(s => s.isCompleted)
        );

        // If no completed sets, just end the workout without saving
        if (completedSets.length === 0) {
            store.endWorkout();
            return null;
        }

        try {
            const sessionId = generateId();
            const now = new Date().toISOString();
            const durationMinutes = store.startedAt
                ? Math.round((Date.now() - store.startedAt.getTime()) / 60000)
                : null;

            // Create the workout session
            const session = {
                id: sessionId,
                routine_id: store.routineId || null,
                session_date: now.split('T')[0],
                started_at: store.startedAt?.toISOString() || now,
                completed_at: now,
                duration_minutes: durationMinutes,
                notes: null,
            };

            await storage.workoutSessions.add(session);

            // Create all workout logs
            for (const ex of store.exercises) {
                for (const s of ex.sets) {
                    if (s.isCompleted) {
                        const log = {
                            id: generateId(),
                            session_id: sessionId,
                            exercise_id: ex.exercise.id,
                            set_number: s.setNumber,
                            weight_kg: s.weight,
                            reps: s.reps,
                            rpe: s.rpe || null,
                            is_warmup: s.isWarmup ? 1 : 0, // Store as integer for compatibility
                            logged_at: now,
                        };
                        await storage.workoutLogs.add(log);
                    }
                }
            }

            store.endWorkout();
            return session;
        } catch (error) {
            console.error('Error saving workout:', error);
            throw error;
        }
    };

    // Discard workout without saving
    const discardWorkout = () => {
        store.endWorkout();
    };

    // Get current workout duration in minutes
    const getDuration = () => {
        if (!store.startedAt) return 0;
        return Math.round((Date.now() - store.startedAt.getTime()) / 60000);
    };

    return {
        ...store,
        addExercise: store.addExercise, // Keep original for backward compatibility
        addExerciseWithHistory, // New function with auto-fetch
        getPreviousBest,
        getPreviousSets,
        saveWorkout,
        discardWorkout,
        getDuration,
    };
}

