import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ClipboardList, BookOpen, ArrowRight, Loader2, Mail, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function StudentDashboard() {
  const { profile } = useProfile();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
    fetchInvites();
  }, [profile?.id]);

  async function fetchEnrollments() {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }

  async function fetchInvites() {
    const { data } = await supabase
      .from("class_invitations")
      .select("id")
      .eq("student_id", profile?.id)
      .eq("status", "pending");
    
    setPendingInvites(data || []);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Student Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">Welcome back, {profile?.full_name}</p>
        </div>

        <div className="flex gap-4">
          <Card className="bg-muted/30 border-border/50 py-2 px-6 flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Institute</p>
              <p className="font-medium">{profile?.institute || "Not Set"}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          </Card>
          <Card className="bg-muted/30 border-border/50 py-2 px-6 flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Grade</p>
              <p className="font-medium">{profile?.grade || "Not Set"}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-secondary" />
            </div>
          </Card>
        </div>
      </div>

      {!profile?.institute && (
        <Card className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Complete your profile</h3>
                <p className="text-sm text-muted-foreground">Please select your school or college to see relevant quizzes.</p>
              </div>
            </div>
            <Button asChild variant="default">
              <Link to="/settings">Complete Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {pendingInvites.length > 0 && (
        <Card className="border-primary/30 bg-primary/10 shadow-lg shadow-primary/5 animate-pulse-subtle">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">New Class Invitation!</h3>
                <p className="text-muted-foreground">You have {pendingInvites.length} pending {pendingInvites.length === 1 ? 'invitation' : 'invitations'} to join a class.</p>
              </div>
            </div>
            <Button asChild variant="default" className="gradient-hero">
              <Link to="/student/invitations">View Invitations</Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
