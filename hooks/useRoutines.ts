import { useCallback, useEffect, useState } from 'react';
import { storage, generateId, deleteRoutineCascade } from '../lib/localDatabase';
import { Exercise, Routine, RoutineExercise } from '../lib/database.types';
import { estimateRoutineMinutes, getDurationLabel } from '../lib/durationCalculator';
import { parseTargetReps } from '../lib/utils';

/** The exercise fields a routine card needs, denormalised onto each slot. */
export interface RoutineExerciseSummary {
    name: string;
    muscle_group: string;
    equipment: string;
    time_per_rep_seconds: number;
    default_rest_seconds: number;
}

export type RoutineWithExercises = Routine & {
    routine_exercises: (RoutineExercise & { exercise: RoutineExerciseSummary })[];
    /** Derived, not stored: minutes recomputed from the current exercise config. */
    calculatedDuration: number;
    /** "Rápido" | "Moderado" | "Largo" | "Muy Largo". */
    durationLabel: string;
};

/** Shape the routine builder hands back for each selected exercise. */
export interface RoutineExerciseInput {
    id: string;
    sets: number;
    reps: string | number;
    restTime?: number;
    timePerRep?: number;
    notes?: string | null;
}

const MISSING_EXERCISE: RoutineExerciseSummary = {
    name: 'Ejercicio eliminado',
    muscle_group: 'Otros',
    equipment: '',
    time_per_rep_seconds: 3,
    default_rest_seconds: 90,
};

function summarise(exercise: Exercise | undefined): RoutineExerciseSummary {
    if (!exercise) return MISSING_EXERCISE;
    return {
        name: exercise.name,
        muscle_group: exercise.muscle_group,
        equipment: exercise.equipment ?? '',
        time_per_rep_seconds: exercise.time_per_rep_seconds ?? 3,
        default_rest_seconds: exercise.default_rest_seconds ?? 90,
    };
}

/** Joins a routine with its exercises and derives the duration badge. */
function assemble(
    routine: Routine,
    allRoutineExercises: RoutineExercise[],
    exercisesById: Map<string, Exercise>
): RoutineWithExercises {
    const slots = allRoutineExercises
        .filter((re) => re.routine_id === routine.id)
        .sort((a, b) => a.order_index - b.order_index)
        .map((re) => ({ ...re, exercise: summarise(exercisesById.get(re.exercise_id)) }));

    const calculatedDuration = estimateRoutineMinutes(
        slots.map((slot) => ({
            exerciseName: slot.exercise.name,
            sets: slot.target_sets,
            reps: parseTargetReps(slot.target_reps),
            timePerRepSeconds: slot.time_per_rep_seconds || slot.exercise.time_per_rep_seconds,
            restBetweenSetsSeconds: slot.rest_seconds || slot.exercise.default_rest_seconds,
        }))
    );

    return {
        ...routine,
        routine_exercises: slots,
        calculatedDuration,
        durationLabel: getDurationLabel(calculatedDuration),
    };
}

/** Converts builder input into storable rows and the routine's duration. */
function buildRows(
    routineId: string,
    inputs: RoutineExerciseInput[],
    exercisesById: Map<string, Exercise>
): { rows: RoutineExercise[]; minutes: number } {
    const rows = inputs.map((input, index) => {
        const exercise = exercisesById.get(input.id);
        return {
            id: generateId(),
            routine_id: routineId,
            exercise_id: input.id,
            order_index: index,
            target_sets: Math.max(1, input.sets),
            target_reps: String(input.reps),
            rest_seconds: input.restTime ?? exercise?.default_rest_seconds ?? 90,
            time_per_rep_seconds: input.timePerRep ?? exercise?.time_per_rep_seconds ?? 3,
            notes: input.notes ?? null,
        } satisfies RoutineExercise;
    });

    const minutes = estimateRoutineMinutes(
        rows.map((row) => ({
            sets: row.target_sets,
            reps: parseTargetReps(row.target_reps),
            timePerRepSeconds: row.time_per_rep_seconds,
            restBetweenSetsSeconds: row.rest_seconds,
        }))
    );

    return { rows, minutes };
}

