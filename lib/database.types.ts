export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            exercises: {
                Row: {
                    id: string;
                    name: string;
                    muscle_group: string;
                    equipment: string;
                    notes: string | null;
                    created_at: string;
                    time_per_rep_seconds: number;
                    default_rest_seconds: number;
                };
                Insert: {
                    id?: string;
                    name: string;
                    muscle_group: string;
                    equipment?: string;
                    notes?: string | null;
                    created_at?: string;
                    time_per_rep_seconds?: number;
                    default_rest_seconds?: number;
                };
                Update: {
                    id?: string;
                    name?: string;
                    muscle_group?: string;
                    equipment?: string;
                    notes?: string | null;
                    created_at?: string;
                    time_per_rep_seconds?: number;
                    default_rest_seconds?: number;
                };
            };
            routines: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    estimated_duration: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    estimated_duration?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    estimated_duration?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            routine_exercises: {
                Row: {
                    id: string;
                    routine_id: string;
                    exercise_id: string;
                    order_index: number;
                    target_sets: number;
                    target_reps: string;
                    notes: string | null;
                };
                Insert: {
                    id?: string;
                    routine_id: string;
                    exercise_id: string;
                    order_index?: number;
                    target_sets?: number;
                    target_reps?: string;
                    notes?: string | null;
                };
                Update: {
                    id?: string;
                    routine_id?: string;
                    exercise_id?: string;
                    order_index?: number;
                    target_sets?: number;
                    target_reps?: string;
                    notes?: string | null;
                };
            };
            workout_sessions: {
                Row: {
                    id: string;
                    routine_id: string | null;
                    session_date: string;
                    duration_minutes: number | null;
                    notes: string | null;
                    started_at: string;
                    completed_at: string | null;
                };
                Insert: {
                    id?: string;
                    routine_id?: string | null;
                    session_date?: string;
                    duration_minutes?: number | null;
                    notes?: string | null;
                    started_at?: string;
                    completed_at?: string | null;
                };
                Update: {
                    id?: string;
                    routine_id?: string | null;
                    session_date?: string;
                    duration_minutes?: number | null;
                    notes?: string | null;
                    started_at?: string;
                    completed_at?: string | null;
                };
            };
            workout_logs: {
                Row: {
                    id: string;
                    session_id: string;
                    exercise_id: string;
                    set_number: number;
                    weight_kg: number;
                    reps: number;
                    rpe: number | null;
                    is_warmup: boolean;
                    logged_at: string;
                };
                Insert: {
                    id?: string;
                    session_id: string;
                    exercise_id: string;
                    set_number: number;
                    weight_kg?: number;
                    reps: number;
                    rpe?: number | null;
                    is_warmup?: boolean;
                    logged_at?: string;
                };
                Update: {
                    id?: string;
                    session_id?: string;
                    exercise_id?: string;
                    set_number?: number;
                    weight_kg?: number;
                    reps?: number;
                    rpe?: number | null;
                    is_warmup?: boolean;
                    logged_at?: string;
                };
            };
            training_plans: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    duration_days: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    duration_days?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    duration_days?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            plan_routines: {
                Row: {
                    id: string;
                    plan_id: string;
                    routine_id: string;
                    day_number: number;
                    notes: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    plan_id: string;
                    routine_id: string;
                    day_number: number;
                    notes?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    plan_id?: string;
                    routine_id?: string;
                    day_number?: number;
                    notes?: string | null;
                    created_at?: string;
                };
            };
        };
        Views: {
            exercise_history: {
                Row: {
                    exercise_id: string;
                    exercise_name: string;
                    session_date: string;
                    set_number: number;
                    weight_kg: number;
                    reps: number;
                    rpe: number | null;
                    volume: number;
                    estimated_1rm: number;
                };
            };
        };
    };
}

// Convenience types
export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type Routine = Database['public']['Tables']['routines']['Row'];
export type RoutineExercise = Database['public']['Tables']['routine_exercises']['Row'];
export type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row'];
export type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'];
export type ExerciseHistory = Database['public']['Views']['exercise_history']['Row'];
export type Plan = Database['public']['Tables']['training_plans']['Row'];
export type PlanRoutine = Database['public']['Tables']['plan_routines']['Row'];
