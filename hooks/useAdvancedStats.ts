/**
 * useAdvancedStats Hook
 * 
 * Provides advanced performance metrics:
 * - Volume distribution by muscle group (for pie charts)
 * - Personal records and 1RM tracking
 * - Session-to-session progress comparison
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    calculateVolumeByMuscleGroup,
    calculateEstimated1RM,
    get1RMProgressHistory,
    getPersonalRecord,
    compareWithPreviousSession,
    getSessionProgressSummary,
    formatProgressDiff,
    formatForPieChart,
    MuscleGroupStats,
    OneRMRecord,
    ExerciseProgress,
    WorkoutLog,
    WorkoutSession,
} from '../lib/statsUtils';

interface AdvancedStats {
    // Muscle Group Distribution
    muscleGroupStats: MuscleGroupStats[];
    pieChartData: Array<{ value: number; color: string; text: string }>;

    // Personal Records
    personalRecords: Map<string, { exerciseName: string; record: OneRMRecord }>;

    // Loading state
    loading: boolean;
    error: string | null;
}

interface ExerciseHistory {
    exerciseId: string;
    exerciseName: string;
    history: OneRMRecord[];
    currentPR: OneRMRecord | null;
}

export function useAdvancedStats() {
    const [stats, setStats] = useState<AdvancedStats>({
        muscleGroupStats: [],
        pieChartData: [],
        personalRecords: new Map(),
        loading: true,
        error: null,
    });

    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [allLogs, setAllLogs] = useState<WorkoutLog[]>([]);

    /**
     * Fetch all data needed for advanced stats
     */
    const fetchData = useCallback(async () => {
        try {
            setStats(prev => ({ ...prev, loading: true, error: null }));

            // Fetch all sessions
            const { data: sessionsData, error: sessionsError } = await supabase
                .from('workout_sessions')
                .select('id, session_date, duration_minutes, routine_id')
                .order('session_date', { ascending: false });

            if (sessionsError) throw sessionsError;

            // Fetch all logs with exercise info
            const { data: logsData, error: logsError } = await supabase
                .from('workout_logs')
                .select(`
                    id,
                    session_id,
                    exercise_id,
                    set_number,
                    weight_kg,
                    reps,
                    is_warmup,
                    logged_at,
                    exercise:exercises(id, name, muscle_group)
                `);

            if (logsError) throw logsError;

            const logs = (logsData || []) as unknown as WorkoutLog[];
            const sessionsList = (sessionsData || []) as WorkoutSession[];

            setSessions(sessionsList);
            setAllLogs(logs);

            // Calculate muscle group distribution
            const muscleGroupStats = calculateVolumeByMuscleGroup(logs);
            const pieChartData = formatForPieChart(muscleGroupStats);

            // Calculate personal records for each exercise
            const exerciseIds = new Set(logs.map(l => l.exercise_id));
            const personalRecords = new Map<string, { exerciseName: string; record: OneRMRecord }>();

            exerciseIds.forEach(exerciseId => {
                const exerciseLogs = logs.filter(l => l.exercise_id === exerciseId);
                const exerciseName = exerciseLogs[0]?.exercise?.name || 'Unknown';
                const record = getPersonalRecord(exerciseLogs);

                if (record && record.estimated1RM > 0) {
                    personalRecords.set(exerciseId, { exerciseName, record });
                }
            });

            setStats({
                muscleGroupStats,
                pieChartData,
                personalRecords,
                loading: false,
                error: null,
            });

        } catch (error) {
            console.error('Error fetching advanced stats:', error);
            setStats(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Error loading stats',
            }));
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * Get 1RM progress history for a specific exercise (for line charts)
     */
    const getExercise1RMHistory = useCallback((exerciseId: string): ExerciseHistory | null => {
        const exerciseLogs = allLogs.filter(l => l.exercise_id === exerciseId);

        if (exerciseLogs.length === 0) return null;

        const exerciseName = exerciseLogs[0]?.exercise?.name || 'Unknown';
        const history = get1RMProgressHistory(exerciseLogs, sessions);
        const currentPR = getPersonalRecord(exerciseLogs);

        return {
            exerciseId,
            exerciseName,
            history,
            currentPR,
        };
    }, [allLogs, sessions]);

    /**
     * Compare current exercise performance with previous session
     */
    const getExerciseProgress = useCallback((
        exerciseId: string,
        currentSessionId: string,
        currentLogs: WorkoutLog[]
    ): ExerciseProgress => {
        const exerciseLogs = allLogs.filter(l => l.exercise_id === exerciseId);
        const exerciseName = exerciseLogs[0]?.exercise?.name || currentLogs[0]?.exercise?.name || 'Unknown';

        return compareWithPreviousSession(
            exerciseId,
            exerciseName,
            currentLogs,
            allLogs,
            sessions,
            currentSessionId
        );
    }, [allLogs, sessions]);

    /**
     * Get session summary with all exercise progress comparisons
     */
    const getSessionSummary = useCallback((
        currentSessionId: string,
        currentSessionLogs: WorkoutLog[]
    ) => {
        return getSessionProgressSummary(
            currentSessionLogs,
            allLogs,
            sessions,
            currentSessionId
        );
    }, [allLogs, sessions]);

    /**
     * Calculate 1RM for a given weight and reps
     */
    const calculate1RM = useCallback((weight: number, reps: number): number => {
        return calculateEstimated1RM(weight, reps);
    }, []);

    /**
     * Format progress diff as readable string
     */
    const formatProgress = useCallback((progress: ExerciseProgress): string => {
        return formatProgressDiff(progress);
    }, []);

    /**
     * Get top N personal records
     */
    const getTopRecords = useCallback((limit: number = 5) => {
        return Array.from(stats.personalRecords.entries())
            .sort(([, a], [, b]) => b.record.estimated1RM - a.record.estimated1RM)
            .slice(0, limit)
            .map(([exerciseId, data]) => ({
                exerciseId,
                exerciseName: data.exerciseName,
                ...data.record,
            }));
    }, [stats.personalRecords]);

    return {
        // Stats data
        muscleGroupStats: stats.muscleGroupStats,
        pieChartData: stats.pieChartData,
        personalRecords: stats.personalRecords,

        // State
        loading: stats.loading,
        error: stats.error,

        // Methods
        refetch: fetchData,
        getExercise1RMHistory,
        getExerciseProgress,
        getSessionSummary,
        calculate1RM,
        formatProgress,
        getTopRecords,
    };
}

export type { MuscleGroupStats, OneRMRecord, ExerciseProgress };
