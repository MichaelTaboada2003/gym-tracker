-- Migration: 005_create_workout_logs
-- Description: Creates workout logs for tracking sets with progressive overload

CREATE TABLE workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number INT NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL DEFAULT 0,
    reps INT NOT NULL,
    rpe INT CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion
    is_warmup BOOLEAN DEFAULT FALSE,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL INDEXES for fast weight history queries (progressive overload)
CREATE INDEX idx_workout_logs_exercise_date ON workout_logs(exercise_id, logged_at DESC);
CREATE INDEX idx_workout_logs_session ON workout_logs(session_id);

-- Composite index for getting exercise history efficiently
CREATE INDEX idx_workout_logs_exercise_session ON workout_logs(exercise_id, session_id);

-- View for quick exercise history access with calculated metrics
CREATE VIEW exercise_history AS
SELECT 
    wl.exercise_id,
    e.name as exercise_name,
    e.muscle_group,
    ws.session_date,
    wl.set_number,
    wl.weight_kg,
    wl.reps,
    wl.rpe,
    wl.is_warmup,
    -- Volume calculation (weight × reps)
    (wl.weight_kg * wl.reps) as volume,
    -- Epley formula for estimated 1RM: weight × (1 + reps/30)
    CASE 
        WHEN wl.reps = 1 THEN wl.weight_kg
        ELSE ROUND((wl.weight_kg * (1 + wl.reps::decimal / 30))::numeric, 2)
    END as estimated_1rm
FROM workout_logs wl
JOIN workout_sessions ws ON ws.id = wl.session_id
JOIN exercises e ON e.id = wl.exercise_id
WHERE wl.is_warmup = FALSE
ORDER BY wl.exercise_id, ws.session_date DESC, wl.set_number;

-- Function to get previous best for an exercise
CREATE OR REPLACE FUNCTION get_previous_best(p_exercise_id UUID, p_target_reps INT DEFAULT 10)
RETURNS TABLE(weight_kg DECIMAL, reps INT, session_date DATE) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wl.weight_kg,
        wl.reps,
        ws.session_date
    FROM workout_logs wl
    JOIN workout_sessions ws ON ws.id = wl.session_id
    WHERE wl.exercise_id = p_exercise_id
        AND wl.is_warmup = FALSE
        AND wl.reps BETWEEN p_target_reps - 2 AND p_target_reps + 2
    ORDER BY wl.weight_kg DESC, wl.reps DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
