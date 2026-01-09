/**
 * Advanced Statistics Utilities for Gym Tracker
 * 
 * This module contains performance metrics calculations:
 * - Volume by muscle group
 * - Estimated 1RM (Epley formula)
 * - Session-to-session progress comparison
 */

// =============================================================================
// TYPES
// =============================================================================

export interface WorkoutLog {
    id: string;
    session_id: string;
    exercise_id: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    is_warmup: boolean;
    logged_at?: string;
    exercise?: {
        id: string;
        name: string;
        muscle_group: string;
    };
}

export interface WorkoutSession {
    id: string;
    session_date: string;
    duration_minutes: number;
    routine_id?: string;
}

export interface MuscleGroupStats {
    muscleGroup: string;
    sets: number;
    volume: number;
    percentage: number;
    color: string;
}

export interface OneRMRecord {
    date: string;
    weight: number;
    reps: number;
    estimated1RM: number;
}

export interface ExerciseProgress {
    exerciseId: string;
    exerciseName: string;
    current: {
        weight: number;
        reps: number;
        sets: number;
    };
    previous: {
        weight: number;
        reps: number;
        sets: number;
        date: string;
    } | null;
    diff: {
        weight: number;
        reps: number;
        sets: number;
        weightPercentage: number;
    } | null;
    trend: 'up' | 'down' | 'same' | 'new';
}

// =============================================================================
// MUSCLE GROUP COLORS
// =============================================================================

const MUSCLE_GROUP_COLORS: Record<string, string> = {
    'Pecho': '#EF4444',      // Red
    'Espalda': '#3B82F6',    // Blue
    'Hombros': '#F59E0B',    // Amber
    'Bíceps': '#8B5CF6',     // Purple
    'Tríceps': '#A855F7',    // Purple variant
    'Piernas': '#10B981',    // Emerald
    'Glúteos': '#14B8A6',    // Teal
    'Core': '#EC4899',       // Pink
    'Cardio': '#06B6D4',     // Cyan
    'Otros': '#6B7280',      // Gray
};

// =============================================================================
// 1. VOLUME BY MUSCLE GROUP (for Pie Chart)
// =============================================================================

/**
 * Calculates the distribution of sets/volume per muscle group
 * 
 * @param logs - Array of workout logs with exercise info
 * @returns Array ready for pie chart consumption
 * 
 * @example
 * const stats = calculateVolumeByMuscleGroup(logs);
 * // Returns: [{ muscleGroup: "Pecho", sets: 12, volume: 2400, percentage: 25.5, color: "#EF4444" }, ...]
 */
export function calculateVolumeByMuscleGroup(logs: WorkoutLog[]): MuscleGroupStats[] {
    // Filter out warmup sets
    const workLogs = logs.filter(log => !log.is_warmup);

    // Aggregate by muscle group
    const muscleGroupMap = new Map<string, { sets: number; volume: number }>();

    workLogs.forEach(log => {
        const muscleGroup = log.exercise?.muscle_group || 'Otros';
        const volume = Number(log.weight_kg) * log.reps;

        const current = muscleGroupMap.get(muscleGroup) || { sets: 0, volume: 0 };
        muscleGroupMap.set(muscleGroup, {
            sets: current.sets + 1,
            volume: current.volume + volume,
        });
    });

    // Calculate totals for percentages
    const totalSets = workLogs.length;

    // Convert to array format for charting
    const result: MuscleGroupStats[] = Array.from(muscleGroupMap.entries())
        .map(([muscleGroup, data]) => ({
            muscleGroup,
            sets: data.sets,
            volume: Math.round(data.volume),
            percentage: totalSets > 0 ? Math.round((data.sets / totalSets) * 100) : 0,
            color: MUSCLE_GROUP_COLORS[muscleGroup] || MUSCLE_GROUP_COLORS['Otros'],
        }))
        .sort((a, b) => b.sets - a.sets); // Sort by most worked

    return result;
}

/**
 * Format muscle group stats for pie chart library consumption
 */
export function formatForPieChart(stats: MuscleGroupStats[]): Array<{ value: number; color: string; text: string }> {
    return stats.map(stat => ({
        value: stat.sets,
        color: stat.color,
        text: `${stat.percentage}%`,
    }));
}

// =============================================================================
// 2. ESTIMATED 1RM CALCULATION (Epley Formula)
// =============================================================================

