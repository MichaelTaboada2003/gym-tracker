/**
 * Demo Data Generator
 * 
 * Creates realistic workout history data for showcasing the app
 * Includes progressive overload over 6 weeks
 */

import { storage, STORAGE_KEYS } from './localDatabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const generateId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Exercise definitions with starting weights and progression
const DEMO_EXERCISES = [
    // Push exercises
    { name: 'Press Banca Plano (Barra)', muscle_group: 'Pecho', startWeight: 60, increment: 2.5, reps: [8, 8, 6] },
    { name: 'Press Inclinado con Mancuernas', muscle_group: 'Pecho', startWeight: 22, increment: 2, reps: [10, 10, 8] },
    { name: 'Press Militar (Mancuernas)', muscle_group: 'Hombros', startWeight: 16, increment: 2, reps: [10, 8, 8] },
    { name: 'Elevaciones Laterales (Mancuernas)', muscle_group: 'Hombros', startWeight: 8, increment: 1, reps: [15, 15, 12, 12] },
    { name: 'Fondos', muscle_group: 'Tríceps', startWeight: 0, increment: 5, reps: [12, 10, 10] },
    { name: 'Extensión de Tríceps en Polea', muscle_group: 'Tríceps', startWeight: 25, increment: 2.5, reps: [15, 15, 12] },

    // Pull exercises
    { name: 'Dominadas', muscle_group: 'Espalda', startWeight: 0, increment: 2.5, reps: [8, 7, 6, 5] },
    { name: 'Remo con Barra', muscle_group: 'Espalda', startWeight: 50, increment: 2.5, reps: [10, 10, 8] },
    { name: 'Remo en Polea Baja', muscle_group: 'Espalda', startWeight: 45, increment: 2.5, reps: [12, 12, 10] },
    { name: 'Face Pull', muscle_group: 'Hombros', startWeight: 20, increment: 2.5, reps: [15, 15, 15] },
    { name: 'Curl con Barra', muscle_group: 'Bíceps', startWeight: 25, increment: 2.5, reps: [10, 10, 8] },
    { name: 'Curl Inclinado con Mancuernas', muscle_group: 'Bíceps', startWeight: 10, increment: 1, reps: [12, 10] },

    // Leg exercises
    { name: 'Sentadilla Libre', muscle_group: 'Piernas', startWeight: 70, increment: 5, reps: [8, 8, 6] },
    { name: 'Peso Muerto Rumano', muscle_group: 'Piernas', startWeight: 60, increment: 5, reps: [10, 10, 8] },
    { name: 'Prensa de Piernas', muscle_group: 'Piernas', startWeight: 120, increment: 10, reps: [12, 12, 10] },
    { name: 'Curl Femoral Tumbado', muscle_group: 'Piernas', startWeight: 35, increment: 2.5, reps: [12, 12, 10] },
    { name: 'Elevación de Talones de Pie', muscle_group: 'Piernas', startWeight: 60, increment: 5, reps: [15, 15, 15, 15] },

    // Push B
    { name: 'Press Inclinado (Barra/Multipower)', muscle_group: 'Pecho', startWeight: 50, increment: 2.5, reps: [10, 10, 8] },
    { name: 'Peck Deck / Cruce de Poleas', muscle_group: 'Pecho', startWeight: 40, increment: 5, reps: [15, 15, 12] },
    { name: 'Elevaciones Laterales en Polea', muscle_group: 'Hombros', startWeight: 10, increment: 1, reps: [15, 15, 15, 15] },
    { name: 'Press Francés / Rompecráneos', muscle_group: 'Tríceps', startWeight: 20, increment: 2.5, reps: [12, 12, 10] },

    // Pull B
    { name: 'Jalón al Pecho', muscle_group: 'Espalda', startWeight: 55, increment: 2.5, reps: [12, 12, 10] },
    { name: 'Remo en Máquina (Unilateral)', muscle_group: 'Espalda', startWeight: 35, increment: 2.5, reps: [12, 12, 10] },
    { name: 'Pullover en Polea Alta', muscle_group: 'Espalda', startWeight: 30, increment: 2.5, reps: [15, 15, 12] },
    { name: 'Curl Predicador', muscle_group: 'Bíceps', startWeight: 20, increment: 2.5, reps: [12, 12, 10] },
    { name: 'Curl Martillo', muscle_group: 'Bíceps', startWeight: 12, increment: 1, reps: [12, 12, 10] },

    // Legs B
    { name: 'Hack Squat', muscle_group: 'Piernas', startWeight: 80, increment: 5, reps: [12, 10, 10] },
    { name: 'Extensión de Cuádriceps', muscle_group: 'Piernas', startWeight: 45, increment: 2.5, reps: [15, 15, 12] },
    { name: 'Curl Femoral Sentado', muscle_group: 'Piernas', startWeight: 40, increment: 2.5, reps: [15, 15, 12] },
];

// Workout schedule - 6 days PPL split repeated over weeks
const WORKOUT_TYPES = [
    { name: 'PUSH A (Fuerza)', exercises: [0, 1, 2, 3, 4, 5] },
    { name: 'PULL A (Densidad)', exercises: [6, 7, 8, 9, 10, 11] },
    { name: 'LEGS A (Posterior)', exercises: [12, 13, 14, 15, 16] },
    { name: 'PUSH B (Hipertrofia)', exercises: [17, 18, 19, 20] },
    { name: 'PULL B (Anchura)', exercises: [21, 22, 23, 24, 25] },
    { name: 'LEGS B (Cuádriceps)', exercises: [26, 27, 28] },
];

