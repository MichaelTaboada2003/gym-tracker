/**
 * Local-first persistence layer.
 *
 * Everything is stored in AsyncStorage as one JSON array per "table". Three
 * properties matter here and are easy to lose:
 *
 * 1. **No lost updates.** Every mutation is a read-modify-write of a whole
 *    table, so two concurrent writes to the same key would clobber each other.
 *    All access to a key goes through `withLock`, which serialises it.
 * 2. **No repeated parsing.** Tables are cached in memory after the first read;
 *    reads hand back a shallow copy so callers can sort in place safely.
 * 3. **Migrations run once.** Earlier versions re-derived rest times on every
 *    launch, which silently reset anything the user had customised. Migrations
 *    are now numbered and recorded in `SCHEMA_VERSION_KEY`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Exercise,
    Plan,
    PlanRoutine,
    Routine,
    RoutineExercise,
    WeightLog,
    WorkoutLog,
    WorkoutSession,
} from './database.types';
import { SEED_EXERCISES, SEED_ROUTINES, SEED_ROUTINE_EXERCISES } from './seedData';

export const STORAGE_KEYS = {
    EXERCISES: '@gym_tracker_exercises',
    ROUTINES: '@gym_tracker_routines',
    ROUTINE_EXERCISES: '@gym_tracker_routine_exercises',
    PLANS: '@gym_tracker_plans',
    PLAN_ROUTINES: '@gym_tracker_plan_routines',
    WORKOUT_SESSIONS: '@gym_tracker_workout_sessions',
    WORKOUT_LOGS: '@gym_tracker_workout_logs',
    BODY_WEIGHT: '@gym_tracker_body_weight',
    ACTIVE_WORKOUT: '@gym_tracker_active_workout',
    SETTINGS: '@gym_tracker_settings',
} as const;

const SCHEMA_VERSION_KEY = '@gym_tracker_schema_version';

// =============================================================================
// Primitives: cache + per-key serialisation
// =============================================================================

const cache = new Map<string, unknown[]>();
/** Tail of the pending operation chain for each key. */
const locks = new Map<string, Promise<unknown>>();

/**
 * Runs `fn` only after every previously queued operation on `key` has settled,
 * so read-modify-write cycles can never interleave.
 */
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = locks.get(key) ?? Promise.resolve();
    const next = previous.then(fn, fn);
    // Keep the chain alive even if this operation rejects.
    locks.set(
        key,
        next.catch(() => undefined)
    );
    return next;
}

async function readTable<T>(key: string): Promise<T[]> {
    const cached = cache.get(key);
    if (cached) return cached as T[];

    try {
        const raw = await AsyncStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(parsed) ? parsed : [];
        cache.set(key, rows);
        return rows as T[];
    } catch (error) {
        console.error(`[db] could not read ${key}:`, error);
        cache.set(key, []);
        return [];
    }
}

async function writeTable<T>(key: string, rows: T[]): Promise<void> {
    cache.set(key, rows as unknown[]);
    await AsyncStorage.setItem(key, JSON.stringify(rows));
}

/** Reads a table. The array is a copy; the rows inside are shared and must be treated as immutable. */
async function getAll<T>(key: string): Promise<T[]> {
    return withLock(key, async () => [...(await readTable<T>(key))]);
}

async function saveAll<T>(key: string, rows: T[]): Promise<void> {
    return withLock(key, () => writeTable(key, rows));
}

async function addItem<T extends { id: string }>(key: string, item: T): Promise<T> {
    return withLock(key, async () => {
        const rows = await readTable<T>(key);
        await writeTable(key, [...rows, item]);
        return item;
    });
}

/** Inserts many rows in a single write — the loop-of-awaits version was O(n) full-table writes. */
async function addMany<T extends { id: string }>(key: string, items: T[]): Promise<void> {
    if (items.length === 0) return;
    return withLock(key, async () => {
        const rows = await readTable<T>(key);
        await writeTable(key, [...rows, ...items]);
    });
}

