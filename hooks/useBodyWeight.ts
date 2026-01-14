import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../lib/localDatabase';

const BODY_WEIGHT_KEY = '@gym_tracker_body_weight';

export interface WeightLog {
    id: string;
    weight_kg: number;
    date: string; // Format: YYYY-MM-DD
}

export type DateRange = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

export const useBodyWeight = () => {
    const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeight, setCurrentWeight] = useState<number | null>(null);

    const fetchWeightLogs = useCallback(async () => {
        try {
            setLoading(true);
            const data = await AsyncStorage.getItem(BODY_WEIGHT_KEY);
            let logs: WeightLog[] = data ? JSON.parse(data) : [];

            // Clean up duplicates: keep only the most recent entry for each date
            const dateMap = new Map<string, WeightLog>();

            // Sort by id or creation order to determine which one to keep (latest)
            logs.forEach(log => {
                const existing = dateMap.get(log.date);
                if (!existing) {
                    dateMap.set(log.date, log);
                } else {
                    // Keep the one with the higher id (most recently created)
                    // Since generateId() uses timestamp, higher = newer
                    if (log.id > existing.id) {
                        dateMap.set(log.date, log);
                    }
                }
            });

            // Convert back to array and check if we removed duplicates
            const cleanedLogs = Array.from(dateMap.values());

            // If we removed duplicates, save the cleaned data
            if (cleanedLogs.length < logs.length) {
                await AsyncStorage.setItem(BODY_WEIGHT_KEY, JSON.stringify(cleanedLogs));
                console.log(`Cleaned ${logs.length - cleanedLogs.length} duplicate weight entries`);
            }

            // Sort by date descending (most recent first)
            const sorted = cleanedLogs.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setWeightLogs(sorted);
            if (sorted.length > 0) {
                setCurrentWeight(sorted[0].weight_kg);
            } else {
                setCurrentWeight(null);
            }
        } catch (error) {
            console.error('Error fetching weight logs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Add or update weight for a specific date (upsert behavior)
    const addWeightLog = async (weight: number, date: string = new Date().toISOString().split('T')[0]) => {
        try {
            // Check if there's already a log for this date
            const existingLogIndex = weightLogs.findIndex(log => log.date === date);

            let updatedLogs: WeightLog[];

            if (existingLogIndex !== -1) {
                // Update existing log for this date
                updatedLogs = weightLogs.map((log, index) =>
                    index === existingLogIndex
                        ? { ...log, weight_kg: weight }
                        : log
                );
            } else {
                // Create new log
                const newLog: WeightLog = {
                    id: generateId(),
                    weight_kg: weight,
                    date: date,
                };
                updatedLogs = [...weightLogs, newLog];
            }

            await AsyncStorage.setItem(BODY_WEIGHT_KEY, JSON.stringify(updatedLogs));
            await fetchWeightLogs(); // Re-fetch to ensure state is consistent
            return true;
        } catch (error) {
            console.error('Error adding/updating weight log:', error);
            return false;
        }
    };

    const deleteWeightLog = async (id: string) => {
        try {
            const updatedLogs = weightLogs.filter(log => log.id !== id);
            await AsyncStorage.setItem(BODY_WEIGHT_KEY, JSON.stringify(updatedLogs));
            await fetchWeightLogs();
            return true;
        } catch (error) {
            console.error('Error deleting weight log:', error);
            return false;
        }
    };

    // Get logs filtered by date range
    const getLogsForRange = useCallback((range: DateRange): WeightLog[] => {
        if (range === 'all') return weightLogs;

        const now = new Date();
        let startDate: Date;

        switch (range) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '1m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
            case '3m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
            case '6m':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                break;
            case '1y':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            default:
                return weightLogs;
        }

        return weightLogs.filter(log => new Date(log.date) >= startDate);
    }, [weightLogs]);

    // Calculate statistics for a range
    const getStatsForRange = useCallback((range: DateRange) => {
        const logs = getLogsForRange(range);

        if (logs.length === 0) {
            return {
                current: null,
                change: 0,
                min: null,
                max: null,
                avg: null,
            };
        }

        const weights = logs.map(l => l.weight_kg);
        const current = logs[0]?.weight_kg ?? null;
        const oldest = logs[logs.length - 1]?.weight_kg ?? current;

        return {
            current,
            change: current && oldest ? current - oldest : 0,
            min: Math.min(...weights),
            max: Math.max(...weights),
            avg: weights.reduce((a, b) => a + b, 0) / weights.length,
        };
    }, [getLogsForRange]);

    useEffect(() => {
        fetchWeightLogs();
    }, [fetchWeightLogs]);

    return {
        weightLogs,
        currentWeight,
        loading,
        addWeightLog,
        deleteWeightLog,
        fetchWeightLogs,
        getLogsForRange,
        getStatsForRange,
    };
};
