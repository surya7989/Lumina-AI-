-- Run this entire script in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- This creates all tables for the AI Learning Platform

-- ========== CLEANUP (Resets the schema to avoid "already exists" errors) ==========
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS chat_histories CASCADE;
DROP TABLE IF EXISTS quiz_results CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS quiz_categories CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS workspace_requests CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ========== TABLES ==========

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('superadmin', 'admin', 'student')),
  workspace_id UUID,
  status TEXT DEFAULT 'active',
  phone TEXT,
  organization_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  organization_email TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  phone TEXT NOT NULL,
  number_of_students INT NOT NULL,
  address TEXT NOT NULL,
  logo TEXT,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  admin_id UUID REFERENCES profiles(id),
  workspace_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  admin_id UUID,
  logo TEXT,
  address TEXT,
  phone TEXT,
  total_students INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD CONSTRAINT fk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE workspace_requests ADD CONSTRAINT fk_workspace_req FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE TABLE quiz_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INT NOT NULL,
  category_id UUID NOT NULL REFERENCES quiz_categories(id) ON DELETE CASCADE,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  explanation TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES quiz_categories(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]',
  time_taken INT,
  percentage FLOAT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_type TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  messages JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  duration INT,
  participants JSONB DEFAULT '[]',
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed')),
  meeting_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== INDEXES ==========
CREATE INDEX idx_students_workspace ON students(workspace_id);
CREATE INDEX idx_quiz_results_student ON quiz_results(student_id);
CREATE INDEX idx_quiz_results_workspace ON quiz_results(workspace_id);
CREATE INDEX idx_chat_histories_user ON chat_histories(user_id);
CREATE INDEX idx_chat_histories_workspace ON chat_histories(workspace_id);
CREATE INDEX idx_meetings_workspace ON meetings(workspace_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_questions_category ON questions(category_id);

-- ========== SECURITY DEFINER FUNCTIONS (avoid RLS recursion) ==========

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()::uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM public.profiles WHERE id = auth.uid()::uuid;
$$;

-- ========== AUTO-CREATE PROFILE ON SIGNUP ==========

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========== ROW LEVEL SECURITY ==========

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid()::uuid);
CREATE POLICY "Superadmin can read all profiles" ON profiles
  FOR SELECT USING (public.get_user_role() = 'superadmin');
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid()::uuid);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid()::uuid);

-- Workspaces
CREATE POLICY "Members can read their workspace" ON workspaces
  FOR SELECT USING (public.get_user_workspace_id() = id::uuid OR public.get_user_role() = 'superadmin');
CREATE POLICY "Superadmin can manage workspaces" ON workspaces
  FOR ALL USING (public.get_user_role() = 'superadmin');

-- Students
CREATE POLICY "Admins can manage students" ON students
  FOR ALL USING (public.get_user_workspace_id() = workspace_id::uuid AND public.get_user_role() IN ('admin', 'superadmin'));
CREATE POLICY "Students can read own" ON students
  FOR SELECT USING (id::text = auth.uid()::text);
CREATE POLICY "Allow public select students for login" ON students
  FOR SELECT USING (true);

-- Workspace requests
CREATE POLICY "Superadmin can manage requests" ON workspace_requests
  FOR ALL USING (public.get_user_role() = 'superadmin');
CREATE POLICY "Anyone can create requests" ON workspace_requests
  FOR INSERT WITH CHECK (true);

-- Quiz categories
CREATE POLICY "Anyone can read categories" ON quiz_categories
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON quiz_categories
  FOR ALL USING (public.get_user_role() IN ('admin', 'superadmin'));

-- Questions
CREATE POLICY "Anyone can read questions" ON questions
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage questions" ON questions
  FOR ALL USING (public.get_user_role() IN ('admin', 'superadmin'));

-- Quiz results
CREATE POLICY "Students can read own results" ON quiz_results
  FOR SELECT USING (EXISTS (SELECT 1 FROM students WHERE students.id = quiz_results.student_id AND students.id::text = auth.uid()::text));
CREATE POLICY "Admins can read workspace results" ON quiz_results
  FOR SELECT USING (public.get_user_workspace_id() = workspace_id::uuid AND public.get_user_role() IN ('admin', 'superadmin'));
CREATE POLICY "Students can insert results" ON quiz_results
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select results" ON quiz_results
  FOR SELECT USING (true);

-- Chat histories
CREATE POLICY "Users can manage own chats" ON chat_histories
  FOR ALL USING (user_id = auth.uid()::uuid);
CREATE POLICY "Allow public manage chats" ON chat_histories
  FOR ALL USING (true);

-- Meetings
CREATE POLICY "Members can read meetings" ON meetings
  FOR SELECT USING (public.get_user_workspace_id() = workspace_id::uuid);
CREATE POLICY "Admins can manage meetings" ON meetings
  FOR ALL USING (public.get_user_workspace_id() = workspace_id::uuid AND public.get_user_role() IN ('admin', 'superadmin'));
CREATE POLICY "Allow public select meetings" ON meetings
  FOR SELECT USING (true);

-- Notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid()::uuid);
