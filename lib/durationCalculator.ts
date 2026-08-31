/**
 * Routine Duration Calculator
 * 
 * Calculates the estimated time to complete a workout routine based on:
 * - Number of exercises
 * - Sets per exercise
 * - Reps per set
 * - Time per rep (from exercise config)
 * - Rest time between sets
 * - Optional: Warmup time and transition time between exercises
 */

export interface ExerciseConfig {
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps: number;
    timePerRepSeconds: number;  // From exercise table
    restBetweenSetsSeconds: number;  // Can be overridden per routine
}

export interface RoutineDurationBreakdown {
    totalMinutes: number;
    totalSeconds: number;
    workTimeSeconds: number;
    restTimeSeconds: number;
    transitionTimeSeconds: number;
    exerciseBreakdown: Array<{
        exerciseName: string;
        workTimeSeconds: number;
        restTimeSeconds: number;
        totalSeconds: number;
    }>;
}

// Default values
const DEFAULT_TIME_PER_REP = 3; // seconds
const DEFAULT_REST_BETWEEN_SETS = 90; // seconds
const TRANSITION_TIME_BETWEEN_EXERCISES = 30; // seconds to move to next exercise
const WARMUP_TIME_PER_EXERCISE = 60; // seconds for warmup set (optional)

/**
 * Calculate the estimated duration of a single exercise
 */
export function calculateExerciseDuration(
    sets: number,
    reps: number,
    timePerRepSeconds: number = DEFAULT_TIME_PER_REP,
    restBetweenSetsSeconds: number = DEFAULT_REST_BETWEEN_SETS,
    includeWarmup: boolean = false
): { workTimeSeconds: number; restTimeSeconds: number; totalSeconds: number } {
    // Work time = sets × reps × time per rep
    const workTimeSeconds = sets * reps * timePerRepSeconds;

    // Rest time = (sets - 1) × rest between sets
    // No rest after the last set
    const restTimeSeconds = Math.max(0, sets - 1) * restBetweenSetsSeconds;

    // Optional warmup time
    const warmupTime = includeWarmup ? WARMUP_TIME_PER_EXERCISE : 0;

    const totalSeconds = workTimeSeconds + restTimeSeconds + warmupTime;

    return {
        workTimeSeconds,
        restTimeSeconds,
        totalSeconds,
    };
}

/**
 * Calculate the total estimated duration of a complete routine
 * 
 * @param exercises Array of exercise configurations
 * @param includeTransitions Whether to add transition time between exercises
 * @param includeWarmups Whether to add warmup time for compound exercises
 * @returns Detailed breakdown of routine duration
 */
export function calculateRoutineDuration(
    exercises: ExerciseConfig[],
    includeTransitions: boolean = true,
    includeWarmups: boolean = true
): RoutineDurationBreakdown {
    if (exercises.length === 0) {
        return {
            totalMinutes: 0,
            totalSeconds: 0,
            workTimeSeconds: 0,
            restTimeSeconds: 0,
            transitionTimeSeconds: 0,
            exerciseBreakdown: [],
        };
    }

    let totalWorkTime = 0;
    let totalRestTime = 0;
    const exerciseBreakdown: RoutineDurationBreakdown['exerciseBreakdown'] = [];

    exercises.forEach((exercise, index) => {
        // First exercise of compound movements gets warmup time
        const isCompound = exercise.timePerRepSeconds >= 4;
        const includeWarmup = includeWarmups && isCompound && index === 0;

        const duration = calculateExerciseDuration(
            exercise.sets,
            exercise.reps,
            exercise.timePerRepSeconds || DEFAULT_TIME_PER_REP,
            exercise.restBetweenSetsSeconds || DEFAULT_REST_BETWEEN_SETS,
            includeWarmup
        );

        totalWorkTime += duration.workTimeSeconds;
        totalRestTime += duration.restTimeSeconds;

        exerciseBreakdown.push({
            exerciseName: exercise.exerciseName,
            workTimeSeconds: duration.workTimeSeconds,
            restTimeSeconds: duration.restTimeSeconds,
            totalSeconds: duration.totalSeconds,
        });
    });

    // Transition time between exercises (not after the last one)
    const transitionTimeSeconds = includeTransitions
        ? Math.max(0, exercises.length - 1) * TRANSITION_TIME_BETWEEN_EXERCISES
        : 0;

    const totalSeconds = totalWorkTime + totalRestTime + transitionTimeSeconds;
    const totalMinutes = Math.round(totalSeconds / 60);

    return {
        totalMinutes,
        totalSeconds,
        workTimeSeconds: totalWorkTime,
        restTimeSeconds: totalRestTime,
        transitionTimeSeconds,
        exerciseBreakdown,
    };
}

/**
 * Quick estimate for a routine based on number of exercises
 * Uses average values for a rough calculation
 * 
 * @param exerciseCount Number of exercises in the routine
 * @param averageSetsPerExercise Average sets per exercise (default 3)
 * @param averageRepsPerSet Average reps per set (default 10)
 * @returns Estimated minutes
 */
export function quickEstimateMinutes(
    exerciseCount: number,
    averageSetsPerExercise: number = 3,
    averageRepsPerSet: number = 10
): number {
    const totalSets = exerciseCount * averageSetsPerExercise;
    const totalReps = totalSets * averageRepsPerSet;

    // Work time: ~3 seconds per rep
    const workTimeSeconds = totalReps * 3;

    // Rest time: 90 seconds between sets, no rest after last set of each exercise
    const restSets = totalSets - exerciseCount; // Subtract one rest per exercise (no rest after last set)
    const restTimeSeconds = restSets * 90;

    // Transition time: 30 seconds between exercises
    const transitionTimeSeconds = (exerciseCount - 1) * 30;

    const totalSeconds = workTimeSeconds + restTimeSeconds + transitionTimeSeconds;
    return Math.round(totalSeconds / 60);
}

/**
 * Duration bucket used for the colour + label badge on routine cards.
 */
export function getDurationColor(minutes: number): string {
    if (minutes <= 30) return '#10B981'; // Rápido
    if (minutes <= 60) return '#3B82F6'; // Moderado
    if (minutes <= 90) return '#F59E0B'; // Largo
    return '#EF4444'; // Muy largo
}

export function getDurationLabel(minutes: number): string {
    if (minutes <= 30) return 'Rápido';
    if (minutes <= 60) return 'Moderado';
    if (minutes <= 90) return 'Largo';
    return 'Muy Largo';
}

/**
 * Estimated minutes for a routine, straight from its stored exercise rows.
 *
 * This is what `Routine.estimated_duration` is derived from, so the number on a
 * routine card and the number inside the builder always agree.
 */
export function estimateRoutineMinutes(
    exercises: {
        exerciseName?: string;
        sets: number;
        reps: number;
        timePerRepSeconds?: number;
        restBetweenSetsSeconds?: number;
    }[]
): number {
    return calculateRoutineDuration(
        exercises.map((ex, index) => ({
            exerciseId: String(index),
            exerciseName: ex.exerciseName ?? '',
            sets: ex.sets,
            reps: ex.reps,
            timePerRepSeconds: ex.timePerRepSeconds ?? DEFAULT_TIME_PER_REP,
            restBetweenSetsSeconds: ex.restBetweenSetsSeconds ?? DEFAULT_REST_BETWEEN_SETS,
        }))
    ).totalMinutes;
}
