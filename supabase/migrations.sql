-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Enums safely
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('teacher', 'student', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subject_type') THEN
        CREATE TYPE subject_type AS ENUM (
            'Mathematics', 'Science', 'English / Language Arts', 'History / Social Studies', 
            'Geography', 'Art', 'Music', 'Physical Education', 'Computer Science', 'Foreign Language'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grade_level') THEN
        CREATE TYPE grade_level AS ENUM (
            'Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 
            'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_board') THEN
        CREATE TYPE exam_board AS ENUM (
            'FBISE', 'BISE Lahore', 'BISE Rawalpindi', 'BISE Multan', 'BISE Faisalabad', 
            'BISE Gujranwala', 'BISE Sargodha', 'AKU-EB', 'Punjab Curriculum'
        );
    END IF;
END $$;

-- 3. Create Tables safely
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  institute TEXT,
  grade grade_level,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  subject subject_type NOT NULL,
  grade grade_level NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT,
  student_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(class_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subject subject_type NOT NULL,
  grade grade_level NOT NULL,
  board exam_board NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.past_paper_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_paper_chunks ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Drop if exists to ensure updates)
-- 5. Helper Functions to break recursion
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(class_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.classes 
    WHERE id = class_uuid AND teacher_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_student_of_class(class_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.class_members 
    WHERE class_id = class_uuid AND student_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Policies (Drop if exists to ensure updates)
DO $$ BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
    CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

    -- Classes
    DROP POLICY IF EXISTS "Teachers can manage their own classes" ON public.classes;
    CREATE POLICY "Teachers can manage their own classes" ON public.classes FOR ALL USING (teacher_id = auth.uid());
    
    DROP POLICY IF EXISTS "Students can view classes they belong to" ON public.classes;
    CREATE POLICY "Students can view classes they belong to" ON public.classes FOR SELECT USING (
        public.is_student_of_class(id)
    );

    -- Class Members
    DROP POLICY IF EXISTS "Teachers can manage members of their classes" ON public.class_members;
    CREATE POLICY "Teachers can manage members of their classes" ON public.class_members FOR ALL USING (
        public.is_teacher_of_class(class_id)
    );

    DROP POLICY IF EXISTS "Students can view their own memberships" ON public.class_members;
    CREATE POLICY "Students can view their own memberships" ON public.class_members FOR SELECT USING (student_id = auth.uid());

    -- Quizzes
    DROP POLICY IF EXISTS "Teachers can manage quizzes for their classes" ON public.quizzes;
    CREATE POLICY "Teachers can manage quizzes for their classes" ON public.quizzes FOR ALL USING (
        public.is_teacher_of_class(class_id)
    );
    
    DROP POLICY IF EXISTS "Students can view quizzes for their classes" ON public.quizzes;
    CREATE POLICY "Students can view quizzes for their classes" ON public.quizzes FOR SELECT USING (
        public.is_student_of_class(class_id)
    );

    -- Past Papers
    DROP POLICY IF EXISTS "All authenticated users can query past papers" ON public.past_paper_chunks;
    CREATE POLICY "All authenticated users can query past papers" ON public.past_paper_chunks FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Only admins can insert/update past papers" ON public.past_paper_chunks;
    CREATE POLICY "Only admins can insert/update past papers" ON public.past_paper_chunks FOR ALL USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
END $$;

-- 6. Trigger Function (Always replace)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  provided_role TEXT;
BEGIN
  provided_role := NEW.raw_user_meta_data->>'role';
  
  INSERT INTO public.profiles (id, full_name, email, role, institute)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    NEW.email, 
    CASE 
      WHEN provided_role = 'teacher' THEN 'teacher'::public.app_role
      WHEN provided_role = 'admin' THEN 'admin'::public.app_role
      ELSE 'student'::public.app_role
    END,
    NEW.raw_user_meta_data->>'institute'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    institute = EXCLUDED.institute;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Vector Search Helper (Always replace)
CREATE OR REPLACE FUNCTION match_chunks (
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.content,
    pc.metadata,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM public.past_paper_chunks pc
  WHERE 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 8. Class Invitations
CREATE TABLE IF NOT EXISTS public.class_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(class_id, student_id)
);

ALTER TABLE public.class_invitations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Teachers can manage their invites" ON public.class_invitations;
    CREATE POLICY "Teachers can manage their invites" ON public.class_invitations FOR ALL USING (teacher_id = auth.uid());

    DROP POLICY IF EXISTS "Students can view and update their invites" ON public.class_invitations;
    CREATE POLICY "Students can view and update their invites" ON public.class_invitations FOR ALL USING (student_id = auth.uid());
END $$;


-- 9. Quiz Submissions
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score FLOAT NOT NULL,
  total_questions INT NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

DO  BEGIN
    DROP POLICY IF EXISTS 'Students can manage their own submissions' ON public.quiz_submissions;
    CREATE POLICY 'Students can manage their own submissions' ON public.quiz_submissions FOR ALL USING (student_id = auth.uid());

    DROP POLICY IF EXISTS 'Teachers can view submissions for their quizzes' ON public.quiz_submissions;
    CREATE POLICY 'Teachers can view submissions for their quizzes' ON public.quiz_submissions FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.quizzes q
            JOIN public.classes c ON q.class_id = c.id
            WHERE q.id = public.quiz_submissions.quiz_id AND c.teacher_id = auth.uid()
        )
    );
END ;
