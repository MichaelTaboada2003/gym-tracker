import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ExerciseHistory } from '../lib/database.types';

export function useExerciseHistory(exerciseId: string) {
    const [history, setHistory] = useState<ExerciseHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch history for an exercise
    const fetchHistory = useCallback(async (limit = 30) => {
        if (!exerciseId) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('exercise_history')
                .select('*')
                .eq('exercise_id', exerciseId)
                .order('session_date', { ascending: false })
                .limit(limit);

            if (error) throw error;
            setHistory(data || []);
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
