-- Create body_weight table
CREATE TABLE IF NOT EXISTS public.body_weight (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    weight_kg DECIMAL(5, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.body_weight ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weight logs"
    ON public.body_weight FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight logs"
    ON public.body_weight FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight logs"
    ON public.body_weight FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight logs"
    ON public.body_weight FOR DELETE
    USING (auth.uid() = user_id);
