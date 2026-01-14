import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
    EXERCISES: '@gym_tracker_exercises',
    ROUTINES: '@gym_tracker_routines',
    ROUTINE_EXERCISES: '@gym_tracker_routine_exercises',
    PLANS: '@gym_tracker_plans',
    PLAN_ROUTINES: '@gym_tracker_plan_routines',
    WORKOUT_SESSIONS: '@gym_tracker_workout_sessions',
    WORKOUT_LOGS: '@gym_tracker_workout_logs',
    BODY_WEIGHT: '@gym_tracker_body_weight',
};

// Clear all data (useful for debugging/reset)
export const clearAllData = async (): Promise<void> => {
    try {
        const keys = Object.values(STORAGE_KEYS);
        await AsyncStorage.multiRemove(keys);
        console.log('✅ All data cleared');
    } catch (error) {
        console.error('Error clearing data:', error);
    }
};

// Rest time mapping based on exercise patterns
const REST_TIME_MAP: Record<string, number> = {
    // Compound heavy exercises - 2.5 min (150s)
    'Press Banca Plano': 150,
    'Dominadas': 150,
    'Sentadilla Libre': 150,

    // Compound secondary - 2 min (120s)
    'Remo con Barra': 120,
    'Peso Muerto Rumano': 120,
    'Press Inclinado (Barra': 120,
    'Hack Squat': 120,

    // Accessories - 90s-2min (105s)
    'Press Inclinado con Mancuernas': 105,
    'Press Militar': 105,
    'Prensa de Piernas': 105,
    'Jalón al Pecho': 105,
    'Zancadas': 105,

    // Isolation medium - 90s
    'Fondos': 90,
    'Curl con Barra': 90,
    'Remo en Polea': 90,
    'Remo en Máquina': 90,
    'Press Francés': 90,
    'Curl Predicador': 90,
    'Extensión de Cuádriceps': 90,

    // Isolation light - 60-90s (75s)
    'Elevaciones Laterales': 75,
    'Curl Inclinado': 75,
    'Curl Femoral': 75,
    'Pullover': 75,
    'Peck Deck': 75,
    'Curl Martillo': 75,

    // Finishers - 60s
    'Extensión de Tríceps': 60,
    'Face Pull': 60,
    'Elevación de Talones': 60,
    'Gemelos': 60,
    'Pájaros': 60,
    'Extensión Tríceps Unilateral': 60,
};

// Migrate rest times for existing routine exercises
export const migrateRestTimes = async (): Promise<void> => {
    try {
        const routineExercises = await getAll<any>(STORAGE_KEYS.ROUTINE_EXERCISES);
        const exercises = await getAll<any>(STORAGE_KEYS.EXERCISES);

        let updated = 0;

        const updatedRoutineExercises = routineExercises.map((re: any) => {
            const exercise = exercises.find((e: any) => e.id === re.exercise_id);
            if (!exercise) return re;

            // Find matching rest time
            let restTime = 90; // default
            for (const [pattern, time] of Object.entries(REST_TIME_MAP)) {
                if (exercise.name.includes(pattern)) {
                    restTime = time;
                    break;
                }
            }

            // Update notes with rest time
            let notes: any = {};
            if (re.notes) {
                try {
                    notes = JSON.parse(re.notes);
                } catch {
                    notes = { originalNotes: re.notes };
                }
            }

            if (notes.restTime !== restTime) {
                notes.restTime = restTime;
                updated++;
            }

            return {
                ...re,
                notes: JSON.stringify(notes),
            };
        });

        if (updated > 0) {
            await saveAll(STORAGE_KEYS.ROUTINE_EXERCISES, updatedRoutineExercises);
            console.log(`✅ Migrated rest times for ${updated} exercises`);
        } else {
            console.log('✅ Rest times already up to date');
        }
    } catch (error) {
        console.error('Error migrating rest times:', error);
    }
};

// Time per rep mapping based on exercise patterns
const TIME_PER_REP_MAP: Record<string, number> = {
    // Heavy/Slow (4-5s per rep)
    'Sentadilla': 4,
    'Peso Muerto': 5,
    'Dominadas': 4,
    'Fondos': 4,
    'Hack Squat': 4,
    'Zancadas': 4,
    'Curl Inclinado': 4,

    // Standard (3s per rep)
    'Press Banca': 3,
    'Press Inclinado': 3,
    'Press Militar': 3,
    'Remo': 3,
    'Curl con Barra': 3,
    'Curl Predicador': 3,
    'Curl Martillo': 3,
    'Prensa': 3,
    'Extensión de Cuádriceps': 3,
    'Curl Femoral': 3,
    'Jalón': 3,
    'Pullover': 3,
    'Peck Deck': 3,
    'Press Francés': 3,

    // Fast (2s per rep)
    'Elevaciones Laterales': 2,
    'Face Pull': 2,
    'Extensión de Tríceps': 2,
    'Extensión Tríceps': 2,
    'Elevación de Talones': 2,
    'Gemelos': 2,
    'Pájaros': 2,
};