export const generateDemoData = async (): Promise<void> => {
    try {
        console.log('🏋️ Generating demo workout data...');

        // Get existing exercises from storage
        const existingExercises = await storage.exercises.getAll() as any[];

        // Create exercise ID map
        const exerciseMap = new Map<string, string>();
        for (const ex of DEMO_EXERCISES) {
            const found = existingExercises.find((e: any) => e.name === ex.name);
            if (found) {
                exerciseMap.set(ex.name, found.id);
            }
        }

        // Generate sessions for the last 6 weeks
        const sessions: any[] = [];
        const logs: any[] = [];

        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 42); // 6 weeks ago

        let currentDate = new Date(startDate);
        let weekNumber = 0;
        let workoutIndex = 0;

        // Body weight entries
        const bodyWeights: any[] = [];
        let currentBodyWeight = 72.5;

        while (currentDate <= today) {
            const dayOfWeek = currentDate.getDay();

            // Skip rest days (Sunday = 0)
            if (dayOfWeek !== 0) {
                // Determine week progression
                const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                weekNumber = Math.floor(daysSinceStart / 7);

                // Get workout type for today
                const workoutType = WORKOUT_TYPES[workoutIndex % WORKOUT_TYPES.length];

                // Create session
                const sessionId = generateId();
                const duration = 45 + Math.floor(Math.random() * 30); // 45-75 min

                sessions.push({
                    id: sessionId,
                    routine_id: null,
                    session_date: currentDate.toISOString().split('T')[0],
                    duration_minutes: duration,
                    notes: `${workoutType.name} - Semana ${weekNumber + 1}`,
                    created_at: currentDate.toISOString(),
                });

                // Generate logs for each exercise
                for (const exIndex of workoutType.exercises) {
                    const exerciseDef = DEMO_EXERCISES[exIndex];
                    const exerciseId = exerciseMap.get(exerciseDef.name);

                    if (!exerciseId) continue;

                    // Calculate weight with progression
                    // Small random variation + weekly progression
                    const weeklyProgression = weekNumber * exerciseDef.increment;
                    const baseWeight = exerciseDef.startWeight + weeklyProgression;

                    // Add warmup set
                    logs.push({
                        id: generateId(),
                        session_id: sessionId,
                        exercise_id: exerciseId,
                        set_number: 0,
                        reps: 12,
                        weight_kg: Math.max(10, baseWeight * 0.5),
                        is_warmup: true,
                        created_at: currentDate.toISOString(),
                    });

                    // Working sets
                    exerciseDef.reps.forEach((targetReps, setIndex) => {
                        // Add small variation to reps and weight
                        const repVariation = Math.random() > 0.7 ? -1 : 0;
                        const weightVariation = Math.random() > 0.8 ? exerciseDef.increment : 0;

                        logs.push({
                            id: generateId(),
                            session_id: sessionId,
                            exercise_id: exerciseId,
                            set_number: setIndex + 1,
                            reps: Math.max(4, targetReps + repVariation),
                            weight_kg: baseWeight + weightVariation,
                            is_warmup: false,
                            created_at: currentDate.toISOString(),
                        });
                    });
                }

                workoutIndex++;
            }

            // Add body weight entry every 2-3 days
            if (dayOfWeek === 1 || dayOfWeek === 4) {
                const weightChange = (Math.random() - 0.4) * 0.3; // Slight upward trend
                currentBodyWeight = Math.max(70, Math.min(80, currentBodyWeight + weightChange));

                bodyWeights.push({
                    id: generateId(),
                    weight_kg: Math.round(currentBodyWeight * 10) / 10,
                    date: currentDate.toISOString().split('T')[0],
                    notes: null,
                    created_at: currentDate.toISOString(),
                });
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Save to storage
        const existingSessions = await storage.workoutSessions.getAll() as any[];
        const existingLogs = await storage.workoutLogs.getAll() as any[];

        await AsyncStorage.setItem(
            STORAGE_KEYS.WORKOUT_SESSIONS,
            JSON.stringify([...existingSessions, ...sessions])
        );

        await AsyncStorage.setItem(
            STORAGE_KEYS.WORKOUT_LOGS,
            JSON.stringify([...existingLogs, ...logs])
        );

        // Save body weights
        const existingBodyWeights = await AsyncStorage.getItem(STORAGE_KEYS.BODY_WEIGHT) || '[]';
        const parsedBodyWeights = JSON.parse(existingBodyWeights);
        await AsyncStorage.setItem(
            STORAGE_KEYS.BODY_WEIGHT,
            JSON.stringify([...parsedBodyWeights, ...bodyWeights])
        );

        console.log(`✅ Generated ${sessions.length} workout sessions`);
        console.log(`✅ Generated ${logs.length} exercise logs`);
        console.log(`✅ Generated ${bodyWeights.length} body weight entries`);
        console.log('🎉 Demo data generation complete!');

    } catch (error) {
        console.error('Error generating demo data:', error);
        throw error;
    }
};

// Clear all workout data (useful for resetting)
export const clearWorkoutData = async (): Promise<void> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, '[]');
        await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, '[]');
        await AsyncStorage.setItem(STORAGE_KEYS.BODY_WEIGHT, '[]');
        console.log('🗑️ Workout data cleared');
    } catch (error) {
        console.error('Error clearing data:', error);
    }
};
