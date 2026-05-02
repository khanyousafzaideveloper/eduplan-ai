import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, User, Mail, Lock, Shield, Building2, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { INSTITUTES } from "@/utils/institutes";
import { GRADES } from "@/utils/grades";

export default function Settings() {
  const { profile, loading: profileLoading } = useProfile();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [institute, setInstitute] = useState("");
  const [grade, setGrade] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (profile) {
      setEmail(profile.email || "");
      setFullName(profile.full_name || "");
      setInstitute(profile.institute || "");
      setGrade(profile.grade || "");
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      // 1. Update Auth Email/Password ONLY if they actually changed
      const authUpdateData: any = {};
      
      // Only update email if it's different from the current one
      if (email !== profile?.email && email.trim() !== "") {
        authUpdateData.email = email;
      }
      
      // Only update password if user typed something new
      if (newPassword && newPassword.trim() !== "") {
        authUpdateData.password = newPassword;
      }

      if (Object.keys(authUpdateData).length > 0) {
        console.log("[Auth Debug] Sending Auth Update:", Object.keys(authUpdateData));
        const { error: authError } = await supabase.auth.updateUser(authUpdateData);
        if (authError) {
          // If it's the "same_password" error, we can ignore it if the user didn't mean to change it,
          // but better to just catch it and inform them.
          if (authError.message.includes("different from the old password")) {
            // Ignore this specific error to allow the profile update to continue
            console.warn("[Auth Debug] Password was same as old, skipping auth update");
          } else {
            throw authError;
          }
        }
        if (authUpdateData.email) toast.info("A confirmation email has been sent to your new address.");
      }

      // 2. Update Profiles Table (The "PATCH" operation)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          full_name: fullName,
          email: email,
          institute: institute,
          grade: grade
        })
        .eq("id", profile?.id);
      
      if (profileError) throw profileError;

      toast.success("Profile updated successfully!");
      setNewPassword(""); // Clear the field
    } catch (error: any) {
      console.error("[Auth Debug] Update failed:", error);
      toast.error(error.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <Button variant="outline" asChild>
          <Link to="/">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
              </div>
            </div>
            <div className="pt-2 space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Account Security</p>
              <div className="flex items-center gap-2 text-xs text-green-500">
                <Shield className="h-3 w-3" /> Status: Verified
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Profile Details
              </CardTitle>
              <CardDescription>Manage your public profile information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  placeholder="Jane Doe" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    className="pl-10"
                    type="email" 
                    placeholder="jane@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>
                <p className="text-[11px] text-muted-foreground italic">Changing your email will require re-verification.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institute">Institute (School/College)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <div className="pl-9">
                    <Select value={institute} onValueChange={setInstitute}>
                      <SelectTrigger id="institute">
                        <SelectValue placeholder="Select your school or college" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTITUTES.map((inst) => (
                          <SelectItem key={inst.id} value={inst.name}>
                            {inst.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {profile?.role === "student" && (
                <div className="space-y-2">
                  <Label htmlFor="grade">Current Grade</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <div className="pl-9">
                      <Select value={grade} onValueChange={setGrade}>
                        <SelectTrigger id="grade">
                          <SelectValue placeholder="Select your current grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADES.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" /> Security
              </CardTitle>
              <CardDescription>Update your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="newPassword" 
                    className="pl-10"
                    type="password" 
                    placeholder="••••••••" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground italic">Leave blank to keep your current password.</p>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t flex justify-end px-6 py-4">
              <Button 
                className="gradient-hero" 
                onClick={handleUpdateProfile} 
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save All Changes
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
