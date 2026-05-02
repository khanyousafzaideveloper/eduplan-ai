import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ClipboardList, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function StudentDashboard() {
  const { profile } = useProfile();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  async function fetchEnrollments() {
    setLoading(true);
    // Fetch classes the student belongs to
    const { data, error } = await supabase
      .from("class_members")
      .select(`
        id,
        classes (
          id,
          name,
          subject,
          grade,
          quizzes (id, title)
        )
      `)
      .eq("student_id", profile?.id);

    if (error) {
      toast.error("Failed to fetch classes");
    } else {
      setEnrollments(data || []);
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">Access your classes and assignments.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : enrollments.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
          <CardHeader>
            <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-secondary" />
            </div>
            <CardTitle>Not enrolled in any classes</CardTitle>
            <CardDescription>Ask your teacher to add you using your email: <span className="font-semibold">{profile?.email}</span></CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((env) => {
            const cls = env.classes;
            return (
              <Card key={env.id} className="hover:shadow-lg transition-all border-border/50">
                <CardHeader>
                  <CardTitle>{cls.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5" /> {cls.grade} · {cls.subject}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClipboardList className="h-4 w-4" /> {cls.quizzes?.length || 0} Quizzes available
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant="outline">
                    <Link to={`/student/class/${cls.id}`}>
                      Open Class <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
