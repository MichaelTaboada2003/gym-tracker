import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage, generateId, deleteExerciseCascade } from '../lib/localDatabase';
import { Exercise } from '../lib/database.types';

export type ExerciseDraft = {
    name: string;
    muscle_group: string;
    equipment?: string | null;
    notes?: string | null;
    time_per_rep_seconds?: number;
    default_rest_seconds?: number;
};

const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, 'es');

export function useExercises() {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchExercises = useCallback(async () => {
        try {
            setError(null);
            const rows = await storage.exercises.getAll();
            setExercises(rows.sort(byName));
        } catch (err) {
            console.error('[exercises] load failed:', err);
            setError('No se pudieron cargar los ejercicios');
        } finally {
            setLoading(false);
        }
    }, []);

    /** Fast id → exercise lookup for screens that join against routines or logs. */
    const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

    const createExercise = useCallback(async (draft: ExerciseDraft) => {
        const name = draft.name.trim();
        const duplicate = (await storage.exercises.getAll()).some(
            (e) => e.name.trim().toLowerCase() === name.toLowerCase()
        );
        if (duplicate) throw new Error('Ya existe un ejercicio con ese nombre');

        const exercise: Exercise = {
            id: generateId(),
            name,
            muscle_group: draft.muscle_group,
            equipment: draft.equipment?.trim() || '',
            notes: draft.notes?.trim() || null,
            created_at: new Date().toISOString(),
            time_per_rep_seconds: draft.time_per_rep_seconds || 3,
            default_rest_seconds: draft.default_rest_seconds || 90,
        };

        await storage.exercises.add(exercise);
        setExercises((prev) => [...prev, exercise].sort(byName));
        return exercise;
    }, []);

    const updateExercise = useCallback(async (id: string, updates: Partial<ExerciseDraft>) => {
        const patch: Partial<Exercise> = {
            ...(updates.name !== undefined && { name: updates.name.trim() }),
            ...(updates.muscle_group !== undefined && { muscle_group: updates.muscle_group }),
            ...(updates.equipment !== undefined && { equipment: updates.equipment?.trim() || '' }),
            ...(updates.notes !== undefined && { notes: updates.notes?.trim() || null }),
            ...(updates.time_per_rep_seconds !== undefined && {
                time_per_rep_seconds: updates.time_per_rep_seconds,
            }),
            ...(updates.default_rest_seconds !== undefined && {
                default_rest_seconds: updates.default_rest_seconds,
            }),
        };

        await storage.exercises.update(id, patch);
        setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)).sort(byName));
    }, []);

    /** Removes the exercise and every routine slot pointing at it. Logged history is kept. */
    const deleteExercise = useCallback(async (id: string) => {
        await deleteExerciseCascade(id);
        setExercises((prev) => prev.filter((e) => e.id !== id));
    }, []);

    /** How many routines would lose an exercise if it were deleted. */
    const countRoutineUsages = useCallback(async (id: string) => {
        const slots = await storage.routineExercises.getAll();
        return new Set(slots.filter((s) => s.exercise_id === id).map((s) => s.routine_id)).size;
    }, []);

    useEffect(() => {
        fetchExercises();
    }, [fetchExercises]);

    return {
        exercises,
        exercisesById,
        loading,
        error,
        fetchExercises,
        refetch: fetchExercises,
        createExercise,
        updateExercise,
        deleteExercise,
        countRoutineUsages,
    };
}