/**
 * Calculates estimated 1 Rep Max using the Epley formula
 * 
 * Formula: 1RM = weight × (1 + reps/30)
 * 
 * Note: This formula is most accurate for reps between 1-10
 * For higher reps, consider using Brzycki formula
 * 
 * @param weight - Weight lifted in kg
 * @param reps - Number of repetitions performed
 * @returns Estimated 1RM in kg, rounded to 1 decimal
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
    // Handle edge cases
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return weight; // Actual 1RM

    // Epley formula: 1RM = weight × (1 + reps/30)
    const estimated1RM = weight * (1 + reps / 30);

    return Math.round(estimated1RM * 10) / 10; // Round to 1 decimal
}

/**
 * Alternative: Brzycki formula (more accurate for higher rep ranges)
 * Formula: 1RM = weight × (36 / (37 - reps))
 */
export function calculateEstimated1RMBrzycki(weight: number, reps: number): number {
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return weight;
    if (reps >= 37) return 0; // Formula breaks at 37 reps

    const estimated1RM = weight * (36 / (37 - reps));
    return Math.round(estimated1RM * 10) / 10;
}

/**
 * Gets the best estimated 1RM for each date from exercise history
 * 
 * @param logs - All workout logs for a specific exercise
 * @param sessions - Session data to get dates
 * @returns Array of 1RM records sorted by date (for charting progress)
 */
