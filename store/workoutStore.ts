/**
 * The live workout session.
 *
 * Two things drive the design:
 *
 * - **It survives the app dying.** Phones kill backgrounded apps mid-set; the
 *   old in-memory-only store lost the whole session. State is persisted to
 *   AsyncStorage on every change and rehydrated on launch.
 * - **Timestamps, not tick counters.** The rest timer stores *when* it ends, so
 *   it stays correct while the app is backgrounded and the JS timer is frozen.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise } from '../lib/database.types';
import { STORAGE_KEYS } from '../lib/localDatabase';
import { parseTargetReps } from '../lib/utils';

export interface SetData {
    id: string;
    setNumber: number;
    weight: number;
    reps: number;
    rpe: number | null;
    isWarmup: boolean;
    isCompleted: boolean;
    /** What this set number looked like in the previous session, for the "anterior" column. */
    previousWeight?: number;
    previousReps?: number;
}

export interface PreviousSetData {
    setNumber: number;
    weight: number;
    reps: number;
}

export interface ExerciseInProgress {
    exercise: Exercise;
    sets: SetData[];
    /** Heaviest work set ever logged for this exercise. */
    previousBest: { weight: number; reps: number } | null;
    previousSets: PreviousSetData[];
    targetSets: number;
    targetReps: string;
    restSeconds: number;
    notes: string | null;
}

export interface ExerciseOverrides {
    targetSets?: number;
    targetReps?: string;
    restSeconds?: number;
    notes?: string | null;
}

/** A rest countdown, described by its endpoints so elapsed time is always real time. */
export interface RestTimerState {
    exerciseIndex: number;
    /** Epoch ms when the countdown should hit zero. */
    endsAt: number;
    /** Full length in seconds, including any ±15s adjustments. */
    durationSeconds: number;
}

interface WorkoutState {
    isActive: boolean;
    routineId: string | null;
    routineName: string | null;
    /** Epoch ms. Stored as a number so it round-trips through JSON. */
    startedAt: number | null;
    exercises: ExerciseInProgress[];
    restTimer: RestTimerState | null;
    /** False until the persisted session has been read back from storage. */
    hydrated: boolean;

    startWorkout: (routineId?: string | null, routineName?: string | null) => void;
    endWorkout: () => void;

    addExercise: (
        exercise: Exercise,
        previousBest?: { weight: number; reps: number } | null,
        overrides?: ExerciseOverrides,
        previousSets?: PreviousSetData[]
    ) => void;
    addExercises: (
        entries: {
            exercise: Exercise;
            previousBest?: { weight: number; reps: number } | null;
            overrides?: ExerciseOverrides;
            previousSets?: PreviousSetData[];
        }[]
    ) => void;
    removeExercise: (index: number) => void;
    moveExercise: (from: number, to: number) => void;

    addSet: (exerciseIndex: number) => void;
    updateSet: (exerciseIndex: number, setIndex: number, data: Partial<SetData>) => void;
    removeSet: (exerciseIndex: number, setIndex: number) => void;
    /** Flips completion both ways — mis-taps used to be unrecoverable. */
    toggleSet: (exerciseIndex: number, setIndex: number) => void;

    startRest: (exerciseIndex: number, seconds: number) => void;
    adjustRest: (deltaSeconds: number) => void;
    stopRest: () => void;

    getCompletedSets: () => number;
    getTotalVolume: () => number;
    getTotalReps: () => number;
    getElapsedMinutes: () => number;
    hasUnfinishedSets: () => boolean;
}

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

/** Renumbers sets after an insert/removal so `setNumber` always matches position. */
const renumber = (sets: SetData[]): SetData[] => sets.map((set, i) => ({ ...set, setNumber: i + 1 }));