async function updateItem<T extends { id: string }>(
    key: string,
    id: string,
    updates: Partial<T>
): Promise<T | null> {
    return withLock(key, async () => {
        const rows = await readTable<T>(key);
        const index = rows.findIndex((row) => row.id === id);
        if (index === -1) return null;

        const updated = { ...rows[index], ...updates };
        const next = [...rows];
        next[index] = updated;
        await writeTable(key, next);
        return updated;
    });
}

async function deleteItem(key: string, id: string): Promise<void> {
    return withLock(key, async () => {
        const rows = await readTable<{ id: string }>(key);
        await writeTable(
            key,
            rows.filter((row) => row.id !== id)
        );
    });
}

async function deleteWhere<T>(key: string, predicate: (row: T) => boolean): Promise<number> {
    return withLock(key, async () => {
        const rows = await readTable<T>(key);
        const next = rows.filter((row) => !predicate(row));
        if (next.length === rows.length) return 0;
        await writeTable(key, next);
        return rows.length - next.length;
    });
}

async function getById<T extends { id: string }>(key: string, id: string): Promise<T | null> {
    const rows = await getAll<T>(key);
    return rows.find((row) => row.id === id) ?? null;
}

/** Replaces every row matching `predicate` with the supplied rows, atomically. */
async function replaceWhere<T>(key: string, predicate: (row: T) => boolean, rows: T[]): Promise<void> {
    return withLock(key, async () => {
        const existing = await readTable<T>(key);
        await writeTable(key, [...existing.filter((row) => !predicate(row)), ...rows]);
    });
}

// =============================================================================
// Ids
// =============================================================================

/**
 * RFC-4122-shaped v4 id. Not cryptographically random, but it only has to be
 * unique inside one device's storage.
 */
export const generateId = (): string =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });

// =============================================================================
// Public table API
// =============================================================================

