import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  GraduationCap, 
  ClipboardList, 
  ArrowLeft, 
  Loader2, 
  PlayCircle, 
  FileDown,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function StudentClassDetails() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [cls, setCls] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classId && profile?.id) {
      fetchData();
    }
  }, [classId, profile?.id]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch Class Info
      const { data: clsData, error: clsError } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single();
      
      if (clsError) throw clsError;

      // 2. Fetch Quizzes
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      // 3. Fetch Submissions (to show scores)
      const { data: subData } = await supabase
        .from("quiz_submissions")
        .select("*")
        .eq("student_id", profile?.id);

      setCls(clsData);
      setQuizzes(quizData || []);
      setSubmissions(subData || []);
    } catch (error: any) {
      toast.error("Error loading class: " + error.message);
      navigate("/student");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <Button variant="ghost" onClick={() => navigate("/student")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">{cls?.name}</h1>
            <Badge variant="secondary" className="px-3 py-1">{cls?.grade}</Badge>
          </div>
          <p className="text-muted-foreground text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> {cls?.subject}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Available Quizzes
          </h2>
        </div>

        {quizzes.length === 0 ? (
          <Card className="border-dashed py-12 text-center">
            <p className="text-muted-foreground">No quizzes have been assigned to this class yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {quizzes.map((quiz) => {
              const submission = submissions.find(s => s.quiz_id === quiz.id);
              const qData = quiz.questions;
              let totalQuestions = 0;
              if (Array.isArray(qData)) {
                totalQuestions = qData.length;
              } else if (qData.sections && Array.isArray(qData.sections)) {
                totalQuestions = qData.sections.reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0);
              } else if (qData.questions && Array.isArray(qData.questions)) {
                totalQuestions = qData.questions.length;
              }

              return (
                <Card key={quiz.id} className="group hover:border-primary/30 transition-all overflow-hidden border-border/50">
                  <div className="flex flex-col md:flex-row items-center p-6 gap-6">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ClipboardList className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-bold text-lg">{quiz.title}</h3>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{totalQuestions} Questions</span>
                        <span>•</span>
                        <span>{quiz.board}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      {submission ? (
                        <div className="flex items-center gap-4 bg-green-500/10 text-green-600 px-4 py-2 rounded-lg border border-green-500/20">
                          <CheckCircle2 className="h-5 w-5" />
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-wider">Score</p>
                            <p className="font-bold text-lg">{submission.score}/{submission.total_questions}</p>
                          </div>
                        </div>
                      ) : (
                          <Button asChild variant="outline" size="sm" className="w-full">
                            <Link to={`/quiz/print/${quiz.id}`}>
                              <FileDown className="mr-2 h-4 w-4" /> PDF / Print
                            </Link>
                          </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
