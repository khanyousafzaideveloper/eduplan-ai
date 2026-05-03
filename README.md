# EduPlan AI

EduPlan AI is a modern, full-stack educational platform designed to bridge the gap between teachers and students using the power of Artificial Intelligence. It features robust class management, intelligent board-compliant exam generation, AI-powered lesson planning, and a global context-aware AI chatbot.

## 🌟 Key Features

* **Role-Based Dashboards:** Distinct interfaces for Teachers, Students, and Admins.
* **AI Lesson Planner:** Teachers can generate comprehensive lesson plans, worksheets, and assessment rubrics instantly.
* **Board-Compliant Exam Generation:** Automatically generate past-paper style quizzes (MCQs, Short Questions, Full Papers) tailored to specific educational boards (e.g., Punjab Curriculum, FBISE). The AI natively predicts question importance and probability.
* **Class & Roster Management:** Teachers can create classes and issue unique invite codes for students to join.
* **Global AI Chatbot:** A floating, context-aware AI assistant.
  * *For Teachers:* Acts as a professional teaching assistant for syllabus and grading help.
  * *For Students:* Acts as a personal tutor that guides learning without giving away direct answers.
* **Export Capabilities:** Instantly export generated lesson plans and quizzes to highly formatted, print-ready PDFs.

## 🛠 Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui.
* **Backend & Database:** Supabase (PostgreSQL, Row Level Security, Authentication).
* **Serverless Functions:** Supabase Edge Functions (Deno).
* **AI Engine:** Groq API leveraging `llama-3.1-8b-instant` for ultra-low latency, high-accuracy generative AI capabilities.

---

## 🚀 Local Development Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd eduplan-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Supabase (Local & Cloud)
You will need a Supabase project. Create one at [Supabase](https://supabase.com).

Link your local project to your Supabase cloud project:
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

### 4. Configure Environment Variables
Create a `.env` file in the root of your project and add your Supabase keys:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_ADMIN_EMAIL=admin@eduplan.ai # Email address designated as the system admin
```

### 5. Start the Development Server
```bash
npm run dev
```

---

## 🧠 Setting up the AI (Groq API)

This project uses the Groq API for extremely fast AI generation. You need to configure this secret in your Supabase project so the Edge Functions can access it.

1. Get a free API key from [Groq Console](https://console.groq.com/).
2. Inject the secret into your Supabase project using the CLI:
```bash
npx supabase secrets set GROQ_API_KEY=your_groq_api_key_here
```

## ☁️ Deploying Supabase Edge Functions

EduPlan AI relies on three core Edge Functions located in the `supabase/functions/` directory:
1. `generate-quiz`: Handles intelligent board exam generation.
2. `generate-lesson`: Handles comprehensive lesson plan generation.
3. `chat-assistant`: Powers the global AI tutor/assistant widget.

Whenever you make changes to these functions or set up the project for the first time, you **must deploy them** to your Supabase project:

```bash
npx supabase functions deploy generate-quiz
npx supabase functions deploy generate-lesson
npx supabase functions deploy chat-assistant
```

## 🌍 Production Deployment (Frontend)

The frontend can be easily deployed to any static hosting provider like Vercel, Netlify, or Cloudflare Pages.

**Build Command:**
```bash
npm run build
```

**Publish Directory:**
```
dist
```

*Ensure that you add your `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_ADMIN_EMAIL` to the environment variables of your hosting provider.*

## 🗄️ Database Schema & RLS Setup

When setting up a fresh Supabase project, you must configure Row Level Security (RLS) policies so users can view profiles and students can access classes they are invited to. 

Without these policies, you will encounter `fetch` errors on the dashboard regarding profiles or invitations. 

**Go to the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) and run the following script:**

```sql
-- 1. PROFILES: Let everyone find each other
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Ensure users can insert their own profile from the code
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. CLASSES: Let students see classes they are invited to OR joined
DROP POLICY IF EXISTS "Students can view classes they belong to" ON public.classes;
CREATE POLICY "Students can view classes they belong to" ON public.classes FOR SELECT USING (
    auth.uid() = teacher_id OR 
    EXISTS (SELECT 1 FROM public.class_members WHERE class_id = public.classes.id AND student_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.class_invitations WHERE class_id = public.classes.id AND student_id = auth.uid())
);

-- 3. CLASS MEMBERS: Let students JOIN if they have a pending invite
DROP POLICY IF EXISTS "Students can join if invited" ON public.class_members;
CREATE POLICY "Students can join if invited" ON public.class_members FOR INSERT WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.class_invitations 
        WHERE class_id = public.class_members.class_id 
        AND student_id = auth.uid() 
        AND status = 'pending'
    )
);

DROP POLICY IF EXISTS "Students can view their own memberships" ON public.class_members;
CREATE POLICY "Students can view their own memberships" ON public.class_members FOR SELECT USING (student_id = auth.uid());

-- 4. CLASS INVITATIONS: Standard access
DROP POLICY IF EXISTS "Teachers can manage their invites" ON public.class_invitations;
CREATE POLICY "Teachers can manage their invites" ON public.class_invitations FOR ALL USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view and update their invites" ON public.class_invitations;
CREATE POLICY "Students can view and update their invites" ON public.class_invitations FOR ALL USING (student_id = auth.uid());

-- 5. CLEANUP DEPRECATED TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 6. RELOAD CACHE
NOTIFY pgrst, 'reload schema';
```

## 🔒 Security Notes

* **Row Level Security (RLS):** Supabase RLS is strictly enforced using the script above. Students can only see their enrolled classes, and teachers can only modify classes they own.
* **Edge Function Security:** AI prompts and API keys are completely hidden from the client browser and safely stored in Supabase Secrets.
