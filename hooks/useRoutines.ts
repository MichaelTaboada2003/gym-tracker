import { useState, useEffect } from 'react';
import { storage, generateId } from '../lib/localDatabase';
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

            // 1. Fetch all routines
            const routineRows = await storage.routines.getAll() as Routine[];

            // 2. Fetch all routine_exercises and exercises
            const allRoutineExercises = await storage.routineExercises.getAll() as any[];
            const allExercises = await storage.exercises.getAll() as any[];

            // 3. Build the joined data
            const routinesWithExercises: RoutineWithExercises[] = routineRows
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((routine) => {
                    const exerciseLinks = allRoutineExercises
                        .filter((re) => re.routine_id === routine.id)
                        .sort((a, b) => a.order_index - b.order_index);

                    const routineExercisesWithDetails = exerciseLinks.map((re) => {
                        const exercise = allExercises.find((e) => e.id === re.exercise_id);
                        return {
                            ...re,
                            exercise: exercise ? {
                                name: exercise.name,
                                muscle_group: exercise.muscle_group,
                            } : { name: 'Desconocido', muscle_group: '' },
                        };
                    });

                    return {
                        ...routine,
                        routine_exercises: routineExercisesWithDetails,
                    };
                });

            setRoutines(routinesWithExercises);
        } catch (err) {
            console.error('Error fetching routines:', err);
            setError('No se pudieron cargar las rutinas');
        } finally {
            setLoading(false);
        }
    };

    const createRoutine = async (
        name: string,
        description: string | null,
        exercises: { id: string; sets: number; reps: string | number; restTime?: number }[]
    ) => {
        try {
            setLoading(true);
            const routineId = generateId();
            const now = new Date().toISOString();

            // Calculate duration
            const totalDuration = exercises.reduce((acc, ex) => {
                const setsDuration = ex.sets * 0.75;
                const restDuration = ((ex.sets - 1) * (ex.restTime || 90)) / 60;
                return acc + setsDuration + restDuration;
            }, 0);

            // 1. Create routine
            const newRoutine: Routine = {
                id: routineId,
                name,
                description,
                estimated_duration: Math.round(totalDuration),
                created_at: now,
                updated_at: now,
            };
            await storage.routines.add(newRoutine);

            // 2. Add exercises
            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                const routineExercise = {
                    id: generateId(),
                    routine_id: routineId,
                    exercise_id: ex.id,
                    order_index: i,
                    target_sets: ex.sets,
                    target_reps: ex.reps.toString(),
                    notes: ex.restTime ? JSON.stringify({ restTime: ex.restTime }) : null,
                };
                await storage.routineExercises.add(routineExercise);
            }

            await fetchRoutines();
            return newRoutine;
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
            const now = new Date().toISOString();

            // Calculate duration
            const totalDuration = exercises.reduce((acc, ex) => {
                const setsDuration = ex.sets * 0.75;
                const restDuration = ((ex.sets - 1) * (ex.restTime || 90)) / 60;
                return acc + setsDuration + restDuration;
            }, 0);

            // 1. Update routine metadata
            await storage.routines.update(id, {
                name,
                description,
                estimated_duration: Math.round(totalDuration),
                updated_at: now,
            });

            // 2. Delete existing exercises
            await storage.routineExercises.deleteByRoutineId(id);

            // 3. Insert new exercises
            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                const routineExercise = {
                    id: generateId(),
                    routine_id: id,
                    exercise_id: ex.id,
                    order_index: i,
                    target_sets: ex.sets,
                    target_reps: ex.reps.toString(),
                    notes: ex.restTime ? JSON.stringify({ restTime: ex.restTime }) : null,
                };
                await storage.routineExercises.add(routineExercise);
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
            await storage.routineExercises.deleteByRoutineId(id);
            await storage.routines.delete(id);
            setRoutines((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            console.error('Error deleting routine:', err);
            throw err;
        }
    };

    const getRoutineDetails = async (id: string): Promise<RoutineWithExercises | null> => {
        try {
            const routine = await storage.routines.getById(id) as Routine | null;
            if (!routine) return null;

            const allRoutineExercises = await storage.routineExercises.getAll() as any[];
            const allExercises = await storage.exercises.getAll() as any[];

            const exerciseLinks = allRoutineExercises
                .filter((re) => re.routine_id === routine.id)
                .sort((a, b) => a.order_index - b.order_index);

            const routineExercisesWithDetails = exerciseLinks.map((re) => {
                const exercise = allExercises.find((e) => e.id === re.exercise_id);
                return {
                    ...re,
                    exercise: exercise ? {
                        name: exercise.name,
                        muscle_group: exercise.muscle_group,
                    } : { name: 'Desconocido', muscle_group: '' },
                };
            });

            return {
                ...routine,
                routine_exercises: routineExercisesWithDetails,
            };
        } catch (err) {
            console.error('Error getting routine details:', err);
            return null;
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
        getRoutineDetails,
    };
}
