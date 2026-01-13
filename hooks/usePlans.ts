import { useState, useEffect } from 'react';
import { storage, generateId } from '../lib/localDatabase';
import { Plan, PlanRoutine, Routine } from '../lib/database.types';

export type PlanWithRoutines = Plan & {
    items: (PlanRoutine & { routine: Routine })[];
};

export function usePlans() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const result = await storage.plans.getAll() as Plan[];
            // Sort by created_at descending
            const sorted = result.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setPlans(sorted);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPlanDetails = async (id: string): Promise<PlanWithRoutines | null> => {
        try {
            // 1. Get Plan
            const plan = await storage.plans.getById(id) as Plan | null;
            if (!plan) return null;

            // 2. Get Routines for this plan
            const planRoutines = await storage.planRoutines.getByPlanId(id) as any[];
            const allRoutines = await storage.routines.getAll() as Routine[];

            // 3. Join data
            const items = planRoutines
                .sort((a, b) => a.day_number - b.day_number)
                .map((pr) => {
                    const routine = allRoutines.find((r) => r.id === pr.routine_id);
                    return {
                        ...pr,
                        routine: routine || {
                            id: pr.routine_id,
                            name: 'Rutina no encontrada',
                            description: null,
                            estimated_duration: 0,
                            created_at: '',
                            updated_at: '',
                        },
                    };
                });

            return {
                ...plan,
                items,
            };
        } catch (error) {
            console.error('Error fetching plan details:', error);
            return null;
        }
    };

    const createPlan = async (
        name: string,
        description: string | null,
        routines: { day: number; routineId: string; notes?: string }[]
    ) => {
        try {
            setLoading(true);
            const planId = generateId();
            const now = new Date().toISOString();

            // 1. Create Plan
            const newPlan: Plan = {
                id: planId,
                name,
                description,
                duration_days: 7,
                created_at: now,
                updated_at: now,
            };
            await storage.plans.add(newPlan);

            // 2. Create Plan Routines
            const routinesList = routines || [];
            for (const r of routinesList) {
                const planRoutine = {
                    id: generateId(),
                    plan_id: planId,
                    routine_id: r.routineId,
                    day_number: r.day,
                    notes: r.notes || null,
                    created_at: now,
                };
                await storage.planRoutines.add(planRoutine);
            }

            await fetchPlans();
            return newPlan;
        } catch (error) {
            console.error('Error creating plan:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updatePlan = async (
        id: string,
        name: string,
        description: string | null,
        routines: { day: number; routineId: string; notes?: string }[]
    ) => {
        try {
            setLoading(true);
            const now = new Date().toISOString();

            // 1. Update Plan Metadata
            await storage.plans.update(id, {
                name,
                description,
                updated_at: now,
            });

            // 2. Delete existing routines for this plan
            await storage.planRoutines.deleteByPlanId(id);

            // 3. Insert new routines
            const routinesList = routines || [];
            for (const r of routinesList) {
                const planRoutine = {
                    id: generateId(),
                    plan_id: id,
                    routine_id: r.routineId,
                    day_number: r.day,
                    notes: r.notes || null,
                    created_at: now,
                };
                await storage.planRoutines.add(planRoutine);
            }

            await fetchPlans();
            return true;
        } catch (error) {
            console.error('Error updating plan:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const deletePlan = async (id: string) => {
        try {
            await storage.planRoutines.deleteByPlanId(id);
            await storage.plans.delete(id);
            setPlans((prev) => prev.filter((p) => p.id !== id));
        } catch (error) {
            console.error('Error deleting plan:', error);
            throw error;
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
        updatePlan,
        deletePlan,
    };
}
