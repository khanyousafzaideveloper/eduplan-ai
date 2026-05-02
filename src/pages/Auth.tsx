import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { INSTITUTES } from "@/utils/institutes";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [institute, setInstitute] = useState("");
  const [grade, setGrade] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const navigate = useNavigate();
  
  const GRADES = [
    "Pre-K", "Kindergarten", 
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", 
    "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", 
    "Grade 11", "Grade 12"
  ];

  const handleAuth = async (type: "login" | "signup") => {
    setLoading(true);
    try {
      if (type === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
              institute: role === "teacher" ? institute : undefined,
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          // MANUAL INSERTION: Create the profile directly from code
          const { error: profileError } = await supabase.from("profiles").insert({
            id: data.user.id,
            full_name: fullName,
            email: email,
            role: role as any,
            institute: institute,
            grade: role === "student" ? grade : undefined,
          });

          if (profileError) {
            console.error("Manual profile creation failed:", profileError);
            toast.error("Account created, but profile setup failed. You can update it in Settings.");
          } else {
            toast.success("Account created successfully!");
          }
        }
        navigate("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background gradient-soft">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl gradient-hero items-center justify-center shadow-soft mb-4">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">EduPlan AI</h1>
          <p className="text-muted-foreground">The future of teaching, today.</p>
        </div>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/80">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Signup</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <TabsContent value="login" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="name@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button 
                      type="button" 
                      onClick={handleResetPassword}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className="w-full gradient-hero" onClick={() => handleAuth("login")} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>I am a...</Label>
                    <RadioGroup defaultValue="student" value={role} onValueChange={(v: any) => setRole(v)} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="student" id="student" />
                        <Label htmlFor="student">Student</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="teacher" id="teacher" />
                        <Label htmlFor="teacher">Teacher</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="institute">Institute (School/College)</Label>
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

                  {role === "student" && (
                    <div className="space-y-2">
                      <Label htmlFor="grade">Current Grade</Label>
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
                  )}

                  <div className="pt-2 text-[10px] text-muted-foreground italic">
                    Note: Institute verification will be implemented in the next phase.
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="name@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>

                  <Button className="w-full gradient-hero" onClick={() => handleAuth("signup")} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
