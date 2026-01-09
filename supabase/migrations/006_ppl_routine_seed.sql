-- Migration: 006_ppl_routine_seed
-- Description: Updates target_reps to TEXT and seeds PPL routines

-- 1. Alter Schema: Change target_reps to TEXT to support ranges like "6-8"
ALTER TABLE routine_exercises ALTER COLUMN target_reps TYPE TEXT USING target_reps::TEXT;

-- 2. Insert PPL Routines using a DO block to manage IDs
DO $$
DECLARE
    -- Exercise IDs
    v_bench_press_id UUID;
    v_incline_db_press_id UUID;
    v_overhead_press_id UUID;
    v_lat_raises_id UUID;
    v_dips_id UUID;
    v_tricep_pushdown_id UUID;
    v_pullups_id UUID;
    v_barbell_row_id UUID;
    v_seated_row_id UUID;
    v_face_pull_id UUID;
    v_barbell_curl_id UUID;
    v_incline_curl_id UUID;
    v_squat_id UUID;
    v_rdl_id UUID;
    v_leg_press_id UUID;
    v_leg_curl_id UUID;
    v_calf_raises_id UUID;
    v_incline_bench_id UUID; -- For Push B (Barra/Multi)
    v_peck_deck_id UUID;
    v_lat_raises_cable_id UUID;
    v_skullcrushers_id UUID;
    v_tricep_ext_uni_id UUID;
    v_lat_pulldown_id UUID;
    v_machine_row_id UUID;
    v_pullover_id UUID;
    v_reverse_fly_id UUID;
    v_preacher_curl_id UUID;
    v_hammer_curl_id UUID;
    v_hack_squat_id UUID;
    v_lunges_id UUID;
    v_leg_ext_id UUID;
    v_seated_leg_curl_id UUID;
    v_seated_calf_id UUID;

    -- Routine IDs
    v_push_a_id UUID;
    v_pull_a_id UUID;
    v_legs_a_id UUID;
    v_push_b_id UUID;
    v_pull_b_id UUID;
    v_legs_b_id UUID;

