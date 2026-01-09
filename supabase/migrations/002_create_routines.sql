-- Migration: 002_create_routines
-- Description: Creates the routines table for storing workout templates

CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    estimated_duration INT DEFAULT 60, -- in minutes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_routines_updated_at
    BEFORE UPDATE ON routines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
