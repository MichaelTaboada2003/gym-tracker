-- Migration: 001_create_exercises
-- Description: Creates the exercises table for storing exercise definitions

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    equipment TEXT DEFAULT 'bodyweight',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX idx_exercises_name ON exercises(name);

-- Insert some default exercises
INSERT INTO exercises (name, muscle_group, equipment) VALUES
    ('Press Banca', 'Pecho', 'barbell'),
    ('Press Inclinado', 'Pecho', 'barbell'),
    ('Aperturas', 'Pecho', 'dumbbell'),
    ('Sentadilla', 'Piernas', 'barbell'),
    ('Peso Muerto', 'Espalda', 'barbell'),
    ('Peso Muerto Rumano', 'Piernas', 'barbell'),
    ('Prensa de Piernas', 'Piernas', 'machine'),
    ('Extensión de Cuádriceps', 'Piernas', 'machine'),
    ('Curl Femoral', 'Piernas', 'machine'),
    ('Dominadas', 'Espalda', 'bodyweight'),
    ('Remo con Barra', 'Espalda', 'barbell'),
    ('Jalón al Pecho', 'Espalda', 'cable'),
    ('Press Militar', 'Hombros', 'barbell'),
    ('Elevaciones Laterales', 'Hombros', 'dumbbell'),
    ('Face Pull', 'Hombros', 'cable'),
    ('Curl Bíceps con Barra', 'Bíceps', 'barbell'),
    ('Curl Bíceps con Mancuerna', 'Bíceps', 'dumbbell'),
    ('Curl Martillo', 'Bíceps', 'dumbbell'),
    ('Press Francés', 'Tríceps', 'barbell'),
    ('Extensión de Tríceps', 'Tríceps', 'cable'),
    ('Fondos', 'Tríceps', 'bodyweight'),
    ('Plancha', 'Core', 'bodyweight'),
    ('Crunch', 'Core', 'bodyweight'),
    ('Rueda Abdominal', 'Core', 'bodyweight');
