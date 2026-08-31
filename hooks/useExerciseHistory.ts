import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage } from '../lib/localDatabase';
import { Exercise } from '../lib/database.types';
import { calculate1RM } from '../lib/utils';

/** One set as it was performed, with the session date attached. */
export interface HistorySet {
    logId: string;
    sessionId: string;
    date: string;
    setNumber: number;
    weight: number;
    reps: number;
    rpe: number | null;
    volume: number;
    estimated1RM: number;
}

/** All sets of one exercise on one day. */
export interface HistorySession {
    sessionId: string;
    date: string;
    sets: HistorySet[];
    volume: number;
    topSet: HistorySet | null;
    best1RM: number;
}

export interface ExerciseHistorySummary {
    totalSessions: number;
    totalSets: number;
    totalVolume: number;
    /** Heaviest single work set ever. */
    heaviest: HistorySet | null;
    /** Best estimated 1RM ever. */
    best1RM: HistorySet | null;
    /** Best 1RM per day, oldest first — ready for a progress chart. */
    progression: { date: string; value: number }[];
}

const EMPTY_SUMMARY: ExerciseHistorySummary = {
    totalSessions: 0,
    totalSets: 0,
    totalVolume: 0,
    heaviest: null,
    best1RM: null,
    progression: [],
};

/**
 * Full training history for a single exercise, grouped by session.
 *
 * Work sets only — warm-ups would distort every record and volume figure.
 */
export function useExerciseHistory(exerciseId: string | undefined) {
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [sessions, setSessions] = useState<HistorySession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        if (!exerciseId) {
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const [exerciseRow, logs, workoutSessions] = await Promise.all([
                storage.exercises.getById(exerciseId),
                storage.workoutLogs.getAll(),
                storage.workoutSessions.getAll(),
            ]);

            setExercise(exerciseRow);

            const dateBySession = new Map(workoutSessions.map((s) => [s.id, s.session_date]));
            const grouped = new Map<string, HistorySet[]>();

            for (const log of logs) {
                if (log.exercise_id !== exerciseId || log.is_warmup) continue;
                const date = dateBySession.get(log.session_id);
                if (!date) continue;

                const weight = Number(log.weight_kg) || 0;
                const entry: HistorySet = {
                    logId: log.id,
                    sessionId: log.session_id,
                    date,
                    setNumber: log.set_number,
                    weight,
                    reps: log.reps || 0,
                    rpe: log.rpe,
                    volume: weight * (log.reps || 0),
                    estimated1RM: calculate1RM(weight, log.reps || 0),
                };

                const bucket = grouped.get(log.session_id);
                if (bucket) bucket.push(entry);
                else grouped.set(log.session_id, [entry]);
            }

            const result: HistorySession[] = Array.from(grouped.entries())
                .map(([sessionId, sets]) => {
                    const ordered = sets.sort((a, b) => a.setNumber - b.setNumber);
                    return {
                        sessionId,
                        date: ordered[0].date,
                        sets: ordered,
                        volume: ordered.reduce((sum, s) => sum + s.volume, 0),
                        topSet: ordered.reduce<HistorySet | null>(
                            (top, s) => (!top || s.estimated1RM > top.estimated1RM ? s : top),
                            null
                        ),
                        best1RM: ordered.reduce((max, s) => Math.max(max, s.estimated1RM), 0),
                    };
                })
                // Newest first: the list reads as a timeline going back in time.
                .sort((a, b) => b.date.localeCompare(a.date));

            setSessions(result);
        } catch (err) {
            console.error('[exercise-history] load failed:', err);
            setError('No se pudo cargar el historial');
        } finally {
            setLoading(false);
        }
    }, [exerciseId]);

    const summary = useMemo<ExerciseHistorySummary>(() => {
        if (sessions.length === 0) return EMPTY_SUMMARY;

        const allSets = sessions.flatMap((s) => s.sets);
        return {
            totalSessions: sessions.length,
            totalSets: allSets.length,
            totalVolume: allSets.reduce((sum, s) => sum + s.volume, 0),
            heaviest: allSets.reduce<HistorySet | null>(
                (top, s) => (!top || s.weight > top.weight ? s : top),
                null
            ),
            best1RM: allSets.reduce<HistorySet | null>(
                (top, s) => (!top || s.estimated1RM > top.estimated1RM ? s : top),
                null
            ),
            progression: [...sessions]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((s) => ({ date: s.date, value: s.best1RM })),
        };
    }, [sessions]);

    useEffect(() => {
        void fetchHistory();
    }, [fetchHistory]);

    return { exercise, sessions, summary, loading, error, fetchHistory };
}