// Migrate time per rep for existing exercises
export const migrateTimePerRep = async (): Promise<void> => {
    try {
        // Update base exercises
        const exercises = await getAll<any>(STORAGE_KEYS.EXERCISES);
        let updatedExercises = 0;

        const newExercises = exercises.map((ex: any) => {
            let timePerRep = 3; // default
            for (const [pattern, time] of Object.entries(TIME_PER_REP_MAP)) {
                if (ex.name.includes(pattern)) {
                    timePerRep = time;
                    break;
                }
            }

            if (ex.time_per_rep_seconds !== timePerRep) {
                updatedExercises++;
                return { ...ex, time_per_rep_seconds: timePerRep };
            }
            return ex;
        });

        if (updatedExercises > 0) {
            await saveAll(STORAGE_KEYS.EXERCISES, newExercises);
            console.log(`✅ Updated time_per_rep for ${updatedExercises} exercises`);
        }

        // Update routine_exercises notes with timePerRep
        const routineExercises = await getAll<any>(STORAGE_KEYS.ROUTINE_EXERCISES);
        let updatedRoutineEx = 0;

        const newRoutineExercises = routineExercises.map((re: any) => {
            const exercise = newExercises.find((e: any) => e.id === re.exercise_id);
            if (!exercise) return re;

            let notes: any = {};
            if (re.notes) {
                try {
                    notes = JSON.parse(re.notes);
                } catch {
                    notes = {};
                }
            }

            const expectedTimePerRep = exercise.time_per_rep_seconds || 3;
            if (notes.timePerRep !== expectedTimePerRep) {
                notes.timePerRep = expectedTimePerRep;
                updatedRoutineEx++;
                return { ...re, notes: JSON.stringify(notes) };
            }
            return re;
        });

        if (updatedRoutineEx > 0) {
            await saveAll(STORAGE_KEYS.ROUTINE_EXERCISES, newRoutineExercises);
            console.log(`✅ Migrated timePerRep for ${updatedRoutineEx} routine exercises`);
        }
    } catch (error) {
        console.error('Error migrating time per rep:', error);
    }
};

// Generic storage functions
async function getAll<T>(key: string): Promise<T[]> {
    try {
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error(`Error getting ${key}:`, error);
        return [];
    }
}

