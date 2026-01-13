import { storage, generateId } from '../lib/localDatabase';
import { useWorkoutStore, SetData, ExerciseInProgress } from '../store/workoutStore';

export function useWorkoutSession() {
    const store = useWorkoutStore();

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
        saveWorkout,
        discardWorkout,
        getDuration,
    };
}
