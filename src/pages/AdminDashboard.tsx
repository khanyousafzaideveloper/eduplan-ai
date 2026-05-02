import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Upload, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const BOARDS = ["FBISE", "BISE Lahore", "BISE Rawalpindi", "BISE Multan", "BISE Faisalabad", "BISE Gujranwala", "BISE Sargodha", "AKU-EB", "Punjab Curriculum"];
const SUBJECTS = ["Mathematics", "Science", "English / Language Arts", "History / Social Studies", "Geography", "Art", "Music", "Physical Education", "Computer Science", "Foreign Language"];
const GRADES = ["Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

export default function AdminDashboard() {
  const [ingesting, setIngesting] = useState(false);
  const [rawText, setRawText] = useState("");
  const [board, setBoard] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  async function handleIngest() {
    if (!rawText || !board || !subject || !grade) {
      toast.error("Please fill in all metadata fields and provide past paper text");
      return;
    }

    setIngesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-past-paper", {
        body: {
          content: rawText,
          metadata: { board, subject, grade, year, type: "past-paper" }
        }
      });

      if (error) throw error;

      toast.success(`Successfully ingested ${data.chunks} chunks of data.`);
      setRawText("");
    } catch (err: any) {
      toast.error(err.message || "Ingestion failed");
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Knowledge Base</h1>
        <p className="text-muted-foreground">Ingest past paper data into the pgvector knowledge base.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Ingest New Past Paper
          </CardTitle>
          <CardDescription>
            This will chunk the text and generate embeddings for the RAG-based quiz generator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Board</Label>
              <Select value={board} onValueChange={setBoard}>
                <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
                <SelectContent>
                  {BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Past Paper Content (Raw Text)</Label>
            <Textarea 
              placeholder="Paste the raw text of the past paper here..." 
              className="min-h-[300px] font-mono text-xs"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-3.5 w-3.5" /> Using text-embedding-004
          </div>
          <Button className="gradient-hero px-8" onClick={handleIngest} disabled={ingesting}>
            {ingesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Start Ingestion
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
