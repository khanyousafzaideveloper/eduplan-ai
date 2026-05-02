-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create Enums
CREATE TYPE app_role AS ENUM ('teacher', 'student', 'admin');

CREATE TYPE subject_type AS ENUM (
  'Mathematics', 
  'Science', 
  'English / Language Arts', 
  'History / Social Studies', 
  'Geography', 
  'Art', 
  'Music', 
  'Physical Education', 
  'Computer Science', 
  'Foreign Language'
);

CREATE TYPE grade_level AS ENUM (
  'Pre-K', 'Kindergarten', 
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 
  'Grade 11', 'Grade 12'
);

CREATE TYPE exam_board AS ENUM (
  'FBISE', 'BISE Lahore', 'BISE Rawalpindi', 'BISE Multan', 
  'BISE Faisalabad', 'BISE Gujranwala', 'BISE Sargodha', 
  'AKU-EB', 'Punjab Curriculum'
);

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  institute TEXT, -- For teachers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Classes Table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  subject subject_type NOT NULL,
  grade grade_level NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Class Members Table (Many-to-Many)
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT, -- Cached name for easy display
  student_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(class_id, student_id)
);

-- Quizzes Table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subject subject_type NOT NULL,
  grade grade_level NOT NULL,
  board exam_board NOT NULL,
  questions JSONB NOT NULL, -- Array of question objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Past Paper Chunks (pgvector)
CREATE TABLE public.past_paper_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768), -- For text-embedding-004
  metadata JSONB NOT NULL, -- board, subject, grade, year, question_type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS SETTINGS

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_paper_chunks ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Classes Policies
CREATE POLICY "Teachers can manage their own classes" ON public.classes
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students can view classes they belong to" ON public.classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.class_members WHERE class_id = public.classes.id AND student_id = auth.uid())
  );

CREATE POLICY "Admins can view all classes" ON public.classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Class Members Policies
CREATE POLICY "Teachers can manage members of their classes" ON public.class_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = public.class_members.class_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Students can view their own memberships" ON public.class_members
  FOR SELECT USING (student_id = auth.uid());

-- Quizzes Policies
CREATE POLICY "Teachers can manage quizzes for their classes" ON public.quizzes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = public.quizzes.class_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Students can view quizzes for their classes" ON public.quizzes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.class_members WHERE class_id = public.quizzes.class_id AND student_id = auth.uid())
  );

-- Past Paper Chunks Policies
CREATE POLICY "All authenticated users can query past papers" ON public.past_paper_chunks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert/update past papers" ON public.past_paper_chunks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- TRIGGER FOR PROFILE CREATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, institute)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    NEW.email, 
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'),
    NEW.raw_user_meta_data->>'institute'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vector Search Helper
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
