import { Exercise, Plan, PlanRoutine, Routine, WeightLog, WorkoutLog, WorkoutSession } from './database.types';
import { generateId, seedDatabase, storage, STORAGE_KEYS } from './localDatabase';
import { SEED_EXERCISES, SEED_ROUTINES } from './seedData';

interface ExerciseProgression {
    name: string;
    muscle_group: string;
    baseWeight: number;
    weeklyGain: number;
    reps: number[];
    isBodyweight?: boolean;
}

const EXERCISE_CONFIGS: Record<string, ExerciseProgression> = {
    'Press Banca Plano (Barra)': { name: 'Press Banca Plano (Barra)', muscle_group: 'Pecho', baseWeight: 60, weeklyGain: 2.5, reps: [10, 8, 8, 6] },
    'Press Inclinado con Mancuernas': { name: 'Press Inclinado con Mancuernas', muscle_group: 'Pecho', baseWeight: 22, weeklyGain: 1.0, reps: [10, 10, 8] },
    'Press Militar (Mancuernas)': { name: 'Press Militar (Mancuernas)', muscle_group: 'Hombros', baseWeight: 18, weeklyGain: 1.0, reps: [10, 8, 8] },
    'Elevaciones Laterales (Mancuernas)': { name: 'Elevaciones Laterales (Mancuernas)', muscle_group: 'Hombros', baseWeight: 8, weeklyGain: 0.5, reps: [15, 15, 12, 12] },
    'Fondos': { name: 'Fondos', muscle_group: 'Tríceps', baseWeight: 0, weeklyGain: 1.25, reps: [10, 10, 8], isBodyweight: true },
    'Extensión de Tríceps en Polea': { name: 'Extensión de Tríceps en Polea', muscle_group: 'Tríceps', baseWeight: 25, weeklyGain: 1.5, reps: [15, 12, 12] },

    'Dominadas': { name: 'Dominadas', muscle_group: 'Espalda', baseWeight: 0, weeklyGain: 1.0, reps: [10, 8, 8, 6], isBodyweight: true },
    'Remo con Barra': { name: 'Remo con Barra', muscle_group: 'Espalda', baseWeight: 50, weeklyGain: 2.5, reps: [10, 10, 8] },
    'Remo en Polea Baja': { name: 'Remo en Polea Baja', muscle_group: 'Espalda', baseWeight: 45, weeklyGain: 2.0, reps: [12, 10, 10] },
    'Face Pull': { name: 'Face Pull', muscle_group: 'Hombros', baseWeight: 20, weeklyGain: 1.0, reps: [15, 15, 15] },
    'Curl con Barra': { name: 'Curl con Barra', muscle_group: 'Bíceps', baseWeight: 25, weeklyGain: 1.25, reps: [10, 10, 8] },
    'Curl Inclinado con Mancuernas': { name: 'Curl Inclinado con Mancuernas', muscle_group: 'Bíceps', baseWeight: 12, weeklyGain: 0.5, reps: [12, 10, 10] },

    'Sentadilla Libre': { name: 'Sentadilla Libre', muscle_group: 'Piernas', baseWeight: 80, weeklyGain: 3.5, reps: [8, 8, 6, 6] },
    'Peso Muerto Rumano': { name: 'Peso Muerto Rumano', muscle_group: 'Piernas', baseWeight: 70, weeklyGain: 3.0, reps: [10, 8, 8] },
    'Prensa de Piernas': { name: 'Prensa de Piernas', muscle_group: 'Piernas', baseWeight: 140, weeklyGain: 5.0, reps: [12, 10, 10] },
    'Curl Femoral Tumbado': { name: 'Curl Femoral Tumbado', muscle_group: 'Piernas', baseWeight: 35, weeklyGain: 1.5, reps: [12, 12, 10] },
    'Elevación de Talones de Pie': { name: 'Elevación de Talones de Pie', muscle_group: 'Piernas', baseWeight: 50, weeklyGain: 2.0, reps: [15, 15, 15, 12] },

    'Press Inclinado (Barra/Multipower)': { name: 'Press Inclinado (Barra/Multipower)', muscle_group: 'Pecho', baseWeight: 55, weeklyGain: 2.5, reps: [10, 8, 8] },
    'Peck Deck / Cruce de Poleas': { name: 'Peck Deck / Cruce de Poleas', muscle_group: 'Pecho', baseWeight: 40, weeklyGain: 2.0, reps: [15, 12, 12] },
    'Elevaciones Laterales en Polea': { name: 'Elevaciones Laterales en Polea', muscle_group: 'Hombros', baseWeight: 7.5, weeklyGain: 0.5, reps: [15, 15, 12] },
    'Press Francés / Rompecráneos': { name: 'Press Francés / Rompecráneos', muscle_group: 'Tríceps', baseWeight: 22.5, weeklyGain: 1.25, reps: [12, 10, 10] },
    'Extensión Tríceps Unilateral': { name: 'Extensión Tríceps Unilateral', muscle_group: 'Tríceps', baseWeight: 10, weeklyGain: 0.75, reps: [15, 12, 12] },

    'Jalón al Pecho': { name: 'Jalón al Pecho', muscle_group: 'Espalda', baseWeight: 50, weeklyGain: 2.0, reps: [12, 10, 10] },
    'Remo en Máquina (Unilateral)': { name: 'Remo en Máquina (Unilateral)', muscle_group: 'Espalda', baseWeight: 35, weeklyGain: 1.5, reps: [12, 10, 10] },
    'Pullover en Polea Alta': { name: 'Pullover en Polea Alta', muscle_group: 'Espalda', baseWeight: 25, weeklyGain: 1.25, reps: [15, 12, 12] },
    'Pájaros (Posterior)': { name: 'Pájaros (Posterior)', muscle_group: 'Hombros', baseWeight: 10, weeklyGain: 0.5, reps: [15, 15, 15] },
    'Curl Predicador': { name: 'Curl Predicador', muscle_group: 'Bíceps', baseWeight: 22.5, weeklyGain: 1.25, reps: [12, 10, 10] },
    'Curl Martillo': { name: 'Curl Martillo', muscle_group: 'Bíceps', baseWeight: 12, weeklyGain: 0.5, reps: [12, 12, 10] },

    'Hack Squat': { name: 'Hack Squat', muscle_group: 'Piernas', baseWeight: 80, weeklyGain: 4.0, reps: [10, 10, 8] },
    'Zancadas (Walking Lunges)': { name: 'Zancadas (Walking Lunges)', muscle_group: 'Piernas', baseWeight: 16, weeklyGain: 1.0, reps: [12, 12, 10] },
    'Extensión de Cuádriceps': { name: 'Extensión de Cuádriceps', muscle_group: 'Piernas', baseWeight: 45, weeklyGain: 2.5, reps: [15, 15, 12] },
    'Curl Femoral Sentado': { name: 'Curl Femoral Sentado', muscle_group: 'Piernas', baseWeight: 40, weeklyGain: 2.0, reps: [15, 12, 12] },
    'Gemelos Sentado': { name: 'Gemelos Sentado', muscle_group: 'Piernas', baseWeight: 35, weeklyGain: 1.5, reps: [15, 15, 15] },
};