export function get1RMProgressHistory(
    logs: WorkoutLog[],
    sessions: WorkoutSession[]
): OneRMRecord[] {
    // Create a map of session_id to session_date
    const sessionDateMap = new Map(sessions.map(s => [s.id, s.session_date]));

    // Filter work sets only
    const workLogs = logs.filter(log => !log.is_warmup);

    // Group by date and find best 1RM per date
    const dateMap = new Map<string, OneRMRecord>();

    workLogs.forEach(log => {
        const date = sessionDateMap.get(log.session_id);
        if (!date) return;

        const current1RM = calculateEstimated1RM(Number(log.weight_kg), log.reps);
        const existing = dateMap.get(date);

        // Keep the best 1RM for each date
        if (!existing || current1RM > existing.estimated1RM) {
            dateMap.set(date, {
                date,
                weight: Number(log.weight_kg),
                reps: log.reps,
                estimated1RM: current1RM,
            });
        }
    });

    // Sort by date ascending for chart
    return Array.from(dateMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get the personal record (best 1RM ever) for an exercise
 */
export function getPersonalRecord(logs: WorkoutLog[]): OneRMRecord | null {
    const workLogs = logs.filter(log => !log.is_warmup && log.weight_kg > 0);

    if (workLogs.length === 0) return null;

    let bestRecord: OneRMRecord | null = null;

    workLogs.forEach(log => {
        const estimated1RM = calculateEstimated1RM(Number(log.weight_kg), log.reps);

        if (!bestRecord || estimated1RM > bestRecord.estimated1RM) {
            bestRecord = {
                date: log.logged_at || '',
                weight: Number(log.weight_kg),
                reps: log.reps,
                estimated1RM,
            };
        }
    });

    return bestRecord;
}

// =============================================================================
// 3. SESSION COMPARISON / PROGRESS TRACKING
// =============================================================================

/**
 * Compares an exercise's performance with the previous session
 * 
 * @param exerciseId - The exercise to compare
 * @param currentLogs - Logs from the current session for this exercise
 * @param allLogs - All historical logs
 * @param sessions - All sessions ordered by date
 * @param currentSessionId - The current session ID to exclude
 * @returns Progress comparison object
 */
export function compareWithPreviousSession(
    exerciseId: string,
    exerciseName: string,
    currentLogs: WorkoutLog[],
    allLogs: WorkoutLog[],
    sessions: WorkoutSession[],
    currentSessionId: string
): ExerciseProgress {
    // Get current session stats (work sets only)
    const currentWorkLogs = currentLogs.filter(l => !l.is_warmup);
    const currentBestSet = currentWorkLogs.reduce((best, log) => {
        return log.weight_kg > best.weight_kg ? log : best;
    }, { weight_kg: 0, reps: 0 } as { weight_kg: number; reps: number });

    const current = {
        weight: Number(currentBestSet.weight_kg) || 0,
        reps: currentBestSet.reps || 0,
        sets: currentWorkLogs.length,
    };

    // Find previous session with this exercise (excluding current)
    const exerciseLogs = allLogs.filter(l =>
        l.exercise_id === exerciseId &&
        l.session_id !== currentSessionId &&
        !l.is_warmup
    );

    if (exerciseLogs.length === 0) {
        return {
            exerciseId,
            exerciseName,
            current,
            previous: null,
            diff: null,
            trend: 'new',
        };
    }

    // Get the most recent previous session
    const sessionDateMap = new Map(sessions.map(s => [s.id, s.session_date]));
    const sortedLogs = exerciseLogs.sort((a, b) => {
        const dateA = sessionDateMap.get(a.session_id) || '';
        const dateB = sessionDateMap.get(b.session_id) || '';
        return dateB.localeCompare(dateA); // Most recent first
    });

    const previousSessionId = sortedLogs[0].session_id;
    const previousSessionLogs = sortedLogs.filter(l => l.session_id === previousSessionId);
    const previousDate = sessionDateMap.get(previousSessionId) || '';

    const previousBestSet = previousSessionLogs.reduce((best, log) => {
        return log.weight_kg > best.weight_kg ? log : best;
    }, { weight_kg: 0, reps: 0 } as { weight_kg: number; reps: number });

    const previous = {
        weight: Number(previousBestSet.weight_kg) || 0,
        reps: previousBestSet.reps || 0,
        sets: previousSessionLogs.length,
        date: previousDate,
    };

    // Calculate diff
    const weightDiff = current.weight - previous.weight;
    const repsDiff = current.reps - previous.reps;
    const setsDiff = current.sets - previous.sets;
    const weightPercentage = previous.weight > 0
        ? Math.round((weightDiff / previous.weight) * 100)
        : 0;

    // Determine trend
    let trend: 'up' | 'down' | 'same';
    if (weightDiff > 0 || (weightDiff === 0 && repsDiff > 0)) {
        trend = 'up';
    } else if (weightDiff < 0 || (weightDiff === 0 && repsDiff < 0)) {
        trend = 'down';
    } else {
        trend = 'same';
    }

    return {
        exerciseId,
        exerciseName,
        current,
        previous,
        diff: {
            weight: weightDiff,
            reps: repsDiff,
            sets: setsDiff,
            weightPercentage,
        },
        trend,
    };
}

/**
 * Formats the progress diff as a human-readable string
 */
export function formatProgressDiff(progress: ExerciseProgress): string {
    if (progress.trend === 'new') {
        return '🆕 Primera vez';
    }

    if (!progress.diff) return '';

    const parts: string[] = [];

    if (progress.diff.weight !== 0) {
        const sign = progress.diff.weight > 0 ? '+' : '';
        parts.push(`${sign}${progress.diff.weight}kg`);
    }

    if (progress.diff.reps !== 0) {
        const sign = progress.diff.reps > 0 ? '+' : '';
        parts.push(`${sign}${progress.diff.reps} reps`);
    }

    if (parts.length === 0) {
        return '= Mismo rendimiento';
    }

    const emoji = progress.trend === 'up' ? '📈' : progress.trend === 'down' ? '📉' : '➡️';
    return `${emoji} ${parts.join(', ')}`;
}

/**
 * Gets a summary of improvements for all exercises in a session
 */
export function getSessionProgressSummary(
    currentSessionLogs: WorkoutLog[],
    allLogs: WorkoutLog[],
    sessions: WorkoutSession[],
    currentSessionId: string
): {
    improved: number;
    declined: number;
    same: number;
    newExercises: number;
    details: ExerciseProgress[];
} {
    // Group current logs by exercise
    const exerciseMap = new Map<string, { name: string; logs: WorkoutLog[] }>();
    currentSessionLogs.forEach(log => {
        const existing = exerciseMap.get(log.exercise_id);
        if (existing) {
            existing.logs.push(log);
        } else {
            exerciseMap.set(log.exercise_id, {
                name: log.exercise?.name || 'Unknown',
                logs: [log],
            });
        }
    });

    const details: ExerciseProgress[] = [];
    let improved = 0;
    let declined = 0;
    let same = 0;
    let newExercises = 0;

    exerciseMap.forEach((data, exerciseId) => {
        const progress = compareWithPreviousSession(
            exerciseId,
            data.name,
            data.logs,
            allLogs,
            sessions,
            currentSessionId
        );

        details.push(progress);

        switch (progress.trend) {
            case 'up': improved++; break;
            case 'down': declined++; break;
            case 'same': same++; break;
            case 'new': newExercises++; break;
        }
    });

    return { improved, declined, same, newExercises, details };
}
