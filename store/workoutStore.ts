import { create } from 'zustand';
import { Exercise, WorkoutLog } from '../lib/database.types';

export interface SetData {
    id: string;
    setNumber: number;
    weight: number;
    reps: number;
    rpe: number | null;
    isWarmup: boolean;
    isCompleted: boolean;
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
    previousBest: { weight: number; reps: number } | null;
    previousSets: PreviousSetData[];
    targetSets?: number;
    targetReps?: string;
    restSeconds?: number;
    notes?: string | null;
}

interface WorkoutState {
    // Session state
    isActive: boolean;
    sessionId: string | null;
    routineId: string | null;
    routineName: string | null;
    startedAt: Date | null;

    // Exercises in progress
    exercises: ExerciseInProgress[];
    currentExerciseIndex: number;

    // Actions
    startWorkout: (routineId?: string, routineName?: string) => void;
    endWorkout: () => void;

    addExercise: (
        exercise: Exercise,
        previousBest?: { weight: number; reps: number } | null,
        overrides?: { targetSets?: number; targetReps?: string; restSeconds?: number; notes?: string | null },
        previousSets?: PreviousSetData[]
    ) => void;
    removeExercise: (index: number) => void;
    setCurrentExercise: (index: number) => void;

    addSet: (exerciseIndex: number) => void;
    updateSet: (exerciseIndex: number, setIndex: number, data: Partial<SetData>) => void;
    removeSet: (exerciseIndex: number, setIndex: number) => void;
    completeSet: (exerciseIndex: number, setIndex: number) => void;

    // Helpers
    getCompletedSets: () => number;
    getTotalVolume: () => number;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
    // Initial state
    isActive: false,
    sessionId: null,
    routineId: null,
    routineName: null,
    startedAt: null,
    exercises: [],
    currentExerciseIndex: 0,

    // Start a new workout
    startWorkout: (routineId, routineName) => {
        set({
            isActive: true,
            sessionId: generateId(),
            routineId: routineId || null,
            routineName: routineName || null,
            startedAt: new Date(),
            exercises: [],
            currentExerciseIndex: 0,
        });
    },

    // End workout and reset state
    endWorkout: () => {
        set({
            isActive: false,
            sessionId: null,
            routineId: null,
            routineName: null,
            startedAt: null,
            exercises: [],
            currentExerciseIndex: 0,
        });
    },

    // Add an exercise to the workout
    addExercise: (
        exercise: Exercise,
        previousBest?: { weight: number; reps: number } | null,
        overrides?: { targetSets?: number; targetReps?: string; restSeconds?: number; notes?: string | null },
        previousSets?: PreviousSetData[]
    ) => {
        const targetSets = overrides?.targetSets || 3;
        const targetReps = overrides?.targetReps; // String "6-8"
        // Parse numeric rep target for initial value if possible (e.g. "8-10" -> 8)
        const initialReps = targetReps ? parseInt(targetReps) || 10 : (previousBest?.reps || 10);

        // Get rest seconds: from overrides, from exercise default, or fallback to 90
        const restSeconds = overrides?.restSeconds || (exercise as any).default_rest_seconds || 90;

        const prevSets = previousSets || [];

        const newExercise: ExerciseInProgress = {
            exercise,
            previousBest: previousBest || null,
            previousSets: prevSets,
            targetSets,
            targetReps,
            restSeconds,
            notes: overrides?.notes,
            sets: Array(targetSets).fill(0).map((_, i) => {
                // Get previous data for this specific set number
                const prevSet = prevSets.find(ps => ps.setNumber === i + 1);
                return {
                    id: generateId(),
                    setNumber: i + 1,
                    weight: prevSet?.weight || previousBest?.weight || 0,
                    reps: prevSet?.reps || initialReps,
                    rpe: null,
                    isWarmup: false,
                    isCompleted: false,
                    previousWeight: prevSet?.weight,
                    previousReps: prevSet?.reps,
                };
            }),
        };

        set((state) => ({
            exercises: [...state.exercises, newExercise],
        }));
    },

    // Remove an exercise
    removeExercise: (index) => {
        set((state) => ({
            exercises: state.exercises.filter((_, i) => i !== index),
            currentExerciseIndex: Math.min(state.currentExerciseIndex, state.exercises.length - 2),
        }));
    },

    // Set the current exercise index
    setCurrentExercise: (index) => {
        set({ currentExerciseIndex: index });
    },

    // Add a new set to an exercise
    addSet: (exerciseIndex) => {
        set((state) => {
            const exercises = [...state.exercises];
            const exercise = exercises[exerciseIndex];
            const lastSet = exercise.sets[exercise.sets.length - 1];

            exercise.sets.push({
                id: generateId(),
                setNumber: exercise.sets.length + 1,
                weight: lastSet?.weight || 0,
                reps: lastSet?.reps || 10,
                rpe: null,
                isWarmup: false,
                isCompleted: false,
            });

            return { exercises };
        });
    },

    // Update a set's data
    updateSet: (exerciseIndex, setIndex, data) => {
        set((state) => {
            const exercises = [...state.exercises];
            exercises[exerciseIndex].sets[setIndex] = {
                ...exercises[exerciseIndex].sets[setIndex],
                ...data,
            };
            return { exercises };
        });
    },

    // Remove a set
    removeSet: (exerciseIndex, setIndex) => {
        set((state) => {
            const exercises = [...state.exercises];
            exercises[exerciseIndex].sets = exercises[exerciseIndex].sets
                .filter((_, i) => i !== setIndex)
                .map((s, i) => ({ ...s, setNumber: i + 1 }));
            return { exercises };
        });
    },

    // Mark a set as completed
    completeSet: (exerciseIndex, setIndex) => {
        set((state) => {
            const exercises = [...state.exercises];
            exercises[exerciseIndex].sets[setIndex].isCompleted = true;
            return { exercises };
        });
    },

    // Get total completed sets
    getCompletedSets: () => {
        const { exercises } = get();
        return exercises.reduce(
            (total, ex) => total + ex.sets.filter((s) => s.isCompleted && !s.isWarmup).length,
            0
        );
    },

    // Get total volume (weight × reps)
    getTotalVolume: () => {
        const { exercises } = get();
        return exercises.reduce(
            (total, ex) =>
                total +
                ex.sets
                    .filter((s) => s.isCompleted && !s.isWarmup)
                    .reduce((sum, s) => sum + s.weight * s.reps, 0),
            0
        );
    },
}));