export function useRoutines() {
    const [routines, setRoutines] = useState<RoutineWithExercises[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRoutines = useCallback(async () => {
        try {
            setError(null);
            const [routineRows, slots, exercises] = await Promise.all([
                storage.routines.getAll(),
                storage.routineExercises.getAll(),
                storage.exercises.getAll(),
            ]);

            const exercisesById = new Map(exercises.map((e) => [e.id, e]));
            setRoutines(
                routineRows
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((routine) => assemble(routine, slots, exercisesById))
            );
        } catch (err) {
            console.error('[routines] load failed:', err);
            setError('No se pudieron cargar las rutinas');
        } finally {
            setLoading(false);
        }
    }, []);

    const getRoutineDetails = useCallback(async (id: string): Promise<RoutineWithExercises | null> => {
        try {
            const routine = await storage.routines.getById(id);
            if (!routine) return null;

            const [slots, exercises] = await Promise.all([
                storage.routineExercises.getAll(),
                storage.exercises.getAll(),
            ]);
            return assemble(routine, slots, new Map(exercises.map((e) => [e.id, e])));
        } catch (err) {
            console.error('[routines] detail failed:', err);
            return null;
        }
    }, []);

    const createRoutine = useCallback(
        async (name: string, description: string | null, exercises: RoutineExerciseInput[]) => {
            const routineId = generateId();
            const now = new Date().toISOString();
            const exercisesById = new Map((await storage.exercises.getAll()).map((e) => [e.id, e]));
            const { rows, minutes } = buildRows(routineId, exercises, exercisesById);

            const routine: Routine = {
                id: routineId,
                name: name.trim(),
                description: description?.trim() || null,
                estimated_duration: minutes,
                created_at: now,
                updated_at: now,
            };

            await storage.routines.add(routine);
            await storage.routineExercises.addMany(rows);
            await fetchRoutines();
            return routine;
        },
        [fetchRoutines]
    );

    const updateRoutine = useCallback(
        async (id: string, name: string, description: string | null, exercises: RoutineExerciseInput[]) => {
            const exercisesById = new Map((await storage.exercises.getAll()).map((e) => [e.id, e]));
            const { rows, minutes } = buildRows(id, exercises, exercisesById);

            await storage.routines.update(id, {
                name: name.trim(),
                description: description?.trim() || null,
                estimated_duration: minutes,
                updated_at: new Date().toISOString(),
            });
            // Single atomic swap: a crash between delete and insert used to leave
            // the routine with no exercises at all.
            await storage.routineExercises.replaceForRoutine(id, rows);
            await fetchRoutines();
        },
        [fetchRoutines]
    );

    const deleteRoutine = useCallback(async (id: string) => {
        await deleteRoutineCascade(id);
        setRoutines((prev) => prev.filter((r) => r.id !== id));
    }, []);

    /** Duplicates a routine, exercises included. */
    const duplicateRoutine = useCallback(
        async (id: string) => {
            const source = await getRoutineDetails(id);
            if (!source) return null;

            return createRoutine(
                `${source.name} (copia)`,
                source.description,
                source.routine_exercises.map((slot) => ({
                    id: slot.exercise_id,
                    sets: slot.target_sets,
                    reps: slot.target_reps,
                    restTime: slot.rest_seconds,
                    timePerRep: slot.time_per_rep_seconds,
                    notes: slot.notes,
                }))
            );
        },
        [createRoutine, getRoutineDetails]
    );

    useEffect(() => {
        fetchRoutines();
    }, [fetchRoutines]);

    return {
        routines,
        loading,
        error,
        fetchRoutines,
        getRoutineDetails,
        createRoutine,
        updateRoutine,
        deleteRoutine,
        duplicateRoutine,
    };
}
