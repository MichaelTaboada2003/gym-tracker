/**
 * Aggregations for the Progreso screen.
 *
 * The 1RM formula lives in `lib/utils` (`calculate1RM`, Epley). It used to be
 * reimplemented here and again in the history hook — one of them with Brzycki —
 * so the same lift showed different records on different screens.
 */

import { getMuscleColor } from '../constants/colors';
import { WorkoutLog } from './database.types';
import { calculate1RM } from './utils';

export interface MuscleGroupStats {
    muscleGroup: string;
    sets: number;
    volume: number;
    /** Share of total work sets, 0–100. */
    percentage: number;
    color: string;
}

export interface OneRMRecord {
    date: string;
    weight: number;
    reps: number;
    estimated1RM: number;
}

/** A log joined with the muscle group of its exercise. */
export interface LogWithExercise extends WorkoutLog {
    exercise: { id: string; name: string; muscle_group: string } | null;
}

/**
 * Set and volume distribution per muscle group, sorted by most-trained.
 *
 * Warm-ups are excluded: they would inflate whichever muscle the user warms up
 * for without representing real work.
 */
export function calculateVolumeByMuscleGroup(logs: LogWithExercise[]): MuscleGroupStats[] {
    const workLogs = logs.filter((log) => !log.is_warmup);
    const totals = new Map<string, { sets: number; volume: number }>();

    for (const log of workLogs) {
        const muscleGroup = log.exercise?.muscle_group || 'Otros';
        const volume = (Number(log.weight_kg) || 0) * (log.reps || 0);
        const current = totals.get(muscleGroup);
        if (current) {
            current.sets += 1;
            current.volume += volume;
        } else {
            totals.set(muscleGroup, { sets: 1, volume });
        }
    }

    const totalSets = workLogs.length;
    return Array.from(totals.entries())
        .map(([muscleGroup, data]) => ({
            muscleGroup,
            sets: data.sets,
            volume: Math.round(data.volume),
            percentage: totalSets > 0 ? Math.round((data.sets / totalSets) * 100) : 0,
            color: getMuscleColor(muscleGroup),
        }))
        .sort((a, b) => b.sets - a.sets);
}

/** Shapes muscle-group stats for `react-native-gifted-charts`' PieChart. */
export function formatForPieChart(
    stats: MuscleGroupStats[]
): { value: number; color: string; text: string }[] {
    return stats.map((stat) => ({ value: stat.sets, color: stat.color, text: `${stat.percentage}%` }));
}

/** Best estimated 1RM ever recorded for one exercise's logs. */
export function getPersonalRecord(logs: WorkoutLog[]): OneRMRecord | null {
    let best: OneRMRecord | null = null;

    for (const log of logs) {
        if (log.is_warmup) continue;
        const weight = Number(log.weight_kg) || 0;
        if (weight <= 0) continue;

        const estimated1RM = calculate1RM(weight, log.reps);
        if (!best || estimated1RM > best.estimated1RM) {
            best = { date: log.logged_at ?? '', weight, reps: log.reps, estimated1RM };
        }
    }

    return best;
}
