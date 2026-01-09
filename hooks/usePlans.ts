import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plan, PlanRoutine, Routine } from '../lib/database.types';

export type PlanWithRoutines = Plan & {
    items: (PlanRoutine & { routine: Routine })[];
};

export function usePlans() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('training_plans')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPlanDetails = async (id: string): Promise<PlanWithRoutines | null> => {
        try {
            // 1. Get Plan
            const { data: plan, error: planError } = await supabase
                .from('training_plans')
                .select('*')
                .eq('id', id)
                .single();

            if (planError) throw planError;

            // 2. Get Routines for this plan
            const { data: items, error: itemsError } = await supabase
                .from('plan_routines')
                .select('*, routine:routines(*)')
                .eq('plan_id', id)
                .order('day_number', { ascending: true });

            if (itemsError) throw itemsError;

            return {
                ...plan,
                items: items as any
            };
        } catch (error) {
            console.error('Error fetching plan details:', error);
            return null;
        }
    };

    const createPlan = async (name: string, description: string | null, durationDays: number, routines: { day: number; routineId: string; notes?: string }[]) => {
        try {
            setLoading(true);

            // 1. Create Plan
            const { data: planData, error: planError } = await supabase
                .from('training_plans')
                .insert({
                    name,
                    description,
                    duration_days: durationDays
                })
                .select()
                .single();

            if (planError) throw planError;

            // 2. Create Plan Routines
            if (routines.length > 0) {
                const planRoutinesData = routines.map(r => ({
                    plan_id: planData.id,
                    routine_id: r.routineId,
                    day_number: r.day,
                    notes: r.notes || null,
                }));

                const { error: routinesError } = await supabase
                    .from('plan_routines')
                    .insert(planRoutinesData);

                if (routinesError) throw routinesError;
            }

            // 3. Refresh plans
            await fetchPlans();
            return planData;
        } catch (error) {
            console.error('Error creating plan:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updatePlan = async (id: string, name: string, description: string | null, durationDays: number, routines: { day: number; routineId: string; notes?: string }[]) => {
        try {
            setLoading(true);

            // 1. Update Plan Metadata
            const { error: planError } = await supabase
                .from('training_plans')
                .update({
                    name,
                    description,
                    duration_days: durationDays,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (planError) throw planError;

            // 2. Delete existing routines for this plan
            const { error: deleteError } = await supabase
                .from('plan_routines')
                .delete()
                .eq('plan_id', id);

            if (deleteError) throw deleteError;

            // 3. Insert new routines
            if (routines.length > 0) {
                const planRoutinesData = routines.map(r => ({
                    plan_id: id,
                    routine_id: r.routineId,
                    day_number: r.day,
                    notes: r.notes || null,
                }));

                const { error: routinesError } = await supabase
                    .from('plan_routines')
                    .insert(planRoutinesData);

                if (routinesError) throw routinesError;
            }

            // 4. Refresh
            await fetchPlans();
            return true;
        } catch (error) {
            console.error('Error updating plan:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchPlans();
    }, []);

    return {
        plans,
        loading,
        fetchPlans,
        getPlanDetails,
        createPlan,
        updatePlan
    };
}