export const storage = {
    exercises: {
        getAll: () => getAll<Exercise>(STORAGE_KEYS.EXERCISES),
        getById: (id: string) => getById<Exercise>(STORAGE_KEYS.EXERCISES, id),
        add: (item: Exercise) => addItem(STORAGE_KEYS.EXERCISES, item),
        update: (id: string, updates: Partial<Exercise>) =>
            updateItem<Exercise>(STORAGE_KEYS.EXERCISES, id, updates),
        delete: (id: string) => deleteItem(STORAGE_KEYS.EXERCISES, id),
    },

    routines: {
        getAll: () => getAll<Routine>(STORAGE_KEYS.ROUTINES),
        getById: (id: string) => getById<Routine>(STORAGE_KEYS.ROUTINES, id),
        add: (item: Routine) => addItem(STORAGE_KEYS.ROUTINES, item),
        update: (id: string, updates: Partial<Routine>) =>
            updateItem<Routine>(STORAGE_KEYS.ROUTINES, id, updates),
        delete: (id: string) => deleteItem(STORAGE_KEYS.ROUTINES, id),
    },

    routineExercises: {
        getAll: () => getAll<RoutineExercise>(STORAGE_KEYS.ROUTINE_EXERCISES),
        addMany: (items: RoutineExercise[]) => addMany(STORAGE_KEYS.ROUTINE_EXERCISES, items),
        /** Swaps a routine's whole exercise list in one write. */
        replaceForRoutine: (routineId: string, items: RoutineExercise[]) =>
            replaceWhere<RoutineExercise>(
                STORAGE_KEYS.ROUTINE_EXERCISES,
                (row) => row.routine_id === routineId,
                items
            ),
        deleteByRoutineId: (routineId: string) =>
            deleteWhere<RoutineExercise>(
                STORAGE_KEYS.ROUTINE_EXERCISES,
                (row) => row.routine_id === routineId
            ),
        deleteByExerciseId: (exerciseId: string) =>
            deleteWhere<RoutineExercise>(
                STORAGE_KEYS.ROUTINE_EXERCISES,
                (row) => row.exercise_id === exerciseId
            ),
    },

    plans: {
        getAll: () => getAll<Plan>(STORAGE_KEYS.PLANS),
        getById: (id: string) => getById<Plan>(STORAGE_KEYS.PLANS, id),
        add: (item: Plan) => addItem(STORAGE_KEYS.PLANS, item),
        addMany: (items: Plan[]) => addMany(STORAGE_KEYS.PLANS, items),
        saveAll: (rows: Plan[]) => saveAll(STORAGE_KEYS.PLANS, rows),
        update: (id: string, updates: Partial<Plan>) => updateItem<Plan>(STORAGE_KEYS.PLANS, id, updates),
        delete: (id: string) => deleteItem(STORAGE_KEYS.PLANS, id),
    },

    planRoutines: {
        getAll: () => getAll<PlanRoutine>(STORAGE_KEYS.PLAN_ROUTINES),
        addMany: (items: PlanRoutine[]) => addMany(STORAGE_KEYS.PLAN_ROUTINES, items),
        replaceForPlan: (planId: string, items: PlanRoutine[]) =>
            replaceWhere<PlanRoutine>(STORAGE_KEYS.PLAN_ROUTINES, (row) => row.plan_id === planId, items),
        deleteByPlanId: (planId: string) =>
            deleteWhere<PlanRoutine>(STORAGE_KEYS.PLAN_ROUTINES, (row) => row.plan_id === planId),
        deleteByRoutineId: (routineId: string) =>
            deleteWhere<PlanRoutine>(STORAGE_KEYS.PLAN_ROUTINES, (row) => row.routine_id === routineId),
    },

    workoutSessions: {
        getAll: () => getAll<WorkoutSession>(STORAGE_KEYS.WORKOUT_SESSIONS),
        getById: (id: string) => getById<WorkoutSession>(STORAGE_KEYS.WORKOUT_SESSIONS, id),
        add: (item: WorkoutSession) => addItem(STORAGE_KEYS.WORKOUT_SESSIONS, item),
        addMany: (items: WorkoutSession[]) => addMany(STORAGE_KEYS.WORKOUT_SESSIONS, items),
        saveAll: (rows: WorkoutSession[]) => saveAll(STORAGE_KEYS.WORKOUT_SESSIONS, rows),
        update: (id: string, updates: Partial<WorkoutSession>) =>
            updateItem<WorkoutSession>(STORAGE_KEYS.WORKOUT_SESSIONS, id, updates),
        delete: (id: string) => deleteItem(STORAGE_KEYS.WORKOUT_SESSIONS, id),
    },

    workoutLogs: {
        getAll: () => getAll<WorkoutLog>(STORAGE_KEYS.WORKOUT_LOGS),
        addMany: (items: WorkoutLog[]) => addMany(STORAGE_KEYS.WORKOUT_LOGS, items),
        deleteBySessionId: (sessionId: string) =>
            deleteWhere<WorkoutLog>(STORAGE_KEYS.WORKOUT_LOGS, (row) => row.session_id === sessionId),
        deleteByExerciseId: (exerciseId: string) =>
            deleteWhere<WorkoutLog>(STORAGE_KEYS.WORKOUT_LOGS, (row) => row.exercise_id === exerciseId),
    },

    bodyWeight: {
        getAll: () => getAll<WeightLog>(STORAGE_KEYS.BODY_WEIGHT),
        saveAll: (rows: WeightLog[]) => saveAll(STORAGE_KEYS.BODY_WEIGHT, rows),
        delete: (id: string) => deleteItem(STORAGE_KEYS.BODY_WEIGHT, id),
    },
};

// =============================================================================
// Cascading deletes
// =============================================================================

/** Removes a routine plus every plan slot that referenced it. */
export async function deleteRoutineCascade(routineId: string): Promise<void> {
    await storage.routineExercises.deleteByRoutineId(routineId);
    await storage.planRoutines.deleteByRoutineId(routineId);
    await storage.routines.delete(routineId);
}

/** Removes an exercise plus every routine slot that referenced it. Logged history is kept. */
export async function deleteExerciseCascade(exerciseId: string): Promise<void> {
    await storage.routineExercises.deleteByExerciseId(exerciseId);
    await storage.exercises.delete(exerciseId);
}

