import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Routine, RoutineExercise } from '../lib/database.types';

export type RoutineWithExercises = Routine & {
    routine_exercises: (RoutineExercise & {
        exercise: {
            name: string;
            muscle_group: string;
        };
    })[];
};

export function useRoutines() {
    const [routines, setRoutines] = useState<RoutineWithExercises[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRoutines = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('routines')
                .select(`
                    *,
                    routine_exercises (
                        *,
                        exercise:exercises (
                            name,
                            muscle_group
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRoutines(data as RoutineWithExercises[]);
        } catch (err) {
            console.error('Error fetching routines:', err);
            setError('No se pudieron cargar las rutinas');
        } finally {
            setLoading(false);
        }
    };

    const getRoutineDetails = async (id: string): Promise<RoutineWithExercises | null> => {
        try {
            const { data, error } = await supabase
                .from('routines')
                .select(`
                    *,
                    routine_exercises (
                        *,
                        exercise:exercises (
                            name,
                            muscle_group
                        )
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as RoutineWithExercises;
        } catch (err) {
            console.error('Error fetching routine details:', err);
            return null;
        }
    };

    const createRoutine = async (
        name: string,
        description: string | null,
        exercises: { id: string; sets: number; reps: string | number; restTime?: number }[]
    ) => {
        try {
            setLoading(true);
            // Calculate duration: (sets * avg 45s per set) + (rest between sets)
            const totalDuration = exercises.reduce((acc, ex) => {
                const setsDuration = ex.sets * 0.75; // ~45 seconds per set in minutes
                const restDuration = ((ex.sets - 1) * (ex.restTime || 90)) / 60; // rest between sets
                return acc + setsDuration + restDuration;
            }, 0);

            // 1. Create routine
            const { data: routineData, error: routineError } = await supabase
                .from('routines')
                .insert({
                    name,
                    description,
                    estimated_duration: Math.round(totalDuration),
                })
                .select()
                .single();

            if (routineError) throw routineError;

            // 2. Add exercises with rest time stored in notes as JSON
            if (exercises.length > 0) {
                const routineExercises = exercises.map((ex, index) => ({
                    routine_id: routineData.id,
                    exercise_id: ex.id,
                    order_index: index,
                    target_sets: ex.sets,
                    target_reps: ex.reps.toString(),
                    notes: ex.restTime ? JSON.stringify({ restTime: ex.restTime }) : null,
                }));

                const { error: exercisesError } = await supabase
                    .from('routine_exercises')
                    .insert(routineExercises);

                if (exercisesError) throw exercisesError;
            }

            await fetchRoutines();
            return routineData;
        } catch (err) {
            console.error('Error creating routine:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };


    const updateRoutine = async (
        id: string,
        name: string,
        description: string | null,
        exercises: { id: string; sets: number; reps: string | number; restTime?: number }[]
    ) => {
        try {
            setLoading(true);

            // Calculate duration
            const totalDuration = exercises.reduce((acc, ex) => {
                const setsDuration = ex.sets * 0.75;
                const restDuration = ((ex.sets - 1) * (ex.restTime || 90)) / 60;
                return acc + setsDuration + restDuration;
            }, 0);

            // 1. Update routine metadata
            const { error: routineError } = await supabase
                .from('routines')
                .update({
                    name,
                    description,
                    estimated_duration: Math.round(totalDuration),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (routineError) throw routineError;

            // 2. Delete existing exercises
            const { error: deleteError } = await supabase
                .from('routine_exercises')
                .delete()
                .eq('routine_id', id);

            if (deleteError) throw deleteError;

            // 3. Insert new exercises
            if (exercises.length > 0) {
                const routineExercises = exercises.map((ex, index) => ({
                    routine_id: id,
                    exercise_id: ex.id,
                    order_index: index,
                    target_sets: ex.sets,
                    target_reps: ex.reps.toString(),
                    notes: ex.restTime ? JSON.stringify({ restTime: ex.restTime }) : null,
                }));

                const { error: exercisesError } = await supabase
                    .from('routine_exercises')
                    .insert(routineExercises);

                if (exercisesError) throw exercisesError;
            }

            await fetchRoutines();
        } catch (err) {
            console.error('Error updating routine:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };


    const deleteRoutine = async (id: string) => {
        try {
            const { error } = await supabase
                .from('routines')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setRoutines((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            console.error('Error deleting routine:', err);
            throw err;
        }
    };

    useEffect(() => {
        fetchRoutines();
    }, []);

    return {
        routines,
        loading,
        error,
        fetchRoutines,
        createRoutine,
        updateRoutine,
        deleteRoutine,
        getRoutineDetails
    };
}
