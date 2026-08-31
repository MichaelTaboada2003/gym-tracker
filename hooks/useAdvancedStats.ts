/**
 * Aggregate metrics for the Progreso screen: muscle-group distribution and the
 * all-time 1RM leaderboard.
 *
 * Per-exercise history lives in `useExerciseHistory`, and the records earned in
 * a single session are computed at save time in `useWorkoutSession` — this hook
 * used to duplicate both.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage } from '../lib/localDatabase';
import {
    calculateVolumeByMuscleGroup,
    formatForPieChart,
    getPersonalRecord,
    LogWithExercise,
    MuscleGroupStats,
    OneRMRecord,
} from '../lib/statsUtils';

export interface TopRecord extends OneRMRecord {
    exerciseId: string;
    exerciseName: string;
}

export function useAdvancedStats() {
    const [muscleGroupStats, setMuscleGroupStats] = useState<MuscleGroupStats[]>([]);
    const [records, setRecords] = useState<TopRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const [logs, exercises] = await Promise.all([
                storage.workoutLogs.getAll(),
                storage.exercises.getAll(),
            ]);

            const exercisesById = new Map(exercises.map((e) => [e.id, e]));
            const joined: LogWithExercise[] = logs.map((log) => {
                const exercise = exercisesById.get(log.exercise_id);
                return {
                    ...log,
                    exercise: exercise
                        ? { id: exercise.id, name: exercise.name, muscle_group: exercise.muscle_group }
                        : null,
                };
            });

            setMuscleGroupStats(calculateVolumeByMuscleGroup(joined));

            const byExercise = new Map<string, LogWithExercise[]>();
            for (const log of joined) {
                const bucket = byExercise.get(log.exercise_id);
                if (bucket) bucket.push(log);
                else byExercise.set(log.exercise_id, [log]);
            }

            const topRecords: TopRecord[] = [];
            byExercise.forEach((exerciseLogs, exerciseId) => {
                const record = getPersonalRecord(exerciseLogs);
                if (!record || record.estimated1RM <= 0) return;
                topRecords.push({
                    ...record,
                    exerciseId,
                    exerciseName: exerciseLogs[0].exercise?.name ?? 'Ejercicio',
                });
            });

            setRecords(topRecords.sort((a, b) => b.estimated1RM - a.estimated1RM));
        } catch (err) {
            console.error('[stats] load failed:', err);
            setError('No se pudieron calcular las estadísticas');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const pieChartData = useMemo(() => formatForPieChart(muscleGroupStats), [muscleGroupStats]);

    const getTopRecords = useCallback((limit = 5) => records.slice(0, limit), [records]);

    return { muscleGroupStats, pieChartData, records, getTopRecords, loading, error, refetch: fetchData };
}

export type { MuscleGroupStats, OneRMRecord };
