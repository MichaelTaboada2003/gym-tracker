import { supabase } from '../lib/supabase';
import { useWorkoutStore, SetData, ExerciseInProgress } from '../store/workoutStore';

export function useWorkoutSession() {
    const store = useWorkoutStore();

    // Save workout to Supabase
    const saveWorkout = async () => {
        if (!store.isActive) {
            throw new Error('No hay un entrenamiento activo');
        }

        const completedSets = store.exercises.flatMap(ex =>
            ex.sets.filter(s => s.isCompleted)
        );

        // If no completed sets, just end the workout without saving to DB
        if (completedSets.length === 0) {
            store.endWorkout();
            return null;
        }

        try {
            // Create the workout session
            const { data: session, error: sessionError } = await supabase
                .from('workout_sessions')
                .insert({
                    routine_id: store.routineId,
                    session_date: new Date().toISOString().split('T')[0],
                    started_at: store.startedAt?.toISOString(),
                    completed_at: new Date().toISOString(),
                    duration_minutes: store.startedAt
                        ? Math.round((Date.now() - store.startedAt.getTime()) / 60000)
                        : null,
                } as any)
                .select()
                .single();

            if (sessionError) {
                console.error('Session error:', sessionError);
                throw sessionError;
            }

            // Create all workout logs
            const logs = store.exercises.flatMap((ex) =>
                ex.sets
                    .filter((s) => s.isCompleted)
                    .map((s) => ({
                        session_id: (session as any).id,
                        exercise_id: ex.exercise.id,
                        set_number: s.setNumber,
                        weight_kg: s.weight,
                        reps: s.reps,
                        rpe: s.rpe,
                        is_warmup: s.isWarmup,
                    }))
            );

            if (logs.length > 0) {
                const { error: logsError } = await supabase
                    .from('workout_logs')
                    .insert(logs as any);

                if (logsError) {
                    console.error('Logs error:', logsError);
                    throw logsError;
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