/** Removes a plan plus its day assignments. */
export async function deletePlanCascade(planId: string): Promise<void> {
    await storage.planRoutines.deleteByPlanId(planId);
    await storage.plans.delete(planId);
}

/** Removes a session and every set logged inside it. */
export async function deleteSessionCascade(sessionId: string): Promise<void> {
    await storage.workoutLogs.deleteBySessionId(sessionId);
    await storage.workoutSessions.delete(sessionId);
}

// =============================================================================
// Seeding
// =============================================================================

const DEFAULT_REST_BY_TEMPO: Record<number, number> = { 2: 60, 3: 90, 4: 120, 5: 150 };

function normaliseSeedExercise(raw: (typeof SEED_EXERCISES)[number], now: string): Exercise {
    const tempo = raw.time_per_rep_seconds || 3;
    return {
        id: raw.id,
        name: raw.name,
        muscle_group: raw.muscle_group,
        equipment: raw.equipment ?? '',
        notes: null,
        created_at: now,
        time_per_rep_seconds: tempo,
        default_rest_seconds: DEFAULT_REST_BY_TEMPO[tempo] ?? 90,
    };
}

function normaliseSeedRoutineExercise(raw: (typeof SEED_ROUTINE_EXERCISES)[number]): RoutineExercise {
    const exercise = SEED_EXERCISES.find((e) => e.id === raw.exercise_id);
    return {
        id: raw.id,
        routine_id: raw.routine_id,
        exercise_id: raw.exercise_id,
        order_index: raw.order_index,
        target_sets: raw.target_sets,
        target_reps: raw.target_reps,
        rest_seconds: raw.rest_seconds ?? 90,
        time_per_rep_seconds: exercise?.time_per_rep_seconds ?? 3,
        notes: raw.notes ?? null,
    };
}

/** Writes the bundled starter catalogue. Existing rows are replaced. */
export const seedDatabase = async (): Promise<void> => {
    const now = new Date().toISOString();
    await saveAll(
        STORAGE_KEYS.EXERCISES,
        SEED_EXERCISES.map((e) => normaliseSeedExercise(e, now))
    );
    await saveAll(
        STORAGE_KEYS.ROUTINES,
        SEED_ROUTINES.map((r) => ({ ...r, description: r.description ?? null, created_at: now, updated_at: now }))
    );
    await saveAll(STORAGE_KEYS.ROUTINE_EXERCISES, SEED_ROUTINE_EXERCISES.map(normaliseSeedRoutineExercise));
};

// =============================================================================
// Migrations
// =============================================================================

/**
 * Ordered, idempotent-by-version migrations. Bump `SCHEMA_VERSION` and append a
 * step; everything below the stored version is skipped on later launches.
 */
const SCHEMA_VERSION = 2;

