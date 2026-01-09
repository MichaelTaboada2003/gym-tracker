-- Migration: 007_create_training_plans
-- Description: Creates tables for Training Plans (grouping routines) and seeds PPL plan

-- 1. Create training_plans table
CREATE TABLE training_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create plan_routines junction table
CREATE TABLE plan_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    day_number INT NOT NULL, -- 1-based index (Day 1, Day 2...)
    notes TEXT, -- Optional notes for this day in the plan
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, day_number)
);

-- Indexes
CREATE INDEX idx_plan_routines_plan ON plan_routines(plan_id);
CREATE INDEX idx_plan_routines_routine ON plan_routines(routine_id);

-- 3. Seed "Push Pull Legs (6 Days)" Plan
DO $$
DECLARE
    v_plan_id UUID;
    
    -- Routine IDs (We need to find them by name since we don't have variables from previous migration)
    v_push_a_id UUID;
    v_pull_a_id UUID;
    v_legs_a_id UUID;
    v_push_b_id UUID;
    v_pull_b_id UUID;
    v_legs_b_id UUID;
BEGIN
    -- Get Routine IDs
    SELECT id INTO v_push_a_id FROM routines WHERE name LIKE '%PUSH A%' LIMIT 1;
    SELECT id INTO v_pull_a_id FROM routines WHERE name LIKE '%PULL A%' LIMIT 1;
    SELECT id INTO v_legs_a_id FROM routines WHERE name LIKE '%LEGS A%' LIMIT 1;
    SELECT id INTO v_push_b_id FROM routines WHERE name LIKE '%PUSH B%' LIMIT 1;
    SELECT id INTO v_pull_b_id FROM routines WHERE name LIKE '%PULL B%' LIMIT 1;
    SELECT id INTO v_legs_b_id FROM routines WHERE name LIKE '%LEGS B%' LIMIT 1;

    -- Create Plan
    INSERT INTO training_plans (name, description)
    VALUES ('Push Pull Legs (Frecuencia 2)', 'Rutina de 6 días enfocada en hipertrofia y fuerza. Divide el cuerpo en patrones de movimiento: Empuje, Tracción y Pierna.')
    RETURNING id INTO v_plan_id;

    -- Link Routines (Day 1-3)
    IF v_push_a_id IS NOT NULL THEN
        INSERT INTO plan_routines (plan_id, routine_id, day_number) VALUES (v_plan_id, v_push_a_id, 1);
    END IF;
    IF v_pull_a_id IS NOT NULL THEN
        INSERT INTO plan_routines (plan_id, routine_id, day_number) VALUES (v_plan_id, v_pull_a_id, 2);
    END IF;
    IF v_legs_a_id IS NOT NULL THEN
        INSERT INTO plan_routines (plan_id, routine_id, day_number) VALUES (v_plan_id, v_legs_a_id, 3);
    END IF;

    -- Link Routines (Day 5-7, leaving Day 4 empty/implicit rest or just sequential)
    -- We will map them sequentially 4,5,6 for the plan structure, assuming user knows Rest Day is between simple cycles or flexible
    -- OR we can represent 7 days explicitly. Let's do explicit day numbers assuming a weekly schedule.
    
    -- Day 4 is Rest (No routine linked)
    
    IF v_push_b_id IS NOT NULL THEN
        INSERT INTO plan_routines (plan_id, routine_id, day_number) VALUES (v_plan_id, v_push_b_id, 5);
    END IF;
    IF v_pull_b_id IS NOT NULL THEN
        INSERT INTO plan_routines (plan_id, routine_id, day_number) VALUES (v_plan_id, v_pull_b_id, 6);
    END IF;
    IF v_legs_b_id IS NOT NULL THEN
        INSERT INTO plan_routines (plan_id, routine_id, day_number) VALUES (v_plan_id, v_legs_b_id, 7);
    END IF;
    
END $$;