BEGIN
    -- =========================================================================
    -- 1. UPSERT EXERCISES (Get IDs if exist, create if not)
    -- =========================================================================

    -- Function to upsert and return ID
    CREATE TEMP TABLE IF NOT EXISTS temp_exercises (id UUID, name TEXT);
    
    -- Helper to get or insert exercise
    -- NOTE: We are doing this manually for each to keep it simple within the DO block logic without external functions
    
    -- PUSH A Exercises
    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Press Banca Plano (Barra)', 'Pecho', 'barbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_bench_press_id FROM exercises WHERE name = 'Press Banca Plano (Barra)' LIMIT 1;
    -- Fallback to 'Press Banca' if we want to reuse, but we prefer the specific name for this routine
    IF v_bench_press_id IS NULL THEN SELECT id INTO v_bench_press_id FROM exercises WHERE name = 'Press Banca' LIMIT 1; END IF;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Press Inclinado con Mancuernas', 'Pecho', 'dumbbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_incline_db_press_id FROM exercises WHERE name = 'Press Inclinado con Mancuernas' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Press Militar (Mancuernas)', 'Hombros', 'dumbbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_overhead_press_id FROM exercises WHERE name = 'Press Militar (Mancuernas)' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Elevaciones Laterales (Mancuernas)', 'Hombros', 'dumbbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_lat_raises_id FROM exercises WHERE name = 'Elevaciones Laterales (Mancuernas)' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Fondos', 'Tríceps', 'bodyweight') ON CONFLICT DO NOTHING;
    SELECT id INTO v_dips_id FROM exercises WHERE name = 'Fondos' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Extensión de Tríceps en Polea', 'Tríceps', 'cable') ON CONFLICT DO NOTHING;
    SELECT id INTO v_tricep_pushdown_id FROM exercises WHERE name = 'Extensión de Tríceps en Polea' LIMIT 1;

    -- PULL A Exercises
    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Dominadas', 'Espalda', 'bodyweight') ON CONFLICT DO NOTHING;
    SELECT id INTO v_pullups_id FROM exercises WHERE name = 'Dominadas' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Remo con Barra', 'Espalda', 'barbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_barbell_row_id FROM exercises WHERE name = 'Remo con Barra' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Remo en Polea Baja', 'Espalda', 'cable') ON CONFLICT DO NOTHING;
    SELECT id INTO v_seated_row_id FROM exercises WHERE name = 'Remo en Polea Baja' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Face Pull', 'Hombros', 'cable') ON CONFLICT DO NOTHING;
    SELECT id INTO v_face_pull_id FROM exercises WHERE name = 'Face Pull' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Curl con Barra', 'Bíceps', 'barbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_barbell_curl_id FROM exercises WHERE name = 'Curl con Barra' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Curl Inclinado con Mancuernas', 'Bíceps', 'dumbbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_incline_curl_id FROM exercises WHERE name = 'Curl Inclinado con Mancuernas' LIMIT 1;

    -- LEGS A Exercises
    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Sentadilla Libre', 'Piernas', 'barbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_squat_id FROM exercises WHERE name = 'Sentadilla Libre' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Peso Muerto Rumano', 'Piernas', 'barbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_rdl_id FROM exercises WHERE name = 'Peso Muerto Rumano' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Prensa de Piernas', 'Piernas', 'machine') ON CONFLICT DO NOTHING;
    SELECT id INTO v_leg_press_id FROM exercises WHERE name = 'Prensa de Piernas' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Curl Femoral Tumbado', 'Piernas', 'machine') ON CONFLICT DO NOTHING;
    SELECT id INTO v_leg_curl_id FROM exercises WHERE name = 'Curl Femoral Tumbado' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Elevación de Talones de Pie', 'Piernas', 'machine') ON CONFLICT DO NOTHING;
    SELECT id INTO v_calf_raises_id FROM exercises WHERE name = 'Elevación de Talones de Pie' LIMIT 1;

    -- PUSH B Exercises (New/Specific)
    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Press Inclinado (Barra/Multipower)', 'Pecho', 'barbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_incline_bench_id FROM exercises WHERE name = 'Press Inclinado (Barra/Multipower)' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Peck Deck / Cruce de Poleas', 'Pecho', 'machine') ON CONFLICT DO NOTHING;
    SELECT id INTO v_peck_deck_id FROM exercises WHERE name = 'Peck Deck / Cruce de Poleas' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Elevaciones Laterales en Polea', 'Hombros', 'cable') ON CONFLICT DO NOTHING;
    SELECT id INTO v_lat_raises_cable_id FROM exercises WHERE name = 'Elevaciones Laterales en Polea' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Press Francés / Rompecráneos', 'Tríceps', 'barbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_skullcrushers_id FROM exercises WHERE name = 'Press Francés / Rompecráneos' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Extensión Tríceps Unilateral', 'Tríceps', 'cable') ON CONFLICT DO NOTHING;
    SELECT id INTO v_tricep_ext_uni_id FROM exercises WHERE name = 'Extensión Tríceps Unilateral' LIMIT 1;
    
    -- PULL B Exercises
    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Jalón al Pecho', 'Espalda', 'cable') ON CONFLICT DO NOTHING;
    SELECT id INTO v_lat_pulldown_id FROM exercises WHERE name = 'Jalón al Pecho' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Remo en Máquina (Unilateral)', 'Espalda', 'machine') ON CONFLICT DO NOTHING;
    SELECT id INTO v_machine_row_id FROM exercises WHERE name = 'Remo en Máquina (Unilateral)' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Pullover en Polea Alta', 'Espalda', 'cable') ON CONFLICT DO NOTHING;
    SELECT id INTO v_pullover_id FROM exercises WHERE name = 'Pullover en Polea Alta' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Pájaros (Posterior)', 'Hombros', 'dumbbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_reverse_fly_id FROM exercises WHERE name = 'Pájaros (Posterior)' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Curl Predicador', 'Bíceps', 'machine') ON CONFLICT DO NOTHING;
    SELECT id INTO v_preacher_curl_id FROM exercises WHERE name = 'Curl Predicador' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Curl Martillo', 'Bíceps', 'dumbbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_hammer_curl_id FROM exercises WHERE name = 'Curl Martillo' LIMIT 1;

    -- LEGS B Exercises
    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Hack Squat', 'Piernas', 'machine') ON CONFLICT DO NOTHING;
    SELECT id INTO v_hack_squat_id FROM exercises WHERE name = 'Hack Squat' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Zancadas (Walking Lunges)', 'Piernas', 'dumbbell') ON CONFLICT DO NOTHING;
    SELECT id INTO v_lunges_id FROM exercises WHERE name = 'Zancadas (Walking Lunges)' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Extensión de Cuádriceps', 'Piernas', 'machine') ON CONFLICT DO NOTHING;
    SELECT id INTO v_leg_ext_id FROM exercises WHERE name = 'Extensión de Cuádriceps' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Curl Femoral Sentado', 'Piernas', 'machine') ON CONFLICT DO NOTHING;
    SELECT id INTO v_seated_leg_curl_id FROM exercises WHERE name = 'Curl Femoral Sentado' LIMIT 1;

    INSERT INTO exercises (name, muscle_group, equipment) VALUES ('Gemelos Sentado', 'Piernas', 'machine') ON CONFLICT DO NOTHING;
    SELECT id INTO v_seated_calf_id FROM exercises WHERE name = 'Gemelos Sentado' LIMIT 1;


    -- =========================================================================
    -- 2. CREATE ROUTINES
    -- =========================================================================
    
    -- PUSH A
    INSERT INTO routines (name, description, estimated_duration)
    VALUES ('DÍA 1: PUSH A (Fuerza y Básicos)', 'Enfoque: Cargar pesado (manteniendo buena técnica).', 70)
    RETURNING id INTO v_push_a_id;

    -- PULL A
    INSERT INTO routines (name, description, estimated_duration)
    VALUES ('DÍA 2: PULL A (Espalda Densidad + Bíceps)', 'Enfoque: Grosor de espalda.', 70)
    RETURNING id INTO v_pull_a_id;

    -- LEGS A
    INSERT INTO routines (name, description, estimated_duration)
    VALUES ('DÍA 3: LEGS A (Enfoque Cadena Posterior)', 'Enfoque: Isquios y fuerza general.', 80)
    RETURNING id INTO v_legs_a_id;

    -- PUSH B
    INSERT INTO routines (name, description, estimated_duration)
    VALUES ('DÍA 5: PUSH B (Hipertrofia y Bombeo)', 'Enfoque: Estética y hombros 3D.', 65)
    RETURNING id INTO v_push_b_id;

    -- PULL B
    INSERT INTO routines (name, description, estimated_duration)
    VALUES ('DÍA 6: PULL B (Anchura + Bíceps)', 'Enfoque: La forma en "V" de la espalda.', 65)
    RETURNING id INTO v_pull_b_id;

    -- LEGS B
    INSERT INTO routines (name, description, estimated_duration)
    VALUES ('DÍA 7: LEGS B (Enfoque Cuádriceps)', 'Enfoque: Piernas grandes y cortes.', 75)
    RETURNING id INTO v_legs_b_id;


    -- =========================================================================
    -- 3. LINK EXERCISES (ROUTINE_EXERCISES)
    -- =========================================================================

    -- PUSH A
    INSERT INTO routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, notes) VALUES
    (v_push_a_id, v_bench_press_id, 0, 3, '6-8', 'Clave: Baja la barra controlando el peso, sube explosivo.'),
    (v_push_a_id, v_incline_db_press_id, 1, 3, '8-10', 'Smart Fit tip: Si las bancas están llenas, usa la máquina de Chest Press Inclinado.'),
    (v_push_a_id, v_overhead_press_id, 2, 3, '8-10', ''),
    (v_push_a_id, v_lat_raises_id, 3, 4, '12-15', 'Clave: Controla la bajada. No uses impulso.'),
    (v_push_a_id, v_dips_id, 4, 3, '8-10', ''),
    (v_push_a_id, v_tricep_pushdown_id, 5, 3, '12-15', '');

    -- PULL A
    INSERT INTO routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, notes) VALUES
    (v_pull_a_id, v_pullups_id, 0, 4, '6-10', 'Dominadas o Jalón al pecho abierto'),
    (v_pull_a_id, v_barbell_row_id, 1, 3, '8-10', 'Smart Fit tip: La máquina de remo con apoyo en el pecho es mejor para proteger tu lumbar'),
    (v_pull_a_id, v_seated_row_id, 2, 3, '10-12', 'Agarre estrecho'),
    (v_pull_a_id, v_face_pull_id, 3, 3, '15', 'Clave: Tira la cuerda hacia tu frente, abriendo los codos.'),
    (v_pull_a_id, v_barbell_curl_id, 4, 3, '8-10', ''),
    (v_pull_a_id, v_incline_curl_id, 5, 2, '10-12', 'Nota: Siéntate en banco inclinado, deja caer los brazos muertos y sube sin mover codos.');

    -- LEGS A
    INSERT INTO routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, notes) VALUES
    (v_legs_a_id, v_squat_id, 0, 3, '6-8', 'Mi ajuste: Si sientes molestias, vete a Hack Squat.'),
    (v_legs_a_id, v_rdl_id, 1, 3, '8-10', 'Clave: Baja solo hasta que sientas el "tirón" en el femoral.'),
    (v_legs_a_id, v_leg_press_id, 2, 3, '10-12', '45 grados'),
    (v_legs_a_id, v_leg_curl_id, 3, 3, '10-12', ''),
    (v_legs_a_id, v_calf_raises_id, 4, 4, '15', '');

    -- PUSH B
    INSERT INTO routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, notes) VALUES
    (v_push_b_id, v_incline_bench_id, 0, 3, '8-10', 'Multipower te da estabilidad para enfocar el pecho alto.'),
    (v_push_b_id, v_peck_deck_id, 1, 3, '12-15', 'O cruce de poleas'),
    (v_push_b_id, v_lat_raises_cable_id, 2, 4, '15', 'Mantén tensión constante.'),
    (v_push_b_id, v_skullcrushers_id, 3, 3, '10-12', ''),
    (v_push_b_id, v_tricep_ext_uni_id, 4, 3, '12-15', 'Para corregir asimetrías.');

    -- PULL B
    INSERT INTO routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, notes) VALUES
    (v_pull_b_id, v_lat_pulldown_id, 0, 3, '10-12', 'Agarre Neutro/Triángulo'),
    (v_pull_b_id, v_machine_row_id, 1, 3, '10-12', 'Unilateral si es posible'),
    (v_pull_b_id, v_pullover_id, 2, 3, '12-15', 'Conecta mente-músculo con dorsales.'),
    (v_pull_b_id, v_reverse_fly_id, 3, 4, '15-20', ''),
    (v_pull_b_id, v_preacher_curl_id, 4, 3, '10-12', ''),
    (v_pull_b_id, v_hammer_curl_id, 5, 3, '10-12', '');

    -- LEGS B
    INSERT INTO routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, notes) VALUES
    (v_legs_b_id, v_hack_squat_id, 0, 3, '8-12', 'Baja profundo. O Sentadilla Goblet.'),
    (v_legs_b_id, v_lunges_id, 1, 3, '10 pasos', 'Usa mancuernas en las manos.'),
    (v_legs_b_id, v_leg_ext_id, 2, 3, '12-15 + Drop', 'Drop set al final: baja peso 50% y al fallo.'),
    (v_legs_b_id, v_seated_leg_curl_id, 3, 3, '12-15', ''),
    (v_legs_b_id, v_seated_calf_id, 4, 4, '15-20', '');

END $$;
