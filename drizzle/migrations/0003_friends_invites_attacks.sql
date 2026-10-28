ALTER TABLE public.profiles ADD COLUMN invite_code text NOT NULL DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
CREATE UNIQUE INDEX profiles_invite_code_key ON public.profiles(invite_code);

CREATE TABLE public.friendships (
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);
GRANT SELECT ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY friendships_read ON public.friendships FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.referrals (
  invitee_id uuid PRIMARY KEY,
  inviter_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY referrals_read ON public.referrals FOR SELECT TO authenticated USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE TABLE public.point_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.point_grants TO authenticated;
GRANT ALL ON public.point_grants TO service_role;
ALTER TABLE public.point_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY point_grants_read ON public.point_grants FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.attacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id uuid NOT NULL,
  victim_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('meteor','banana')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.attacks TO authenticated;
GRANT ALL ON public.attacks TO service_role;
ALTER TABLE public.attacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY attacks_read ON public.attacks FOR SELECT TO authenticated USING (attacker_id = auth.uid() OR victim_id = auth.uid());