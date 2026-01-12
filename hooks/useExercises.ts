import { useState, useEffect } from 'react';
import { db, generateId } from '../lib/localDatabase';
import { Exercise } from '../lib/database.types';

export function useExercises() {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all exercises from local SQLite
    const fetchExercises = async () => {
        try {
            setLoading(true);
            const result = await db.getAllAsync<Exercise>(
                'SELECT * FROM exercises ORDER BY name;'
            );
            setExercises(result || []);
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

            await db.runAsync(
                `INSERT INTO exercises (id, name, muscle_group, equipment, notes, time_per_rep_seconds, default_rest_seconds, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    id,
                    exercise.name,
                    exercise.muscle_group,
                    exercise.equipment || '',
                    exercise.notes || null,
                    exercise.time_per_rep_seconds || 3,
                    exercise.default_rest_seconds || 90,
                    now,
                ]
            );

            const newExercise: Exercise = {
                id,
                ...exercise,
                equipment: exercise.equipment || '',
                time_per_rep_seconds: exercise.time_per_rep_seconds || 3,
                default_rest_seconds: exercise.default_rest_seconds || 90,
                created_at: now,
            };

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
            // Build dynamic update query
            const fields: string[] = [];
            const values: any[] = [];

            if (updates.name !== undefined) {
                fields.push('name = ?');
                values.push(updates.name);
            }
            if (updates.muscle_group !== undefined) {
                fields.push('muscle_group = ?');
                values.push(updates.muscle_group);
            }
            if (updates.equipment !== undefined) {
                fields.push('equipment = ?');
                values.push(updates.equipment);
            }
            if (updates.notes !== undefined) {
                fields.push('notes = ?');
                values.push(updates.notes);
            }
            if (updates.time_per_rep_seconds !== undefined) {
                fields.push('time_per_rep_seconds = ?');
                values.push(updates.time_per_rep_seconds);
            }
            if (updates.default_rest_seconds !== undefined) {
                fields.push('default_rest_seconds = ?');
                values.push(updates.default_rest_seconds);
            }

            if (fields.length === 0) return;

            values.push(id);
            await db.runAsync(
                `UPDATE exercises SET ${fields.join(', ')} WHERE id = ?;`,
                values
            );

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
            await db.runAsync('DELETE FROM exercises WHERE id = ?;', [id]);
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
