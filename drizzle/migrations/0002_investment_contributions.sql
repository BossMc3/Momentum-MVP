CREATE TABLE public.investment_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  statement_id uuid NOT NULL UNIQUE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.investment_contributions TO authenticated;
GRANT ALL ON public.investment_contributions TO service_role;
ALTER TABLE public.investment_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contributions read" ON public.investment_contributions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own contributions insert" ON public.investment_contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.statement_analyses s WHERE s.id = statement_id AND s.user_id = auth.uid()));