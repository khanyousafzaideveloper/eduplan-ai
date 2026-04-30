import { Sparkles, BookOpen, GraduationCap, Lightbulb, Clock, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface PlannerInputs {
  subject: string;
  grade: string;
  topic: string;
  duration: string;
}

export interface SavedPlan {
  id: string;
  title: string;
  inputs: PlannerInputs;
  content: string;
  createdAt: number;
}

const SUBJECTS = ["Mathematics", "Science", "English / Language Arts", "History / Social Studies", "Geography", "Art", "Music", "Physical Education", "Computer Science", "Foreign Language"];
const GRADES = ["Pre-K", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const DURATIONS = ["20 minutes", "30 minutes", "45 minutes", "60 minutes", "90 minutes", "Full day"];

interface Props {
  inputs: PlannerInputs;
  setInputs: (i: PlannerInputs) => void;
  onGenerate: () => void;
  loading: boolean;
  history: SavedPlan[];
  onLoadPlan: (p: SavedPlan) => void;
  onDeletePlan: (id: string) => void;
  activePlanId?: string | null;
}

export function PlannerSidebar({ inputs, setInputs, onGenerate, loading, history, onLoadPlan, onDeletePlan, activePlanId }: Props) {
  const set = (k: keyof PlannerInputs, v: string) => setInputs({ ...inputs, [k]: v });
  const canGenerate = inputs.subject && inputs.grade && inputs.topic.trim() && inputs.duration && !loading;

  return (
    <aside className="w-full md:w-80 lg:w-96 shrink-0 border-r border-border bg-sidebar flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-hero flex items-center justify-center shadow-soft">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground leading-tight">EduPlan AI</h1>
            <p className="text-xs text-muted-foreground">Lesson planning, in seconds</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Subject
            </Label>
            <Select value={inputs.subject} onValueChange={(v) => set("subject", v)}>
              <SelectTrigger><SelectValue placeholder="Choose a subject" /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="h-3.5 w-3.5 text-secondary" /> Grade Level
            </Label>
            <Select value={inputs.grade} onValueChange={(v) => set("grade", v)}>
              <SelectTrigger><SelectValue placeholder="Choose a grade" /></SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-3.5 w-3.5 text-accent" /> Topic
            </Label>
            <Input
              placeholder="e.g. Photosynthesis, Fractions…"
              value={inputs.topic}
              onChange={(e) => set("topic", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-3.5 w-3.5 text-primary" /> Duration
            </Label>
            <Select value={inputs.duration} onValueChange={(v) => set("duration", v)}>
              <SelectTrigger><SelectValue placeholder="How long?" /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={onGenerate}
            disabled={!canGenerate}
            size="lg"
            className="w-full gradient-hero text-primary-foreground shadow-soft hover:shadow-glow transition-smooth border-0 font-semibold"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? "Generating…" : "Generate Lesson"}
          </Button>

          {history.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <History className="h-3.5 w-3.5" /> Recent Plans
                </div>
                <div className="space-y-1.5">
                  {history.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-smooth",
                        activePlanId === p.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/60"
                      )}
                      onClick={() => onLoadPlan(p)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.inputs.grade} · {p.inputs.subject}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeletePlan(p.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-smooth p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete plan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}