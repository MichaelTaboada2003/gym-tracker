import { useState, useEffect } from 'react';
import { storage, generateId } from '../lib/localDatabase';
import { Exercise } from '../lib/database.types';

export function useExercises() {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all exercises from AsyncStorage
    const fetchExercises = async () => {
        try {
            setLoading(true);
            const result = await storage.exercises.getAll();
            // Sort by name
            const sorted = (result as Exercise[]).sort((a, b) => a.name.localeCompare(b.name));
            setExercises(sorted);
        } catch (err) {
            console.error('Error fetching exercises:', err);
            setError(err instanceof Error ? err.message : 'Error loading exercises');
        } finally {
            setLoading(false);
        }
    };

    // Create a new exercise
    const createExercise = async (exercise: Omit<Exercise, 'id' | 'created_at'>) => {
        try {
            const id = generateId();
            const now = new Date().toISOString();

            const newExercise: Exercise = {
                id,
                ...exercise,
                equipment: exercise.equipment || '',
                time_per_rep_seconds: exercise.time_per_rep_seconds || 3,
                default_rest_seconds: exercise.default_rest_seconds || 90,
                created_at: now,
            };

            await storage.exercises.add(newExercise);
            setExercises((prev) => [...prev, newExercise].sort((a, b) => a.name.localeCompare(b.name)));
            return newExercise;
        } catch (err) {
            console.error('Error creating exercise:', err);
            throw err;
        }
    };

    // Get exercises by muscle group (in-memory filter)
    const getByMuscleGroup = (muscleGroup: string) => {
        return exercises.filter((e) => e.muscle_group === muscleGroup);
    };

    // Search exercises (in-memory filter)
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
            await storage.exercises.update(id, updates);
            setExercises((prev) =>
                prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
            );
        } catch (err) {
            console.error('Error updating exercise:', err);
            throw err;
        }
    };

    // Delete an exercise
    const deleteExercise = async (id: string) => {
        try {
            await storage.exercises.delete(id);
            setExercises((prev) => prev.filter((e) => e.id !== id));
        } catch (err) {
            console.error('Error deleting exercise:', err);
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