const MIGRATIONS: Record<number, () => Promise<void>> = {
    /**
     * v1 — `routine_exercises.notes` used to hold `{"restTime":…,"timePerRep":…}`,
     * which both destroyed the human-written coaching notes and made every
     * consumer call `JSON.parse` on untrusted text. Promote them to real fields.
     */
    1: async () => {
        const rows = await getAll<RoutineExercise & { notes: string | null }>(
            STORAGE_KEYS.ROUTINE_EXERCISES
        );
        if (rows.length === 0) return;

        const exercises = await storage.exercises.getAll();
        const tempoById = new Map(exercises.map((e) => [e.id, e.time_per_rep_seconds]));
        const restById = new Map(exercises.map((e) => [e.id, e.default_rest_seconds]));

        const migrated = rows.map((row) => {
            let restSeconds = row.rest_seconds;
            let tempo = row.time_per_rep_seconds;
            let notes = row.notes;

            if (typeof notes === 'string' && notes.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(notes) as {
                        restTime?: number;
                        timePerRep?: number;
                        originalNotes?: string;
                    };
                    restSeconds = restSeconds ?? parsed.restTime;
                    tempo = tempo ?? parsed.timePerRep;
                    notes = parsed.originalNotes ?? null;
                } catch {
                    // Not the legacy JSON blob after all — keep it as free text.
                }
            }

            return {
                ...row,
                rest_seconds: restSeconds ?? restById.get(row.exercise_id) ?? 90,
                time_per_rep_seconds: tempo ?? tempoById.get(row.exercise_id) ?? 3,
                notes: notes ?? null,
            };
        });

        await saveAll(STORAGE_KEYS.ROUTINE_EXERCISES, migrated);
    },

    /**
     * v2 — normalise loosely-typed persisted values: `is_warmup` was written as
     * 0/1 by one code path and as a boolean by another, and weights round-tripped
     * as strings. Also fills in exercise defaults that predate those columns.
     */
    2: async () => {
        const logs = await getAll<Omit<WorkoutLog, 'is_warmup'> & { is_warmup: unknown }>(
            STORAGE_KEYS.WORKOUT_LOGS
        );
        if (logs.length > 0) {
            await saveAll(
                STORAGE_KEYS.WORKOUT_LOGS,
                logs.map((log) => ({
                    ...log,
                    weight_kg: Number(log.weight_kg) || 0,
                    reps: Number(log.reps) || 0,
                    rpe: log.rpe == null ? null : Number(log.rpe),
                    is_warmup: log.is_warmup === true || log.is_warmup === 1 || log.is_warmup === '1',
                }))
            );
        }

        const exercises = await getAll<Partial<Exercise> & { id: string }>(STORAGE_KEYS.EXERCISES);
        if (exercises.length > 0) {
            await saveAll(
                STORAGE_KEYS.EXERCISES,
                exercises.map((exercise) => {
                    const tempo = exercise.time_per_rep_seconds || 3;
                    return {
                        ...exercise,
                        equipment: exercise.equipment ?? '',
                        notes: exercise.notes ?? null,
                        created_at: exercise.created_at ?? new Date().toISOString(),
                        time_per_rep_seconds: tempo,
                        default_rest_seconds:
                            exercise.default_rest_seconds || DEFAULT_REST_BY_TEMPO[tempo] || 90,
                    } as Exercise;
                })
            );
        }

        // One body-weight entry per day; keep the last one written.
        const weights = await getAll<WeightLog>(STORAGE_KEYS.BODY_WEIGHT);
        const byDate = new Map<string, WeightLog>();
        weights.forEach((log) => byDate.set(log.date, log));
        if (byDate.size !== weights.length) {
            await saveAll(STORAGE_KEYS.BODY_WEIGHT, Array.from(byDate.values()));
        }
    },
};

async function runMigrations(): Promise<void> {
    const stored = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
    const current = stored ? Number(stored) || 0 : 0;
    if (current >= SCHEMA_VERSION) return;

    for (let version = current + 1; version <= SCHEMA_VERSION; version++) {
        const migration = MIGRATIONS[version];
        if (!migration) continue;
        try {
            await migration();
        } catch (error) {
            // A failed migration must not brick the app; stop and retry next launch.
            console.error(`[db] migration v${version} failed:`, error);
            await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(version - 1));
            return;
        }
    }

    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
}

/**
 * Seeds a fresh install and brings existing data up to the current schema.
 * Callers must await this before rendering anything that reads the database.
 */
export const initializeDatabase = async (): Promise<void> => {
    try {
        const [exercises, routines] = await Promise.all([
            storage.exercises.getAll(),
            storage.routines.getAll(),
        ]);

        const isFreshInstall = exercises.length === 0 && routines.length === 0;
        if (isFreshInstall) {
            await seedDatabase();
            // Freshly seeded data is already in the current shape.
            await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
            return;
        }

        await runMigrations();
    } catch (error) {
        console.error('[db] initialisation failed:', error);
        throw error;
    }
};

/** Wipes every table. Used by the danger zone in Settings. */
export const clearAllData = async (): Promise<void> => {
    await AsyncStorage.multiRemove([...Object.values(STORAGE_KEYS), SCHEMA_VERSION_KEY]);
    cache.clear();
};
