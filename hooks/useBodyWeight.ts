import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../lib/localDatabase';

const BODY_WEIGHT_KEY = '@gym_tracker_body_weight';

export interface WeightLog {
    id: string;
    weight_kg: number;
    date: string;
}

export const useBodyWeight = () => {
    const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeight, setCurrentWeight] = useState<number | null>(null);

    const fetchWeightLogs = useCallback(async () => {
        try {
            setLoading(true);
            const data = await AsyncStorage.getItem(BODY_WEIGHT_KEY);
            const logs: WeightLog[] = data ? JSON.parse(data) : [];

            // Sort by date descending
            const sorted = logs.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setWeightLogs(sorted);
            if (sorted.length > 0) {
                setCurrentWeight(sorted[0].weight_kg);
            }
        } catch (error) {
            console.error('Error fetching weight logs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const addWeightLog = async (weight: number, date: string = new Date().toISOString().split('T')[0]) => {
        try {
            const newLog: WeightLog = {
                id: generateId(),
                weight_kg: weight,
                date: date,
            };

            const updatedLogs = [...weightLogs, newLog];
            await AsyncStorage.setItem(BODY_WEIGHT_KEY, JSON.stringify(updatedLogs));
            await fetchWeightLogs();
            return true;
        } catch (error) {
            console.error('Error adding weight log:', error);
            return false;
        }
    };

    const deleteWeightLog = async (id: string) => {
        try {
            const updatedLogs = weightLogs.filter(log => log.id !== id);
            await AsyncStorage.setItem(BODY_WEIGHT_KEY, JSON.stringify(updatedLogs));
            setWeightLogs(updatedLogs);

            if (updatedLogs.length > 0) {
                setCurrentWeight(updatedLogs[0].weight_kg);
            } else {
                setCurrentWeight(null);
            }
            return true;
        } catch (error) {
            console.error('Error deleting weight log:', error);
            return false;
        }
    };

    useEffect(() => {
        fetchWeightLogs();
    }, [fetchWeightLogs]);

    return {
        weightLogs,
        currentWeight,
        loading,
        addWeightLog,
        deleteWeightLog,
        fetchWeightLogs
    };
};
