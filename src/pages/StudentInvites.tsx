import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Check, X, Mail, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function StudentInvites() {
  const { profile } = useProfile();
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchInvites();
    }
  }, [profile?.id]);

  async function fetchInvites() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("class_invitations")
        .select("*, classes(name, subject, grade)")
        .eq("status", "pending")
        .eq("student_id", profile?.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to fetch invitations");
      } else {
        setInvites(data || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(inviteId: string, classId: string, action: "accepted" | "rejected") {
    if (!profile?.id) return;
    setProcessing(inviteId);
    try {
      if (action === "accepted") {
        // 1. Add to class_members
        const { error: memberError } = await supabase.from("class_members").insert({
          class_id: classId,
          student_id: profile.id,
          student_name: profile.full_name,
          student_email: profile.email
        });

        if (memberError) throw memberError;
      }

      // 2. Update invitation status
      const { error: inviteError } = await supabase
        .from("class_invitations")
        .update({ status: action })
        .eq("id", inviteId);

      if (inviteError) throw inviteError;

      toast.success(action === "accepted" ? "Joined class successfully!" : "Invitation rejected");
      fetchInvites();
    } catch (error: any) {
      toast.error("Action failed: " + error.message);
    } finally {
      setProcessing(null);
    }
  }

  if (loading || !profile) {
    return (
      <div className="h-screen flex items-center justify-center bg-background/50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">Loading invitations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Class Invitations</h1>
        <p className="text-muted-foreground">Review and accept invitations from your teachers.</p>
      </div>

      {invites.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center py-16 text-center">
          <Mail className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
          <CardTitle>No pending invitations</CardTitle>
          <CardDescription>You'll see requests here when a teacher invites you to a class.</CardDescription>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/student">Back to Dashboard</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {invites.map((invite) => (
            <Card key={invite.id} className="border-border/50 overflow-hidden group hover:border-primary/30 transition-colors">
              <div className="flex flex-col md:flex-row items-center p-6 gap-6">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 space-y-1 text-center md:text-left">
                  <h3 className="text-xl font-bold">{invite.classes?.name || "Unknown Class"}</h3>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {invite.classes?.subject}</span>
                    <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {invite.classes?.grade}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    className="flex-1 md:flex-none border-destructive/20 text-destructive hover:bg-destructive/10"
                    onClick={() => handleAction(invite.id, invite.class_id, "rejected")}
                    disabled={!!processing}
                  >
                    <X className="mr-2 h-4 w-4" /> Reject
                  </Button>
                  <Button 
                    className="flex-1 md:flex-none gradient-hero shadow-lg shadow-primary/20"
                    onClick={() => handleAction(invite.id, invite.class_id, "accepted")}
                    disabled={!!processing}
                  >
                    {processing === invite.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><Check className="mr-2 h-4 w-4" /> Accept</>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
