import { useState, useEffect } from 'react';
import { db, generateId } from '../lib/localDatabase';
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
            const result = await db.getAllAsync<Plan>(
                'SELECT * FROM training_plans ORDER BY created_at DESC;'
            );
            setPlans(result || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPlanDetails = async (id: string): Promise<PlanWithRoutines | null> => {
        try {
            // 1. Get Plan
            const planResult = await db.getFirstAsync<Plan>(
                'SELECT * FROM training_plans WHERE id = ?;',
                [id]
            );

            if (!planResult) return null;

            // 2. Get Routines for this plan
            const itemsResult = await db.getAllAsync<PlanRoutine & {
                routine_id: string;
                routine_name: string;
                routine_description: string | null;
                routine_estimated_duration: number;
                routine_created_at: string;
                routine_updated_at: string;
            }>(
                `SELECT pr.*, 
                        r.id as routine_id,
                        r.name as routine_name, 
                        r.description as routine_description,
                        r.estimated_duration as routine_estimated_duration,
                        r.created_at as routine_created_at,
                        r.updated_at as routine_updated_at
                 FROM plan_routines pr
                 JOIN routines r ON pr.routine_id = r.id
                 WHERE pr.plan_id = ?
                 ORDER BY pr.day_number ASC;`,
                [id]
            );

            return {
                ...planResult,
                items: (itemsResult || []).map((row) => ({
                    id: row.id,
                    plan_id: row.plan_id,
                    routine_id: row.routine_id,
                    day_number: row.day_number,
                    notes: row.notes,
                    created_at: row.created_at,
                    routine: {
                        id: row.routine_id,
                        name: row.routine_name,
                        description: row.routine_description,
                        estimated_duration: row.routine_estimated_duration,
                        created_at: row.routine_created_at,
                        updated_at: row.routine_updated_at,
                    },
                })),
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
            await db.runAsync(
                `INSERT INTO training_plans (id, name, description, duration_days, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?);`,
                [planId, name, description, 7, now, now]
            );

            // 2. Create Plan Routines
            for (const r of routines) {
                const prId = generateId();
                await db.runAsync(
                    `INSERT INTO plan_routines (id, plan_id, routine_id, day_number, notes, created_at)
                     VALUES (?, ?, ?, ?, ?, ?);`,
                    [prId, planId, r.routineId, r.day, r.notes || null, now]
                );
            }

            await fetchPlans();
            return { id: planId, name, description };
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
            await db.runAsync(
                `UPDATE training_plans SET name = ?, description = ?, updated_at = ? WHERE id = ?;`,
                [name, description, now, id]
            );

            // 2. Delete existing routines for this plan
            await db.runAsync('DELETE FROM plan_routines WHERE plan_id = ?;', [id]);

            // 3. Insert new routines
            for (const r of routines) {
                const prId = generateId();
                await db.runAsync(
                    `INSERT INTO plan_routines (id, plan_id, routine_id, day_number, notes, created_at)
                     VALUES (?, ?, ?, ?, ?, ?);`,
                    [prId, id, r.routineId, r.day, r.notes || null, now]
                );
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
            await db.runAsync('DELETE FROM training_plans WHERE id = ?;', [id]);
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
