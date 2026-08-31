import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage, generateId } from '../lib/localDatabase';
import { WeightLog } from '../lib/database.types';
import { parseISODate, toISODate } from '../lib/utils';

export type { WeightLog };
export type DateRange = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

export interface WeightStats {
    current: number | null;
    /** Newest minus oldest inside the range. Negative means weight lost. */
    change: number;
    min: number | null;
    max: number | null;
    avg: number | null;
}

/** Inclusive lower bound for a range, or null for "all". */
function rangeStart(range: DateRange, now = new Date()): Date | null {
    const start = new Date(now);
    switch (range) {
        case '7d':
            start.setDate(start.getDate() - 6);
            break;
        case '1m':
            start.setMonth(start.getMonth() - 1);
            break;
        case '3m':
            start.setMonth(start.getMonth() - 3);
            break;
        case '6m':
            start.setMonth(start.getMonth() - 6);
            break;
        case '1y':
            start.setFullYear(start.getFullYear() - 1);
            break;
        default:
            return null;
    }
    start.setHours(0, 0, 0, 0);
    return start;
}

export const useBodyWeight = () => {
    /** Newest first. At most one entry per calendar day. */
    const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWeightLogs = useCallback(async () => {
        try {
            const rows = await storage.bodyWeight.getAll();
            setWeightLogs([...rows].sort((a, b) => b.date.localeCompare(a.date)));
        } catch (error) {
            console.error('[weight] load failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const currentWeight = weightLogs[0]?.weight_kg ?? null;

    /**
     * Upserts the entry for `date`.
     *
     * Reads from storage rather than from React state so two quick saves cannot
     * race and resurrect a stale list.
     */
    const addWeightLog = useCallback(
        async (weight: number, date: string = toISODate()) => {
            if (!Number.isFinite(weight) || weight <= 0) return false;
            try {
                const rows = await storage.bodyWeight.getAll();
                const existing = rows.find((log) => log.date === date);
                const next = existing
                    ? rows.map((log) => (log.date === date ? { ...log, weight_kg: weight } : log))
                    : [...rows, { id: generateId(), weight_kg: weight, date }];

                await storage.bodyWeight.saveAll(next);
                await fetchWeightLogs();
                return true;
            } catch (error) {
                console.error('[weight] save failed:', error);
                return false;
            }
        },
        [fetchWeightLogs]
    );

    const deleteWeightLog = useCallback(
        async (id: string) => {
            try {
                await storage.bodyWeight.delete(id);
                await fetchWeightLogs();
                return true;
            } catch (error) {
                console.error('[weight] delete failed:', error);
                return false;
            }
        },
        [fetchWeightLogs]
    );

    const getLogsForRange = useCallback(
        (range: DateRange): WeightLog[] => {
            const start = rangeStart(range);
            if (!start) return weightLogs;
            return weightLogs.filter((log) => parseISODate(log.date) >= start);
        },
        [weightLogs]
    );

    const getStatsForRange = useCallback(
        (range: DateRange): WeightStats => {
            const logs = getLogsForRange(range);
            if (logs.length === 0) return { current: null, change: 0, min: null, max: null, avg: null };

            const weights = logs.map((l) => l.weight_kg);
            const newest = logs[0].weight_kg;
            const oldest = logs[logs.length - 1].weight_kg;

            return {
                current: newest,
                change: Math.round((newest - oldest) * 10) / 10,
                min: Math.min(...weights),
                max: Math.max(...weights),
                avg: Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10,
            };
        },
        [getLogsForRange]
    );

    /** Oldest → newest, ready to feed a line chart. */
    const chronological = useMemo(() => [...weightLogs].reverse(), [weightLogs]);

    useEffect(() => {
        fetchWeightLogs();
    }, [fetchWeightLogs]);

    return {
        weightLogs,
        chronological,
        currentWeight,
        loading,
        addWeightLog,
        deleteWeightLog,
        fetchWeightLogs,
        getLogsForRange,
        getStatsForRange,
    };
};
