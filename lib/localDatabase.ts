import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
    EXERCISES: '@gym_tracker_exercises',
    ROUTINES: '@gym_tracker_routines',
    ROUTINE_EXERCISES: '@gym_tracker_routine_exercises',
    PLANS: '@gym_tracker_plans',
    PLAN_ROUTINES: '@gym_tracker_plan_routines',
    WORKOUT_SESSIONS: '@gym_tracker_workout_sessions',
    WORKOUT_LOGS: '@gym_tracker_workout_logs',
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