export interface DemoDataResult {
    sessionsCount: number;
    logsCount: number;
    weightsCount: number;
    plansCount: number;
}

/**
 * Generates rich, realistic workout history, body weights, routines, and training plans
 * spanning the past 9 weeks (63 days) with progressive overload.
 */
export async function generateDemoData(): Promise<DemoDataResult> {
    // 1. Ensure basic catalogue exists
    let existingExercises = await storage.exercises.getAll();
    let existingRoutines = await storage.routines.getAll();

    if (existingExercises.length === 0 || existingRoutines.length === 0) {
        await seedDatabase();
        existingExercises = await storage.exercises.getAll();
        existingRoutines = await storage.routines.getAll();
    }

    const exerciseMap = new Map<string, Exercise>();
    existingExercises.forEach((e) => exerciseMap.set(e.name, e));

    const routineMap = new Map<string, Routine>();
    existingRoutines.forEach((r) => routineMap.set(r.name, r));

    // 2. Generate or update Training Plans
    const now = new Date();
    const planPplId = generateId();
    const planTorsoPiernaId = generateId();

    const pushA = existingRoutines.find((r) => r.name.includes('PUSH A')) || existingRoutines[0];
    const pullA = existingRoutines.find((r) => r.name.includes('PULL A')) || existingRoutines[1];
    const legsA = existingRoutines.find((r) => r.name.includes('LEGS A')) || existingRoutines[2];
    const pushB = existingRoutines.find((r) => r.name.includes('PUSH B')) || existingRoutines[3 % existingRoutines.length];
    const pullB = existingRoutines.find((r) => r.name.includes('PULL B')) || existingRoutines[4 % existingRoutines.length];
    const legsB = existingRoutines.find((r) => r.name.includes('LEGS B')) || existingRoutines[5 % existingRoutines.length];

    const demoPlans: Plan[] = [
        {
            id: planPplId,
            name: 'PPL Hipertrofia (6 días)',
            description: 'Estructura Push-Pull-Legs 2x por semana con enfoque en progresión de cargas y volumen óptimo.',
            duration_days: 7,
            created_at: new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: now.toISOString(),
        },
        {
            id: planTorsoPiernaId,
            name: 'Torso / Pierna Fuerza (4 días)',
            description: 'División de 4 días enfocada en ejercicios multiarticulares pesados y descanso estratégico.',
            duration_days: 7,
            created_at: new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: now.toISOString(),
        },
    ];

    const demoPlanRoutines: PlanRoutine[] = [
        // PPL Plan days
        { id: generateId(), plan_id: planPplId, routine_id: pushA.id, day_number: 1, notes: 'Empuje con énfasis en fuerza plana', created_at: now.toISOString() },
        { id: generateId(), plan_id: planPplId, routine_id: pullA.id, day_number: 2, notes: 'Tirón con énfasis en grosor de espalda', created_at: now.toISOString() },
        { id: generateId(), plan_id: planPplId, routine_id: legsA.id, day_number: 3, notes: 'Pierna con énfasis en femoral y sentadilla', created_at: now.toISOString() },
        { id: generateId(), plan_id: planPplId, routine_id: pushB.id, day_number: 4, notes: 'Empuje con énfasis en hombro y bombeo', created_at: now.toISOString() },
        { id: generateId(), plan_id: planPplId, routine_id: pullB.id, day_number: 5, notes: 'Tirón con énfasis en amplitud y dorsales', created_at: now.toISOString() },
        { id: generateId(), plan_id: planPplId, routine_id: legsB.id, day_number: 6, notes: 'Pierna con énfasis en cuádriceps y hack squat', created_at: now.toISOString() },

        // Torso / Pierna
        { id: generateId(), plan_id: planTorsoPiernaId, routine_id: pushA.id, day_number: 1, notes: 'Torso Fuerza A', created_at: now.toISOString() },
        { id: generateId(), plan_id: planTorsoPiernaId, routine_id: legsA.id, day_number: 2, notes: 'Pierna Fuerza A', created_at: now.toISOString() },
        { id: generateId(), plan_id: planTorsoPiernaId, routine_id: pushB.id, day_number: 4, notes: 'Torso Hipertrofia B', created_at: now.toISOString() },
        { id: generateId(), plan_id: planTorsoPiernaId, routine_id: legsB.id, day_number: 5, notes: 'Pierna Hipertrofia B', created_at: now.toISOString() },
    ];

    await storage.plans.delete(planPplId);
    await storage.plans.delete(planTorsoPiernaId);
    for (const p of demoPlans) {
        await storage.plans.add(p);
    }
    await storage.planRoutines.addMany(demoPlanRoutines);

    // 3. Define the workout cycle templates
    const cycle = [
        { routine: pushA, exercises: ['Press Banca Plano (Barra)', 'Press Inclinado con Mancuernas', 'Press Militar (Mancuernas)', 'Elevaciones Laterales (Mancuernas)', 'Fondos', 'Extensión de Tríceps en Polea'] },
        { routine: pullA, exercises: ['Dominadas', 'Remo con Barra', 'Remo en Polea Baja', 'Face Pull', 'Curl con Barra', 'Curl Inclinado con Mancuernas'] },
        { routine: legsA, exercises: ['Sentadilla Libre', 'Peso Muerto Rumano', 'Prensa de Piernas', 'Curl Femoral Tumbado', 'Elevación de Talones de Pie'] },
        { routine: null, exercises: [] }, // Rest Day
        { routine: pushB, exercises: ['Press Inclinado (Barra/Multipower)', 'Peck Deck / Cruce de Poleas', 'Elevaciones Laterales en Polea', 'Press Francés / Rompecráneos', 'Extensión Tríceps Unilateral'] },
        { routine: pullB, exercises: ['Jalón al Pecho', 'Remo en Máquina (Unilateral)', 'Pullover en Polea Alta', 'Pájaros (Posterior)', 'Curl Predicador', 'Curl Martillo'] },
        { routine: legsB, exercises: ['Hack Squat', 'Zancadas (Walking Lunges)', 'Extensión de Cuádriceps', 'Curl Femoral Sentado', 'Gemelos Sentado'] },
        { routine: null, exercises: [] }, // Rest Day
    ];

    // 4. Generate 60 days of workout sessions and logs
    const TOTAL_DAYS = 60;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - TOTAL_DAYS);

    const generatedSessions: WorkoutSession[] = [];
    const generatedLogs: WorkoutLog[] = [];
    const generatedWeights: WeightLog[] = [];

    let currentDay = new Date(startDate);
    let cycleIndex = 0;
    let baseBodyWeight = 74.2;

    while (currentDay <= now) {
        const dateStr = currentDay.toISOString().split('T')[0];
        const daysFromStart = Math.floor((currentDay.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(daysFromStart / 7);

        // Body Weight: Logged roughly every 2 days or 4 times a week
        const dayOfWeek = currentDay.getDay(); // 0 is Sunday
        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5 || dayOfWeek === 6) {
            // Progressive gain trend + small random daily noise
            const trendGain = (daysFromStart / TOTAL_DAYS) * 2.2; // +2.2 kg over 2 months
            const dailyNoise = (Math.sin(daysFromStart * 1.5) * 0.35) + ((Math.random() - 0.5) * 0.2);
            const recordedWeight = Math.round((baseBodyWeight + trendGain + dailyNoise) * 10) / 10;

            generatedWeights.push({
                id: generateId(),
                date: dateStr,
                weight_kg: recordedWeight,
            });
        }

        // Workout session logic
        const dayPlan = cycle[cycleIndex % cycle.length];
        cycleIndex++;

        if (dayPlan.routine && dayPlan.exercises.length > 0) {
            const sessionId = generateId();
            const durationMinutes = 55 + Math.floor(Math.random() * 25); // 55 to 80 mins
            const sessionStartTime = new Date(currentDay);
            sessionStartTime.setHours(17, 30, 0, 0); // 5:30 PM
            const sessionEndTime = new Date(sessionStartTime.getTime() + durationMinutes * 60 * 1000);

            generatedSessions.push({
                id: sessionId,
                routine_id: dayPlan.routine.id,
                session_date: dateStr,
                duration_minutes: durationMinutes,
                notes: `Sesión de ${dayPlan.routine.name.split(':')[1]?.trim() || dayPlan.routine.name}. Gran congestión y buenas sensaciones.`,
                started_at: sessionStartTime.toISOString(),
                completed_at: sessionEndTime.toISOString(),
            });

            // Exercise logs
            let exerciseOrder = 0;
            for (const exName of dayPlan.exercises) {
                const exerciseObj = exerciseMap.get(exName);
                const config = EXERCISE_CONFIGS[exName];
                if (!exerciseObj || !config) continue;

                exerciseOrder++;
                const exStartTime = new Date(sessionStartTime.getTime() + (exerciseOrder * 10 * 60 * 1000));

                // Progressive weight for this week
                const progressiveWeight = config.baseWeight + (weekIndex * config.weeklyGain);

                // 1. Warmup Set (for compound movements)
                if (config.baseWeight >= 20 && !config.isBodyweight) {
                    const warmupWeight = Math.round((progressiveWeight * 0.5) / 2.5) * 2.5;
                    generatedLogs.push({
                        id: generateId(),
                        session_id: sessionId,
                        exercise_id: exerciseObj.id,
                        set_number: 0,
                        weight_kg: warmupWeight,
                        reps: 12,
                        rpe: 6,
                        is_warmup: true,
                        logged_at: exStartTime.toISOString(),
                    });
                }

                // 2. Working Sets
                config.reps.forEach((targetReps, setIdx) => {
                    const setTime = new Date(exStartTime.getTime() + (setIdx * 2.5 * 60 * 1000));

                    // Slight pyramid variation
                    let setWeight = progressiveWeight;
                    if (setIdx === 0 && config.reps.length > 2) {
                        setWeight = Math.round((progressiveWeight * 0.95) / 1.25) * 1.25;
                    } else if (setIdx === config.reps.length - 1 && config.reps.length > 2) {
                        setWeight = Math.round((progressiveWeight * 1.05) / 1.25) * 1.25;
                    }

                    // Occasional rep fluctuation
                    const repVariance = setIdx === config.reps.length - 1 && Math.random() > 0.6 ? -1 : 0;
                    const finalReps = Math.max(4, targetReps + repVariance);
                    const rpeValue = 7.5 + (setIdx * 0.5) + (Math.random() > 0.7 ? 0.5 : 0);

                    generatedLogs.push({
                        id: generateId(),
                        session_id: sessionId,
                        exercise_id: exerciseObj.id,
                        set_number: setIdx + 1,
                        weight_kg: Math.round(setWeight * 10) / 10,
                        reps: finalReps,
                        rpe: Math.min(10, Math.round(rpeValue * 10) / 10),
                        is_warmup: false,
                        logged_at: setTime.toISOString(),
                    });
                });
            }
        }

        // Advance to next day
        currentDay.setDate(currentDay.getDate() + 1);
    }

    // 5. Persist to storage
    await storage.workoutSessions.addMany(generatedSessions);
    await storage.workoutLogs.addMany(generatedLogs);

    // Save body weights (upserting unique dates)
    const existingWeights = await storage.bodyWeight.getAll();
    const weightMap = new Map<string, WeightLog>();
    existingWeights.forEach((w) => weightMap.set(w.date, w));
    generatedWeights.forEach((w) => weightMap.set(w.date, w));
    await storage.bodyWeight.saveAll(Array.from(weightMap.values()));

    return {
        sessionsCount: generatedSessions.length,
        logsCount: generatedLogs.length,
        weightsCount: generatedWeights.length,
        plansCount: demoPlans.length,
    };
}
