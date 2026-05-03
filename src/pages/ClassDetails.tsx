import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, BookOpen, GraduationCap, ClipboardList, Plus, Loader2, Sparkles, Trash2, Mail, Users, Printer } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClassDetails() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { profile: teacherProfile } = useProfile();
  const [cls, setCls] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Student State
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");

  // Generate Quiz State
  const [isConfiguringQuiz, setIsConfiguringQuiz] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizBoard, setQuizBoard] = useState("Punjab Curriculum");
  const [quizType, setQuizType] = useState("MCQs");
  const [quizCount, setQuizCount] = useState("5");

  useEffect(() => {
    fetchData();
  }, [classId]);

  async function fetchData() {
    setLoading(true);
    const { data: clsData } = await supabase.from("classes").select("*").eq("id", classId).single();
    const { data: memData } = await supabase.from("class_members").select("*").eq("class_id", classId);
    const { data: quizData } = await supabase.from("quizzes").select("*").eq("class_id", classId).order("created_at", { ascending: false });
    const { data: inviteData } = await supabase.from("class_invitations").select("*").eq("class_id", classId).eq("status", "pending");

    setCls(clsData);
    setMembers(memData || []);
    setQuizzes(quizData || []);
    setPendingInvites(inviteData || []);
    setLoading(false);
  }

  async function handleAddStudent() {
    if (!studentEmail) {
      toast.error("Student email is required");
      return;
    }

    // 1. Find student profile
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("id, role, institute, grade, full_name")
      .ilike("email", studentEmail.trim())
      .single();

    if (!studentProfile || studentProfile.role !== "student") {
      toast.error("Student not found or unavailable for this class.");
      return;
    }

    // 2. Privacy & Institute Check
    if (studentProfile.institute !== teacherProfile?.institute) {
      // Don't reveal their school, just say they can't be added
      toast.error("Privacy Alert: This student belongs to a different institute and cannot be invited to this class.");
      return;
    }

    // 3. Grade Check
    if (studentProfile.grade !== cls.grade) {
      toast.error(`Grade Mismatch: This class is for ${cls.grade}, but the student is in ${studentProfile.grade || 'unspecified grade'}.`);
      return;
    }

    // 4. Check if already a member or already has a pending invite
    const isMember = members.some(m => m.student_email === studentEmail);
    const hasInvite = pendingInvites.some(i => i.student_id === studentProfile.id);

    if (isMember) {
      toast.error("Student is already a member of this class.");
      return;
    }

    if (hasInvite) {
      toast.error("An invitation has already been sent to this student.");
      return;
    }

    // 5. Create Invitation
    const { error } = await supabase.from("class_invitations").insert({
      class_id: classId,
      teacher_id: teacherProfile?.id,
      student_id: studentProfile.id,
      status: "pending"
    });

    if (error) {
      toast.error("Failed to send invitation: " + error.message);
    } else {
      toast.success(`Invitation sent to ${studentProfile.full_name}!`);
      setIsAddingStudent(false);
      setStudentEmail("");
      setStudentName("");
      fetchData();
    }
  }

  async function handleGenerateQuiz() {
    if (!cls) return;
    setIsGeneratingQuiz(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          subject: cls.subject,
          grade: cls.grade,
          board: quizBoard,
          type: quizType,
          count: parseInt(quizCount)
        }
      });

      if (error) throw error;
      
      // Check for AI-level errors returned with 200 OK
      if (data.error) {
        throw new Error(data.error);
      }

      // Save quiz to DB
      const { error: saveError } = await supabase.from("quizzes").insert({
        class_id: classId,
        title: `${cls.subject} ${quizType} - ${quizBoard}`,
        subject: cls.subject,
        grade: cls.grade,
        board: quizBoard as any,
        questions: data // Save the whole object (contains questions or sections)
      });

      if (saveError) throw saveError;

      toast.success(`${quizType} generated and shared with class!`);
      setIsConfiguringQuiz(false);
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

          <Dialog open={isConfiguringQuiz} onOpenChange={setIsConfiguringQuiz}>
            <DialogTrigger asChild>
              <Button className="gradient-hero">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Generate Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configure AI Quiz</DialogTitle>
                <DialogDescription>Generate a customized quiz for {cls.subject} ({cls.grade}).</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Subject (Locked)</Label>
                    <div className="h-10 px-3 py-2 rounded-md bg-muted text-sm font-medium border border-border/50 flex items-center">
                      {cls.subject}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Grade (Locked)</Label>
                    <div className="h-10 px-3 py-2 rounded-md bg-muted text-sm font-medium border border-border/50 flex items-center">
                      {cls.grade}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Exam Board</Label>
                  <Select value={quizBoard} onValueChange={setQuizBoard}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select board" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FBISE">FBISE (Federal)</SelectItem>
                      <SelectItem value="BISE Lahore">BISE Lahore</SelectItem>
                      <SelectItem value="Punjab Curriculum">Punjab Curriculum</SelectItem>
                      <SelectItem value="AKU-EB">AKU-EB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quiz Type</Label>
                  <Select value={quizType} onValueChange={setQuizType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQs">Multiple Choice (MCQs)</SelectItem>
                      <SelectItem value="Short Questions">Short Questions</SelectItem>
                      <SelectItem value="True/False">True / False</SelectItem>
                      {(() => {
                        const gradeMatch = cls?.grade.match(/\d+/);
                        const gradeNum = gradeMatch ? parseInt(gradeMatch[0], 10) : 10;
                        if (gradeNum >= 9) {
                          return <SelectItem value="Full Paper">Full Paper (Sections A, B, C)</SelectItem>;
                        }
                        return null;
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Number of Questions</Label>
                  <Input type="number" min="1" max="20" value={quizCount} onChange={(e) => setQuizCount(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsConfiguringQuiz(false)}>Cancel</Button>
                <Button className="gradient-hero min-w-[140px]" onClick={handleGenerateQuiz} disabled={isGeneratingQuiz}>
                  {isGeneratingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate Quiz
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="quizzes" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2">
          <TabsTrigger value="quizzes"><ClipboardList className="mr-2 h-4 w-4" /> Quizzes ({quizzes.length})</TabsTrigger>
          <TabsTrigger value="students"><Users className="mr-2 h-4 w-4" /> Students ({members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => {
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
                <Card key={quiz.id} className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    <CardDescription>
                      Board: {quiz.board} · {totalQuestions} Questions
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="gap-2">
                    <Button asChild variant="secondary" size="sm" className="w-full">
                      <Link to={`/quiz/print/${quiz.id}`}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
            {quizzes.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No quizzes generated yet. Click "AI Generate Quiz" to start.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="students" className="mt-6 space-y-6">
          {pendingInvites.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Pending Invitations ({pendingInvites.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> 
                        Waiting for response...
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive h-7 px-2">Cancel</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
