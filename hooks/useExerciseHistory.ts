import { useState, useCallback } from 'react';
import { storage } from '../lib/localDatabase';

interface ExerciseHistoryEntry {
    exercise_id: string;
    exercise_name: string;
    session_date: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    rpe: number | null;
    volume: number;
    estimated_1rm: number;
}

export function useExerciseHistory(exerciseId: string) {
    const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Calculate estimated 1RM using Brzycki formula
    const calculateEstimated1RM = (weight: number, reps: number): number => {
        if (reps <= 0 || weight <= 0) return 0;
        if (reps === 1) return weight;
        return Math.round(weight * (36 / (37 - reps)));
    };

    // Fetch history for an exercise from AsyncStorage
    const fetchHistory = useCallback(async (limit = 30) => {
        if (!exerciseId) return;

        try {
            setLoading(true);

            // Get all workout logs
            const allLogs = await storage.workoutLogs.getAll() as any[];
            const allSessions = await storage.workoutSessions.getAll() as any[];
            const allExercises = await storage.exercises.getAll() as any[];

            // Filter logs for this exercise
            const exerciseLogs = allLogs.filter(log => log.exercise_id === exerciseId);

            // Build history entries with session date and exercise name
            const exerciseInfo = allExercises.find(e => e.id === exerciseId);
            const exerciseName = exerciseInfo?.name || 'Unknown';

            const historyEntries: ExerciseHistoryEntry[] = exerciseLogs
                .map(log => {
                    const session = allSessions.find(s => s.id === log.session_id);
                    const volume = log.weight_kg * log.reps;
                    const estimated1rm = calculateEstimated1RM(log.weight_kg, log.reps);

                    return {
                        exercise_id: log.exercise_id,
                        exercise_name: exerciseName,
                        session_date: session?.session_date || '',
                        set_number: log.set_number,
                        weight_kg: log.weight_kg,
                        reps: log.reps,
                        rpe: log.rpe,
                        volume,
                        estimated_1rm: estimated1rm,
                    };
                })
                .filter(entry => entry.session_date) // Remove entries without valid session
                .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
                .slice(0, limit);

            setHistory(historyEntries);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading history');
        } finally {
            setLoading(false);
        }
    }, [exerciseId]);

    // Get the previous best (heaviest weight for a target rep range)
    const getPreviousBest = useCallback((targetReps = 10) => {
        const relevantSets = history.filter(
            (h) => h.reps >= targetReps - 2 && h.reps <= targetReps + 2
        );

        if (relevantSets.length === 0) return null;

        return relevantSets.reduce((best, current) =>
            current.weight_kg > best.weight_kg ? current : best
        );
    }, [history]);

    // Get max estimated 1RM
    const getMax1RM = useCallback(() => {
        if (history.length === 0) return null;
        return Math.max(...history.map((h) => h.estimated_1rm));
    }, [history]);

    // Get volume over time (for charts)
    const getVolumeByDate = useCallback(() => {
        const volumeByDate: Record<string, number> = {};

        history.forEach((h) => {
            const date = h.session_date;
            volumeByDate[date] = (volumeByDate[date] || 0) + h.volume;
        });

        return Object.entries(volumeByDate)
            .map(([date, volume]) => ({ date, volume }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [history]);

    return {
        history,
        loading,
        error,
        fetchHistory,
        getPreviousBest,
        getMax1RM,
        getVolumeByDate,
    };
}
