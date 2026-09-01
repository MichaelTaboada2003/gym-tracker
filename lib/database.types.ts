/**
 * Domain types for Gym Tracker.
 *
 * The app is 100% local-first: everything lives in AsyncStorage behind
 * `lib/localDatabase.ts`. These are plain domain entities — the shapes below
 * are the contract every hook, screen and migration relies on.
 *
 * Naming stays snake_case for stored fields so that persisted records and
 * the types describing them are literally the same shape.
 */

/** A movement the user can perform. */
export interface Exercise {
    id: string;
    name: string;
    muscle_group: string;
    equipment: string;
    notes: string | null;
    created_at: string;
    /** Tempo estimate used to predict routine duration. */
    time_per_rep_seconds: number;
    /** Default rest applied when a routine does not override it. */
    default_rest_seconds: number;
}

/** An ordered list of exercises the user trains in one session. */
export interface Routine {
    id: string;
    name: string;
    description: string | null;
    /** Minutes, derived from the exercise config via `lib/durationCalculator`. */
    estimated_duration: number;
    created_at: string;
    updated_at: string;
}

/**
 * One exercise inside a routine.
 *
 * `rest_seconds` / `time_per_rep_seconds` used to live JSON-encoded inside
 * `notes`. They are first-class fields now; `notes` is free text again.
 * See `MIGRATIONS.unpackRoutineExerciseNotes` in `lib/localDatabase.ts`.
 */
export interface RoutineExercise {
    id: string;
    routine_id: string;
    exercise_id: string;
    order_index: number;
    target_sets: number;
    /** Free-form rep target: "10", "8-10", "AMRAP"… */
    target_reps: string;
    rest_seconds: number;
    time_per_rep_seconds: number;
    notes: string | null;
}

/** A completed (or in-progress) training session. */
export interface WorkoutSession {
    id: string;
    routine_id: string | null;
    /** Local calendar day, `YYYY-MM-DD`. */
    session_date: string;
    duration_minutes: number | null;
    notes: string | null;
    started_at: string;
    completed_at: string | null;
}

/** A single set performed during a session. */
export interface WorkoutLog {
    id: string;
    session_id: string;
    exercise_id: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    /** Rate of Perceived Exertion, 6–10. */
    rpe: number | null;
    is_warmup: boolean;
    logged_at: string;
}

/** A multi-day program that schedules routines across a cycle. */
export interface Plan {
    id: string;
    name: string;
    description: string | null;
    duration_days: number;
    created_at: string;
    updated_at: string;
}

/** A routine assigned to one day of a plan. */
export interface PlanRoutine {
    id: string;
    plan_id: string;
    routine_id: string;
    /** 1-indexed day inside the plan cycle. */
    day_number: number;
    notes: string | null;
    created_at: string;
}

/** A body-weight measurement for a given day. */
export interface WeightLog {
    id: string;
    weight_kg: number;
    /** `YYYY-MM-DD`. One entry per day (upserted). */
    date: string;
}

/**
 * A saved AI analysis of one session.
 *
 * Persisted so re-opening a workout does not spend tokens generating the same
 * verdict twice; `raw` is the model's untouched reply.
 */
export interface SessionAnalysis {
    id: string;
    session_id: string;
    created_at: string;
    model: string;
    raw: string;
    prompt_tokens: number;
    completion_tokens: number;
}

/** Denormalised row used by the exercise-history views. */
export interface ExerciseHistory {
    exercise_id: string;
    exercise_name: string;
    session_date: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    rpe: number | null;
    volume: number;
    estimated_1rm: number;
}
