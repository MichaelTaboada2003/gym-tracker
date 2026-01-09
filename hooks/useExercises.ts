import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Exercise } from '../lib/database.types';

export function useExercises() {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all exercises
    const fetchExercises = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .order('name');

            if (error) throw error;
            setExercises(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading exercises');
        } finally {
            setLoading(false);
        }
    };

    // Create a new exercise
    const createExercise = async (exercise: Omit<Exercise, 'id' | 'created_at'>) => {
        try {
            const { data, error } = await supabase
                .from('exercises')
                .insert(exercise as any)
                .select()
                .single();

            if (error) throw error;
            setExercises((prev) => [...prev, data]);
            return data;
        } catch (err) {
            throw err;
        }
    };

    // Get exercises by muscle group
    const getByMuscleGroup = (muscleGroup: string) => {
        return exercises.filter((e) => e.muscle_group === muscleGroup);
    };

    // Search exercises
    const searchExercises = (query: string) => {
        const lowerQuery = query.toLowerCase();
        return exercises.filter(
            (e) =>
                e.name.toLowerCase().includes(lowerQuery) ||
                e.muscle_group.toLowerCase().includes(lowerQuery)
        );
    };

    // Update an exercise
    const updateExercise = async (id: string, updates: Partial<Omit<Exercise, 'id' | 'created_at'>>) => {
        try {
            const { data, error } = await supabase
                .from('exercises')
                .update(updates as any)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setExercises((prev) => prev.map(e => e.id === id ? data : e));
            return data;
        } catch (err) {
            throw err;
        }
    };

    // Delete an exercise
    const deleteExercise = async (id: string) => {
        try {
            const { error } = await supabase
                .from('exercises')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setExercises((prev) => prev.filter(e => e.id !== id));
        } catch (err) {
            throw err;
        }
    };

    useEffect(() => {
        fetchExercises();
    }, []);

    return {
        exercises,
        loading,
        error,
        createExercise,
        updateExercise,
        deleteExercise,
        getByMuscleGroup,
        searchExercises,
        fetchExercises,
        refetch: fetchExercises,
    };
}
