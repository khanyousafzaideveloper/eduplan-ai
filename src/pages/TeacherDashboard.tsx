import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, BookOpen, GraduationCap, ArrowRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const SUBJECTS = ["Mathematics", "Science", "English / Language Arts", "History / Social Studies", "Geography", "Art", "Music", "Physical Education", "Computer Science", "Foreign Language"];
const GRADES = ["Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

export default function TeacherDashboard() {
  const { profile } = useProfile();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingClass, setIsAddingClass] = useState(false);
  
  const [newClassName, setNewClassName] = useState("");
  const [newClassSubject, setNewClassSubject] = useState("");
  const [newClassGrade, setNewClassGrade] = useState("");

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("classes")
      .select("*, class_members(count)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch classes");
    } else {
      setClasses(data || []);
    }
    setLoading(false);
  }

  async function handleAddClass() {
    if (!newClassName || !newClassSubject || !newClassGrade) {
      toast.error("Please fill in all fields");
      return;
    }

    const { error } = await supabase.from("classes").insert({
      name: newClassName,
      subject: newClassSubject as any,
      grade: newClassGrade as any,
      teacher_id: profile?.id,
    });

    if (error) {
      toast.error("Failed to create class");
    } else {
      toast.success("Class created successfully");
      setIsAddingClass(false);
      setNewClassName("");
      fetchClasses();
    }
  }

  async function handleDeleteClass(id: string) {
    if (!confirm("Are you sure you want to delete this class? All members and quizzes will be removed.")) return;
    
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete class");
    } else {
      toast.success("Class deleted");
      fetchClasses();
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your classes and generate lessons.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link to="/planner">
              <BookOpen className="mr-2 h-4 w-4" /> Lesson Planner
            </Link>
          </Button>
          <Dialog open={isAddingClass} onOpenChange={setIsAddingClass}>
            <DialogTrigger asChild>
              <Button className="gradient-hero">
                <Plus className="mr-2 h-4 w-4" /> New Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Class</DialogTitle>
                <DialogDescription>Set up a class to organize your students and quizzes.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Class Name</Label>
                  <Input placeholder="e.g. Morning Math Section A" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={newClassSubject} onValueChange={setNewClassSubject}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select value={newClassGrade} onValueChange={setNewClassGrade}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddingClass(false)}>Cancel</Button>
                <Button className="gradient-hero" onClick={handleAddClass}>Create Class</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : classes.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
          <CardHeader>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>No classes yet</CardTitle>
            <CardDescription>Create your first class to start managing students and quizzes.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => setIsAddingClass(true)}>Add Class</Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <Card key={cls.id} className="group hover:shadow-lg transition-all border-border/50">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{cls.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5" /> {cls.grade} · {cls.subject}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteClass(cls.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" /> {cls.class_members?.[0]?.count || 0} Students
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button asChild className="w-full group-hover:gradient-hero" variant="outline">
                  <Link to={`/class/${cls.id}`}>
                    Manage Class <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
