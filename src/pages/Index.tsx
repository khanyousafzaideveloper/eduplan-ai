import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Download, Send, Loader2, Sparkles, FileText, ClipboardList, Gamepad2, Layers } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { PlannerSidebar, type PlannerInputs, type SavedPlan } from "@/components/PlannerSidebar";
import { LessonOutput } from "@/components/LessonOutput";
import { streamChat, type Msg } from "@/lib/streamChat";

const STORAGE_KEY = "eduplan.history.v1";

export default function Index() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [inputs, setInputs] = useState<PlannerInputs>({ subject: "", grade: "", topic: "", duration: "" });
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("full");
  const [history, setHistory] = useState<SavedPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<Msg[]>([]);
  const [refineInput, setRefineInput] = useState("");
  const exportRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const persistHistory = (list: SavedPlan[]) => {
    setHistory(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  const buildInitialPrompt = () =>
    `Create a complete lesson package for the following:\n\n- **Subject:** ${inputs.subject}\n- **Grade:** ${inputs.grade}\n- **Topic:** ${inputs.topic}\n- **Duration:** ${inputs.duration}\n\nFollow the standard structure: Lesson Plan, Worksheet, Activities & Games, Differentiation, and Assessment Suggestions.`;

  const runStream = async (msgs: Msg[]) => {
    setLoading(true);
    setContent("");
    let assembled = "";
    await streamChat({
      messages: msgs,
      onDelta: (chunk) => {
        assembled += chunk;
        setContent(assembled);
      },
      onDone: () => {
        setLoading(false);
        const finalMsgs: Msg[] = [...msgs, { role: "assistant", content: assembled }];
        setChatMessages(finalMsgs);
        savePlan(assembled);
      },
      onError: ({ status, message }) => {
        setLoading(false);
        if (status === 429) toast.error("Rate limit reached. Please wait a moment and try again.");
        else if (status === 402) toast.error("AI credits exhausted. Add credits in Workspace settings.");
        else toast.error(message || "Generation failed");
      },
    });
  };

  const savePlan = (text: string) => {
    if (!text.trim()) return;
    const id = activePlanId ?? crypto.randomUUID();
    const title = `${inputs.topic} — ${inputs.grade}`;
    const entry: SavedPlan = { id, title, inputs, content: text, createdAt: Date.now() };
    const others = history.filter((p) => p.id !== id);
    persistHistory([entry, ...others].slice(0, 30));
    setActivePlanId(id);
  };

  const handleGenerate = async () => {
    setActivePlanId(null);
    const prompt = buildInitialPrompt();
    const msgs: Msg[] = [{ role: "user", content: prompt }];
    await runStream(msgs);
  };

  const handleRefine = async () => {
    if (!refineInput.trim() || loading || !content) return;
    const msgs: Msg[] = [...chatMessages, { role: "user", content: refineInput.trim() }];
    setRefineInput("");
    await runStream(msgs);
  };

  const loadPlan = (p: SavedPlan) => {
    setInputs(p.inputs);
    setContent(p.content);
    setActivePlanId(p.id);
    setChatMessages([
      { role: "user", content: `Create a complete lesson package for ${p.inputs.topic} (${p.inputs.grade}, ${p.inputs.subject}, ${p.inputs.duration}).` },
      { role: "assistant", content: p.content },
    ]);
    setActiveTab("full");
  };

  const deletePlan = (id: string) => {
    persistHistory(history.filter((p) => p.id !== id));
    if (activePlanId === id) setActivePlanId(null);
  };

  const exportPDF = async () => {
    if (!exportRef.current || !content) return;
    toast.info("Preparing PDF…");
    try {
      const node = exportRef.current;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: theme === "dark" ? "#0f1419" : "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 48;
      const imgH = (canvas.height * imgW) / canvas.width;
      let position = 24;
      let heightLeft = imgH;
      pdf.addImage(imgData, "PNG", 24, position, imgW, imgH);
      heightLeft -= pageH - 48;
      while (heightLeft > 0) {
        pdf.addPage();
        position = 24 - (imgH - heightLeft);
        pdf.addImage(imgData, "PNG", 24, position, imgW, imgH);
        heightLeft -= pageH - 48;
      }
      const fname = `${(inputs.topic || "lesson").replace(/\s+/g, "-").toLowerCase()}.pdf`;
      pdf.save(fname);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error("PDF export failed");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <PlannerSidebar
        inputs={inputs}
        setInputs={setInputs}
        onGenerate={handleGenerate}
        loading={loading}
        history={history}
        onLoadPlan={loadPlan}
        onDeletePlan={deletePlan}
        activePlanId={activePlanId}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {content && inputs.topic ? <>Plan for <span className="text-gradient">{inputs.topic}</span></> : "Welcome back, Teacher 👋"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={!content || loading}>
              <Download className="h-4 w-4 mr-2" /> Export PDF
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {!content && !loading ? (
            <EmptyState />
          ) : (
            <div className="h-full flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="px-6 pt-4">
                  <TabsList className="grid w-full max-w-2xl grid-cols-4">
                    <TabsTrigger value="lesson"><FileText className="h-3.5 w-3.5 mr-1.5" />Lesson</TabsTrigger>
                    <TabsTrigger value="worksheet"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Worksheet</TabsTrigger>
                    <TabsTrigger value="activities"><Gamepad2 className="h-3.5 w-3.5 mr-1.5" />Activities</TabsTrigger>
                    <TabsTrigger value="full"><Layers className="h-3.5 w-3.5 mr-1.5" />Full</TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1 px-6 pb-6">
                  <Card className="my-4 p-6 md:p-10 shadow-soft">
                    {loading && !content && (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Crafting your lesson…</p>
                      </div>
                    )}
                    <TabsContent value="lesson" className="mt-0">
                      <LessonOutput content={content} section="lesson" />
                    </TabsContent>
                    <TabsContent value="worksheet" className="mt-0">
                      <LessonOutput content={content} section="worksheet" />
                    </TabsContent>
                    <TabsContent value="activities" className="mt-0">
                      <LessonOutput content={content} section="activities" />
                    </TabsContent>
                    <TabsContent value="full" className="mt-0">
                      <LessonOutput content={content} section="all" ref={exportRef} />
                    </TabsContent>
                  </Card>
                </ScrollArea>
              </Tabs>

              {/* Refine bar */}
              <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
                <div className="max-w-3xl mx-auto flex gap-2">
                  <Input
                    placeholder='Refine: e.g. "make it more engaging", "simplify the worksheet"…'
                    value={refineInput}
                    onChange={(e) => setRefineInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRefine(); }}
                    disabled={loading}
                  />
                  <Button onClick={handleRefine} disabled={loading || !refineInput.trim()} className="gradient-hero text-primary-foreground border-0">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  const tips = [
    { icon: FileText, title: "Lesson Plans", desc: "Objectives, materials, timed flow" },
    { icon: ClipboardList, title: "Worksheets", desc: "Print-ready with answer keys" },
    { icon: Gamepad2, title: "Activities", desc: "Engaging games for any topic" },
    { icon: Sparkles, title: "Differentiation", desc: "Support every learner" },
  ];
  return (
    <div className="h-full flex items-center justify-center p-6 gradient-soft">
      <div className="max-w-2xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered lesson planning
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Plan your next lesson<br />
            <span className="text-gradient">in under a minute.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Pick a subject, grade, topic, and duration. Get a complete teaching package ready to print.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          {tips.map((t) => (
            <div key={t.title} className="p-4 rounded-2xl bg-card border border-border shadow-soft transition-smooth hover:shadow-glow hover:-translate-y-0.5">
              <t.icon className="h-5 w-5 text-primary mb-2 mx-auto" />
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          👈 Fill in the sidebar and click <span className="font-semibold text-foreground">Generate Lesson</span> to begin.
        </p>
      </div>
    </div>
  );
}
