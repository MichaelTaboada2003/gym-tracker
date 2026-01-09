-- Migration: 003_create_routine_exercises
-- Description: Junction table connecting routines to exercises

CREATE TABLE routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 0,
    target_sets INT DEFAULT 3,
    target_reps INT DEFAULT 10,
    notes TEXT
);

-- Index for faster routine lookups
CREATE INDEX idx_routine_exercises_routine ON routine_exercises(routine_id);
CREATE INDEX idx_routine_exercises_order ON routine_exercises(routine_id, order_index);
