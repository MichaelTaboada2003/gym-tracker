import { Platform } from 'react-native';

// Type definitions for our database interface
export interface DatabaseInterface {
    getAllAsync: <T>(sql: string, params?: any[]) => Promise<T[]>;
    getFirstAsync: <T>(sql: string, params?: any[]) => Promise<T | null>;
    runAsync: (sql: string, params?: any[]) => Promise<void>;
    execAsync: (sql: string) => Promise<void>;
}

// In-memory storage for web (fallback)
let inMemoryData: { [table: string]: any[] } = {
    exercises: [],
    routines: [],
    routine_exercises: [],
    training_plans: [],
    plan_routines: [],
    workout_sessions: [],
    workout_logs: [],
};

// Web fallback database (in-memory)
const webDatabase: DatabaseInterface = {
    getAllAsync: async <T>(sql: string, _params?: any[]): Promise<T[]> => {
        // Simple table extraction from SQL
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        if (tableMatch) {
            const table = tableMatch[1];
            return (inMemoryData[table] || []) as T[];
        }
        return [];
    },
    getFirstAsync: async <T>(sql: string, params?: any[]): Promise<T | null> => {
        const results = await webDatabase.getAllAsync<T>(sql, params);
        return results[0] || null;
    },
    runAsync: async (sql: string, params?: any[]): Promise<void> => {
        // Parse INSERT statements
        const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
        if (insertMatch && params) {
            const table = insertMatch[1];
            if (!inMemoryData[table]) inMemoryData[table] = [];
            // Create object from params (simplified)
            const obj: any = {};
            const fieldsMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
            if (fieldsMatch) {
                const fields = fieldsMatch[1].split(',').map(f => f.trim());
                fields.forEach((field, i) => {
                    obj[field] = params[i];
                });
            }
            inMemoryData[table].push(obj);
        }

        // Parse DELETE statements
        const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
        if (deleteMatch && params) {
            const table = deleteMatch[1];
            const field = deleteMatch[2];
            if (inMemoryData[table]) {
                inMemoryData[table] = inMemoryData[table].filter(
                    (item: any) => item[field] !== params[0]
                );
            }
        }

        // Parse UPDATE statements
        const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET/i);
        if (updateMatch && params) {
            const table = updateMatch[1];
            // Last param is typically the id in WHERE clause
            const id = params[params.length - 1];
            if (inMemoryData[table]) {
                inMemoryData[table] = inMemoryData[table].map((item: any) => {
                    if (item.id === id) {
                        // Parse SET clause fields
                        const setMatch = sql.match(/SET\s+(.+)\s+WHERE/i);
                        if (setMatch) {
                            const setParts = setMatch[1].split(',');
                            setParts.forEach((part, i) => {
                                const fieldMatch = part.trim().match(/(\w+)\s*=/);
                                if (fieldMatch) {
                                    item[fieldMatch[1]] = params[i];
                                }
                            });
                        }
                    }
                    return item;
                });
            }
        }
    },
    execAsync: async (_sql: string): Promise<void> => {
        // Tables are already "created" via inMemoryData initialization
        console.log('[Web] Tables initialized in memory');
    },
};

// Create the database instance based on platform
let db: DatabaseInterface;
let initializeDatabase: () => Promise<void>;
let generateId: () => string;

if (Platform.OS === 'web') {
    // Use in-memory fallback for web
    db = webDatabase;

    initializeDatabase = async (): Promise<void> => {
        console.log('✅ Web: Using in-memory database (data will not persist)');
    };

    generateId = (): string => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };
} else {
    // Use real SQLite for native platforms
    const SQLite = require('expo-sqlite');
    const sqliteDb = SQLite.openDatabaseSync('gym_tracker.db');

    db = {
        getAllAsync: async <T>(sql: string, params?: any[]): Promise<T[]> => {
            return await sqliteDb.getAllAsync(sql, params || []);
        },
        getFirstAsync: async <T>(sql: string, params?: any[]): Promise<T | null> => {
            return await sqliteDb.getFirstAsync(sql, params || []);
        },
        runAsync: async (sql: string, params?: any[]): Promise<void> => {
            await sqliteDb.runAsync(sql, params || []);
        },
        execAsync: async (sql: string): Promise<void> => {
            await sqliteDb.execAsync(sql);
        },
    };

    initializeDatabase = async (): Promise<void> => {
        try {
            // Enable foreign keys
            await sqliteDb.execAsync('PRAGMA foreign_keys = ON;');

            // Create exercises table
            await sqliteDb.execAsync(`
                CREATE TABLE IF NOT EXISTS exercises (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    muscle_group TEXT NOT NULL,
                    equipment TEXT DEFAULT '',
                    notes TEXT,
                    time_per_rep_seconds INTEGER DEFAULT 3,
                    default_rest_seconds INTEGER DEFAULT 90,
                    created_at TEXT DEFAULT (datetime('now'))
                );
            `);

            // Create routines table
            await sqliteDb.execAsync(`
                CREATE TABLE IF NOT EXISTS routines (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    estimated_duration INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                );
            `);

            // Create routine_exercises junction table
            await sqliteDb.execAsync(`
                CREATE TABLE IF NOT EXISTS routine_exercises (
                    id TEXT PRIMARY KEY NOT NULL,
                    routine_id TEXT NOT NULL,
                    exercise_id TEXT NOT NULL,
                    order_index INTEGER DEFAULT 0,
                    target_sets INTEGER DEFAULT 3,
                    target_reps TEXT DEFAULT '10',
                    notes TEXT,
                    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
                    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
                );
            `);

            // Create training_plans table
            await sqliteDb.execAsync(`
                CREATE TABLE IF NOT EXISTS training_plans (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    duration_days INTEGER DEFAULT 7,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                );
            `);

            // Create plan_routines junction table
            await sqliteDb.execAsync(`
                CREATE TABLE IF NOT EXISTS plan_routines (
                    id TEXT PRIMARY KEY NOT NULL,
                    plan_id TEXT NOT NULL,
                    routine_id TEXT NOT NULL,
                    day_number INTEGER NOT NULL,
                    notes TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE,
                    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE
                );
            `);

            // Create workout_sessions table
            await sqliteDb.execAsync(`
                CREATE TABLE IF NOT EXISTS workout_sessions (
                    id TEXT PRIMARY KEY NOT NULL,
                    routine_id TEXT,
                    session_date TEXT DEFAULT (date('now')),
                    duration_minutes INTEGER,
                    notes TEXT,
                    started_at TEXT DEFAULT (datetime('now')),
                    completed_at TEXT,
                    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE SET NULL
                );
            `);

            // Create workout_logs table
            await sqliteDb.execAsync(`
                CREATE TABLE IF NOT EXISTS workout_logs (
                    id TEXT PRIMARY KEY NOT NULL,
                    session_id TEXT NOT NULL,
                    exercise_id TEXT NOT NULL,
                    set_number INTEGER NOT NULL,
                    weight_kg REAL DEFAULT 0,
                    reps INTEGER NOT NULL,
                    rpe REAL,
                    is_warmup INTEGER DEFAULT 0,
                    logged_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
                );
            `);

            console.log('✅ SQLite Database initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing database:', error);
            throw error;
        }
    };

    generateId = (): string => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };
}

export { db, initializeDatabase, generateId };
