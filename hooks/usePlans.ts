import { useCallback, useEffect, useState } from 'react';
import { storage, generateId, deletePlanCascade } from '../lib/localDatabase';
import { Plan, PlanRoutine, Routine } from '../lib/database.types';

export type PlanWithRoutines = Plan & {
    items: (PlanRoutine & { routine: Routine })[];
};

/** One day assignment coming out of the plan builder. */
export interface PlanDayInput {
    day: number;
    routineId: string;
    notes?: string | null;
}

const MISSING_ROUTINE = (id: string): Routine => ({
    id,
    name: 'Rutina eliminada',
    description: null,
    estimated_duration: 0,
    created_at: '',
    updated_at: '',
});

export function usePlans() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPlans = useCallback(async () => {
        try {
            const rows = await storage.plans.getAll();
            setPlans(rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (error) {
            console.error('[plans] load failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const getPlanDetails = useCallback(async (id: string): Promise<PlanWithRoutines | null> => {
        try {
            const plan = await storage.plans.getById(id);
            if (!plan) return null;

            const [assignments, routines] = await Promise.all([
                storage.planRoutines.getAll(),
                storage.routines.getAll(),
            ]);
            const routinesById = new Map(routines.map((r) => [r.id, r]));

            return {
                ...plan,
                items: assignments
                    .filter((pr) => pr.plan_id === id)
                    .sort((a, b) => a.day_number - b.day_number)
                    .map((pr) => ({ ...pr, routine: routinesById.get(pr.routine_id) ?? MISSING_ROUTINE(pr.routine_id) })),
            };
        } catch (error) {
            console.error('[plans] detail failed:', error);
            return null;
        }
    }, []);

    /**
     * `durationDays` is a real parameter now.
     *
     * The builder always passed it, but the hook's signature omitted it, so the
     * day count landed in the `routines` slot and iterating it threw — plan
     * creation failed outright with "No se pudo guardar el programa".
     */
    const createPlan = useCallback(
        async (name: string, description: string | null, durationDays: number, days: PlanDayInput[]) => {
            const planId = generateId();
            const now = new Date().toISOString();

            const plan: Plan = {
                id: planId,
                name: name.trim(),
                description: description?.trim() || null,
                duration_days: Math.max(1, durationDays || 7),
                created_at: now,
                updated_at: now,
            };

            await storage.plans.add(plan);
            await storage.planRoutines.addMany(toRows(planId, days, now));
            await fetchPlans();
            return plan;
        },
        [fetchPlans]
    );

    const updatePlan = useCallback(
        async (
            id: string,
            name: string,
            description: string | null,
            durationDays: number,
            days: PlanDayInput[]
        ) => {
            const now = new Date().toISOString();

            await storage.plans.update(id, {
                name: name.trim(),
                description: description?.trim() || null,
                duration_days: Math.max(1, durationDays || 7),
                updated_at: now,
            });
            await storage.planRoutines.replaceForPlan(id, toRows(id, days, now));
            await fetchPlans();
        },
        [fetchPlans]
    );

    const deletePlan = useCallback(async (id: string) => {
        await deletePlanCascade(id);
        setPlans((prev) => prev.filter((p) => p.id !== id));
    }, []);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    return { plans, loading, fetchPlans, getPlanDetails, createPlan, updatePlan, deletePlan };
}

function toRows(planId: string, days: PlanDayInput[], now: string): PlanRoutine[] {
    return (days ?? []).map((day) => ({
        id: generateId(),
        plan_id: planId,
        routine_id: day.routineId,
        day_number: day.day,
        notes: day.notes?.trim() || null,
        created_at: now,
    }));
}
