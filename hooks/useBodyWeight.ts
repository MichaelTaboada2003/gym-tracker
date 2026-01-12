import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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
            const { data, error } = await supabase
                .from('body_weight' as any)
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;

            setWeightLogs(data || []);
            if (data && data.length > 0) {
                setCurrentWeight(data[0].weight_kg);
            }
        } catch (error) {
            console.error('Error fetching weight logs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const addWeightLog = async (weight: number, date: string = new Date().toISOString().split('T')[0]) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            const { error } = await supabase
                .from('body_weight' as any)
                .insert({
                    user_id: user.id,
                    weight_kg: weight,
                    date: date
                } as any);

            if (error) throw error;
            await fetchWeightLogs();
            return true;
        } catch (error) {
            console.error('Error adding weight log:', error);
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
        fetchWeightLogs
    };
};