async function saveAll<T>(key: string, data: T[]): Promise<void> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving ${key}:`, error);
        throw error;
    }
}

async function addItem<T extends { id: string }>(key: string, item: T): Promise<void> {
    const items = await getAll<T>(key);
    items.push(item);
    await saveAll(key, items);
}

async function updateItem<T extends { id: string }>(key: string, id: string, updates: Partial<T>): Promise<void> {
    const items = await getAll<T>(key);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
        items[index] = { ...items[index], ...updates };
        await saveAll(key, items);
    }
}

async function deleteItem<T extends { id: string }>(key: string, id: string): Promise<void> {
    const items = await getAll<T>(key);
    const filtered = items.filter(item => item.id !== id);
    await saveAll(key, filtered);
}

async function getById<T extends { id: string }>(key: string, id: string): Promise<T | null> {
    const items = await getAll<T>(key);
    return items.find(item => item.id === id) || null;
}

// Helper to generate UUIDs
export const generateId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

import { SEED_EXERCISES, SEED_ROUTINES, SEED_ROUTINE_EXERCISES } from './seedData';

// Initialize database (check if seeded)
export const initializeDatabase = async (): Promise<void> => {
    try {
        const exercises = await getAll(STORAGE_KEYS.EXERCISES);
        const routines = await getAll(STORAGE_KEYS.ROUTINES);

        if (exercises.length === 0 || routines.length === 0) {
            console.log('🌱 Seeding database with default data...');

            // Seed Exercises if empty
            if (exercises.length === 0) {
                await saveAll(STORAGE_KEYS.EXERCISES, SEED_EXERCISES);
                console.log('✅ Exercises seeded');
            }

            // Seed Routines if empty
            if (routines.length === 0) {
                await saveAll(STORAGE_KEYS.ROUTINES, SEED_ROUTINES);
                await saveAll(STORAGE_KEYS.ROUTINE_EXERCISES, SEED_ROUTINE_EXERCISES);
                console.log('✅ Routines seeded');
            }
        } else {
            console.log('✅ Database already initialized');
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

// Manually seed/reset database
export const seedDatabase = async (): Promise<void> => {
    try {
        await saveAll(STORAGE_KEYS.EXERCISES, SEED_EXERCISES);
        await saveAll(STORAGE_KEYS.ROUTINES, SEED_ROUTINES);
        await saveAll(STORAGE_KEYS.ROUTINE_EXERCISES, SEED_ROUTINE_EXERCISES);
        console.log('✅ Database manually seeded');
    } catch (error) {
        console.error('Error manual seeding:', error);
    }
};

// Export storage interface
export const storage = {
    exercises: {
        getAll: () => getAll(STORAGE_KEYS.EXERCISES),
        add: (item: any) => addItem(STORAGE_KEYS.EXERCISES, item),
        update: (id: string, updates: any) => updateItem(STORAGE_KEYS.EXERCISES, id, updates),
        delete: (id: string) => deleteItem(STORAGE_KEYS.EXERCISES, id),
        getById: (id: string) => getById(STORAGE_KEYS.EXERCISES, id),
    },
    routines: {
        getAll: () => getAll(STORAGE_KEYS.ROUTINES),
        add: (item: any) => addItem(STORAGE_KEYS.ROUTINES, item),
        update: (id: string, updates: any) => updateItem(STORAGE_KEYS.ROUTINES, id, updates),
        delete: (id: string) => deleteItem(STORAGE_KEYS.ROUTINES, id),
        getById: (id: string) => getById(STORAGE_KEYS.ROUTINES, id),
    },
    routineExercises: {
        getAll: () => getAll(STORAGE_KEYS.ROUTINE_EXERCISES),
        add: (item: any) => addItem(STORAGE_KEYS.ROUTINE_EXERCISES, item),
        deleteByRoutineId: async (routineId: string) => {
            const items = await getAll<any>(STORAGE_KEYS.ROUTINE_EXERCISES);
            const filtered = items.filter((item: any) => item.routine_id !== routineId);
            await saveAll(STORAGE_KEYS.ROUTINE_EXERCISES, filtered);
        },
        getByRoutineId: async (routineId: string) => {
            const items = await getAll<any>(STORAGE_KEYS.ROUTINE_EXERCISES);
            return items.filter((item: any) => item.routine_id === routineId);
        },
    },
    plans: {
        getAll: () => getAll(STORAGE_KEYS.PLANS),
        add: (item: any) => addItem(STORAGE_KEYS.PLANS, item),
        update: (id: string, updates: any) => updateItem(STORAGE_KEYS.PLANS, id, updates),
        delete: (id: string) => deleteItem(STORAGE_KEYS.PLANS, id),
        getById: (id: string) => getById(STORAGE_KEYS.PLANS, id),
    },
    planRoutines: {
        getAll: () => getAll(STORAGE_KEYS.PLAN_ROUTINES),
        add: (item: any) => addItem(STORAGE_KEYS.PLAN_ROUTINES, item),
        deleteByPlanId: async (planId: string) => {
            const items = await getAll<any>(STORAGE_KEYS.PLAN_ROUTINES);
            const filtered = items.filter((item: any) => item.plan_id !== planId);
            await saveAll(STORAGE_KEYS.PLAN_ROUTINES, filtered);
        },
        getByPlanId: async (planId: string) => {
            const items = await getAll<any>(STORAGE_KEYS.PLAN_ROUTINES);
            return items.filter((item: any) => item.plan_id === planId);
        },
    },
    workoutSessions: {
        getAll: () => getAll(STORAGE_KEYS.WORKOUT_SESSIONS),
        add: (item: any) => addItem(STORAGE_KEYS.WORKOUT_SESSIONS, item),
        update: (id: string, updates: any) => updateItem(STORAGE_KEYS.WORKOUT_SESSIONS, id, updates),
        getById: (id: string) => getById(STORAGE_KEYS.WORKOUT_SESSIONS, id),
    },
    workoutLogs: {
        getAll: () => getAll(STORAGE_KEYS.WORKOUT_LOGS),
        add: (item: any) => addItem(STORAGE_KEYS.WORKOUT_LOGS, item),
        getBySessionId: async (sessionId: string) => {
            const items = await getAll<any>(STORAGE_KEYS.WORKOUT_LOGS);
            return items.filter((item: any) => item.session_id === sessionId);
        },
    },
};