function buildExercise(
    exercise: Exercise,
    previousBest: { weight: number; reps: number } | null | undefined,
    overrides: ExerciseOverrides | undefined,
    previousSets: PreviousSetData[] | undefined
): ExerciseInProgress {
    const targetSets = Math.max(1, overrides?.targetSets ?? 3);
    const targetReps = overrides?.targetReps ?? '';
    const restSeconds = overrides?.restSeconds ?? exercise.default_rest_seconds ?? 90;
    const prevSets = previousSets ?? [];
    const initialReps = parseTargetReps(targetReps, previousBest?.reps || 10);

    return {
        exercise,
        previousBest: previousBest ?? null,
        previousSets: prevSets,
        targetSets,
        targetReps,
        restSeconds,
        notes: overrides?.notes ?? null,
        sets: Array.from({ length: targetSets }, (_, i) => {
            const prev = prevSets.find((ps) => ps.setNumber === i + 1);
            return {
                id: generateId(),
                setNumber: i + 1,
                // Pre-fill with what was actually done last time: the fastest path
                // to logging a set is confirming the number that is already there.
                weight: prev?.weight ?? previousBest?.weight ?? 0,
                reps: prev?.reps ?? initialReps,
                rpe: null,
                isWarmup: false,
                isCompleted: false,
                previousWeight: prev?.weight,
                previousReps: prev?.reps,
            };
        }),
    };
}

const EMPTY_SESSION = {
    isActive: false,
    routineId: null,
    routineName: null,
    startedAt: null,
    exercises: [],
    restTimer: null,
} as const;

