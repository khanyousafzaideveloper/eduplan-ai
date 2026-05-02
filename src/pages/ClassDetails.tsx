import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, BookOpen, GraduationCap, ClipboardList, Plus, Loader2, Sparkles, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";

export default function ClassDetails() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Student State
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");

  // Generate Quiz State
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizBoard, setQuizBoard] = useState("Punjab Curriculum");
  const [quizCount, setQuizCount] = useState("5");

  useEffect(() => {
    fetchData();
  }, [classId]);

  async function fetchData() {
    setLoading(true);
    const { data: clsData } = await supabase.from("classes").select("*").eq("id", classId).single();
    const { data: memData } = await supabase.from("class_members").select("*").eq("class_id", classId);
    const { data: quizData } = await supabase.from("quizzes").select("*").eq("class_id", classId).order("created_at", { ascending: false });

    setCls(clsData);
    setMembers(memData || []);
    setQuizzes(quizData || []);
    setLoading(false);
  }

  async function handleAddStudent() {
    if (!studentEmail) {
      toast.error("Student email is required");
      return;
    }

    // In a real app, we'd check if the student exists in auth.users first.
    // For this simulation, we'll try to find a profile with that email.
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", studentEmail).single();

    if (!profile) {
      toast.error("Student not found. They must sign up first.");
      return;
    }

    const { error } = await supabase.from("class_members").insert({
      class_id: classId,
      student_id: profile.id,
      student_name: studentName,
      student_email: studentEmail
    });

    if (error) {
      if (error.code === '23505') toast.error("Student is already in this class");
      else toast.error("Failed to add student");
    } else {
      toast.success("Student added successfully");
      setIsAddingStudent(false);
      setStudentEmail("");
      setStudentName("");
      fetchData();
    }
  }

  async function handleGenerateQuiz() {
    setIsGeneratingQuiz(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          subject: cls.subject,
          grade: cls.grade,
          board: quizBoard,
          count: parseInt(quizCount)
        }
      });

      if (error) throw error;

      // Save quiz to DB
      const { error: saveError } = await supabase.from("quizzes").insert({
        class_id: classId,
        title: `${cls.subject} Quiz - ${quizBoard}`,
        subject: cls.subject,
        grade: cls.grade,
        board: quizBoard as any,
        questions: data.questions
      });

      if (saveError) throw saveError;

      toast.success("Quiz generated and shared with class!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quiz");
    } finally {
      setIsGeneratingQuiz(false);
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!cls) return <div className="p-8">Class not found</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <BookOpen className="h-4 w-4" /> {cls.subject} · <GraduationCap className="h-4 w-4 ml-2" /> {cls.grade}
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{cls.name}</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddingStudent} onOpenChange={setIsAddingStudent}>
            <DialogTrigger asChild>
              <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Student to Class</DialogTitle>
                <DialogDescription>Enter the student's details. They must already have an account.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Student Email</Label>
                  <Input type="email" placeholder="student@edu.com" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Student Name (Internal Display)</Label>
                  <Input placeholder="John Doe" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddingStudent(false)}>Cancel</Button>
                <Button className="gradient-hero" onClick={handleAddStudent}>Add Student</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button className="gradient-hero" onClick={handleGenerateQuiz} disabled={isGeneratingQuiz}>
            {isGeneratingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            AI Generate Quiz
          </Button>
        </div>
      </div>

      <Tabs defaultValue="quizzes" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2">
          <TabsTrigger value="quizzes"><ClipboardList className="mr-2 h-4 w-4" /> Quizzes ({quizzes.length})</TabsTrigger>
          <TabsTrigger value="students"><Users className="mr-2 h-4 w-4" /> Students ({members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  <CardDescription>Board: {quiz.board} · {quiz.questions.length} Questions</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">View Questions</Button>
                </CardFooter>
              </Card>
            ))}
            {quizzes.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No quizzes generated yet. Click "AI Generate Quiz" to start.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrolled At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((mem) => (
                  <TableRow key={mem.id}>
                    <TableCell className="font-medium">{mem.student_name}</TableCell>
                    <TableCell className="text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3" /> {mem.student_email}</TableCell>
                    <TableCell>{new Date(mem.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No students added to this class yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
