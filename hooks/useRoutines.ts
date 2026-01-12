import { useState, useEffect } from 'react';
import { db, generateId } from '../lib/localDatabase';
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
            const routineRows = await db.getAllAsync<Routine>(
                'SELECT * FROM routines ORDER BY created_at DESC;'
            );

            // 2. For each routine, fetch its exercises with exercise details
            const routinesWithExercises: RoutineWithExercises[] = await Promise.all(
                (routineRows || []).map(async (routine) => {
                    const exerciseRows = await db.getAllAsync<
                        RoutineExercise & { exercise_name: string; exercise_muscle_group: string }
                    >(
                        `SELECT re.*, e.name as exercise_name, e.muscle_group as exercise_muscle_group
                         FROM routine_exercises re
                         JOIN exercises e ON re.exercise_id = e.id
                         WHERE re.routine_id = ?
                         ORDER BY re.order_index;`,
                        [routine.id]
                    );

                    return {
                        ...routine,
                        routine_exercises: (exerciseRows || []).map((row) => ({
                            id: row.id,
                            routine_id: row.routine_id,
                            exercise_id: row.exercise_id,
                            order_index: row.order_index,
                            target_sets: row.target_sets,
                            target_reps: row.target_reps,
                            notes: row.notes,
                            exercise: {
                                name: row.exercise_name,
                                muscle_group: row.exercise_muscle_group,
                            },
                        })),
                    };
                })
            );

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
            await db.runAsync(
                `INSERT INTO routines (id, name, description, estimated_duration, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?);`,
                [routineId, name, description, Math.round(totalDuration), now, now]
            );

            // 2. Add exercises
            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                const reId = generateId();
                await db.runAsync(
                    `INSERT INTO routine_exercises (id, routine_id, exercise_id, order_index, target_sets, target_reps, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?);`,
                    [
                        reId,
                        routineId,
                        ex.id,
                        i,
                        ex.sets,
                        ex.reps.toString(),
                        ex.restTime ? JSON.stringify({ restTime: ex.restTime }) : null,
                    ]
                );
            }

            await fetchRoutines();
            return { id: routineId, name, description, estimated_duration: Math.round(totalDuration) };
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
            await db.runAsync(
                `UPDATE routines SET name = ?, description = ?, estimated_duration = ?, updated_at = ? WHERE id = ?;`,
                [name, description, Math.round(totalDuration), now, id]
            );

            // 2. Delete existing exercises
            await db.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?;', [id]);

            // 3. Insert new exercises
            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                const reId = generateId();
                await db.runAsync(
                    `INSERT INTO routine_exercises (id, routine_id, exercise_id, order_index, target_sets, target_reps, notes)
                     VALUES (?, ?, ?, ?, ?, ?, ?);`,
                    [
                        reId,
                        id,
                        ex.id,
                        i,
                        ex.sets,
                        ex.reps.toString(),
                        ex.restTime ? JSON.stringify({ restTime: ex.restTime }) : null,
                    ]
                );
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
            await db.runAsync('DELETE FROM routines WHERE id = ?;', [id]);
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
    };
}
