-- Migration: 004_create_workout_sessions
-- Description: Creates workout sessions table for tracking individual workouts

CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INT,
    notes TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index for date-based queries (calendar view, recent workouts)
CREATE INDEX idx_workout_sessions_date ON workout_sessions(session_date DESC);
CREATE INDEX idx_workout_sessions_routine ON workout_sessions(routine_id);
