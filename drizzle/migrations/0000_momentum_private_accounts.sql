CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 100)
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_own ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE FUNCTION public.create_momentum_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles(id, display_name) VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''),100)); RETURN NEW; END; $$;
CREATE TRIGGER momentum_profile_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_momentum_profile();
CREATE TABLE public.statement_analyses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 file_name text NOT NULL CHECK (char_length(file_name) <= 255),
 fingerprint text NOT NULL,
 analysis jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, fingerprint)
);
GRANT SELECT, INSERT, DELETE ON public.statement_analyses TO authenticated;
GRANT ALL ON public.statement_analyses TO service_role;
ALTER TABLE public.statement_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY analyses_read ON public.statement_analyses FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY analyses_insert ON public.statement_analyses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY analyses_delete ON public.statement_analyses FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX analyses_owner_date ON public.statement_analyses(user_id, created_at DESC);
CREATE TABLE public.momentum_progress (
 user_id uuid PRIMARY KEY,
 state jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.momentum_progress TO authenticated;
GRANT ALL ON public.momentum_progress TO service_role;
ALTER TABLE public.momentum_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY progress_own ON public.momentum_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());