export const useWorkoutStore = create<WorkoutState>()(
    persist(
        (set, get) => ({
            ...EMPTY_SESSION,
            exercises: [] as ExerciseInProgress[],
            restTimer: null as RestTimerState | null,
            hydrated: false,

            startWorkout: (routineId, routineName) =>
                set({
                    ...EMPTY_SESSION,
                    exercises: [],
                    restTimer: null,
                    isActive: true,
                    routineId: routineId ?? null,
                    routineName: routineName ?? null,
                    startedAt: Date.now(),
                }),

            endWorkout: () => set({ ...EMPTY_SESSION, exercises: [], restTimer: null }),

            addExercise: (exercise, previousBest, overrides, previousSets) =>
                set((state) => ({
                    exercises: [...state.exercises, buildExercise(exercise, previousBest, overrides, previousSets)],
                })),

            // One update for a whole routine, instead of N store writes and N re-renders.
            addExercises: (entries) =>
                set((state) => ({
                    exercises: [
                        ...state.exercises,
                        ...entries.map((entry) =>
                            buildExercise(entry.exercise, entry.previousBest, entry.overrides, entry.previousSets)
                        ),
                    ],
                })),

            removeExercise: (index) =>
                set((state) => ({
                    exercises: state.exercises.filter((_, i) => i !== index),
                    // A timer belonging to a removed card would otherwise point at the wrong exercise.
                    restTimer:
                        state.restTimer == null
                            ? null
                            : state.restTimer.exerciseIndex === index
                              ? null
                              : state.restTimer.exerciseIndex > index
                                ? { ...state.restTimer, exerciseIndex: state.restTimer.exerciseIndex - 1 }
                                : state.restTimer,
                })),

            moveExercise: (from, to) =>
                set((state) => {
                    if (from === to || from < 0 || to < 0) return state;
                    if (from >= state.exercises.length || to >= state.exercises.length) return state;
                    const exercises = [...state.exercises];
                    const [moved] = exercises.splice(from, 1);
                    exercises.splice(to, 0, moved);
                    return { exercises, restTimer: null };
                }),

            addSet: (exerciseIndex) =>
                set((state) => {
                    const exercises = [...state.exercises];
                    const target = exercises[exerciseIndex];
                    if (!target) return state;

                    const last = target.sets[target.sets.length - 1];
                    exercises[exerciseIndex] = {
                        ...target,
                        sets: [
                            ...target.sets,
                            {
                                id: generateId(),
                                setNumber: target.sets.length + 1,
                                weight: last?.weight ?? target.previousBest?.weight ?? 0,
                                reps: last?.reps ?? parseTargetReps(target.targetReps),
                                rpe: null,
                                isWarmup: false,
                                isCompleted: false,
                            },
                        ],
                    };
                    return { exercises };
                }),

            updateSet: (exerciseIndex, setIndex, data) =>
                set((state) => {
                    const target = state.exercises[exerciseIndex];
                    if (!target?.sets[setIndex]) return state;

                    const exercises = [...state.exercises];
                    const sets = [...target.sets];
                    sets[setIndex] = { ...sets[setIndex], ...data };
                    exercises[exerciseIndex] = { ...target, sets };
                    return { exercises };
                }),

            removeSet: (exerciseIndex, setIndex) =>
                set((state) => {
                    const target = state.exercises[exerciseIndex];
                    if (!target) return state;

                    const exercises = [...state.exercises];
                    exercises[exerciseIndex] = {
                        ...target,
                        sets: renumber(target.sets.filter((_, i) => i !== setIndex)),
                    };
                    return { exercises };
                }),

            toggleSet: (exerciseIndex, setIndex) =>
                set((state) => {
                    const target = state.exercises[exerciseIndex];
                    const current = target?.sets[setIndex];
                    if (!current) return state;

                    const exercises = [...state.exercises];
                    const sets = [...target.sets];
                    sets[setIndex] = { ...current, isCompleted: !current.isCompleted };
                    exercises[exerciseIndex] = { ...target, sets };
                    return { exercises };
                }),

            startRest: (exerciseIndex, seconds) =>
                set({
                    restTimer: {
                        exerciseIndex,
                        endsAt: Date.now() + seconds * 1000,
                        durationSeconds: seconds,
                    },
                }),

            adjustRest: (deltaSeconds) =>
                set((state) => {
                    if (!state.restTimer) return state;
                    const duration = Math.max(5, state.restTimer.durationSeconds + deltaSeconds);
                    return {
                        restTimer: {
                            ...state.restTimer,
                            endsAt: Math.max(Date.now(), state.restTimer.endsAt + deltaSeconds * 1000),
                            durationSeconds: duration,
                        },
                    };
                }),

            stopRest: () => set({ restTimer: null }),

            getCompletedSets: () =>
                get().exercises.reduce(
                    (total, ex) => total + ex.sets.filter((s) => s.isCompleted && !s.isWarmup).length,
                    0
                ),

            getTotalVolume: () =>
                get().exercises.reduce(
                    (total, ex) =>
                        total +
                        ex.sets
                            .filter((s) => s.isCompleted && !s.isWarmup)
                            .reduce((sum, s) => sum + s.weight * s.reps, 0),
                    0
                ),

            getTotalReps: () =>
                get().exercises.reduce(
                    (total, ex) =>
                        total +
                        ex.sets.filter((s) => s.isCompleted && !s.isWarmup).reduce((sum, s) => sum + s.reps, 0),
                    0
                ),

            getElapsedMinutes: () => {
                const { startedAt } = get();
                if (!startedAt) return 0;
                return Math.max(0, Math.round((Date.now() - startedAt) / 60_000));
            },

            hasUnfinishedSets: () =>
                get().exercises.some((ex) => ex.sets.some((s) => !s.isCompleted && !s.isWarmup)),
        }),
        {
            name: STORAGE_KEYS.ACTIVE_WORKOUT,
            storage: createJSONStorage(() => AsyncStorage),
            // `hydrated` is runtime-only; the rest is the resumable session.
            partialize: ({ isActive, routineId, routineName, startedAt, exercises, restTimer }) => ({
                isActive,
                routineId,
                routineName,
                startedAt,
                exercises,
                restTimer,
            }),
        }
    )
);

// Screens must not render "no active workout" while the saved session is still
// being read back, so expose an explicit hydration flag.
useWorkoutStore.persist.onFinishHydration(() => {
    useWorkoutStore.setState({ hydrated: true });
});
if (useWorkoutStore.persist.hasHydrated()) {
    useWorkoutStore.setState({ hydrated: true });
}
