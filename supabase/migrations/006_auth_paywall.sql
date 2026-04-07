-- Migration 006: Auth + Paywall tables
-- users, idea_details, generation_log

-- users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro')),
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own" ON users FOR SELECT USING (auth.uid() = id);

-- Reuse existing trigger function (defined in 001_initial_schema.sql)
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- idea_details table
CREATE TABLE idea_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  package_json jsonb,
  generated_by uuid REFERENCES users(id),
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE idea_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "idea_details_pro_read" ON idea_details
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND subscription_status = 'pro')
  );
-- INSERT via service role in the generate API route (bypasses RLS)

-- generation_log table
CREATE TABLE generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_generation_log_user_date ON generation_log (user_id, generated_at DESC);

ALTER TABLE generation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gen_log_own" ON generation_log FOR SELECT USING (auth.uid() = user_id);
-- INSERT via service role in the generate API route (bypasses RLS)
