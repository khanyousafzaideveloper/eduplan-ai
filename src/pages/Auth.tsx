import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [institute, setInstitute] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const navigate = useNavigate();

  const handleAuth = async (type: "login" | "signup") => {
    setLoading(true);
    try {
      if (type === "signup") {
        const { error } = await supabase.auth.signUp({
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
        toast.success("Signup successful! Please check your email for verification.");
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
                  <Label htmlFor="password">Password</Label>
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

                  {role === "teacher" && (
                    <div className="space-y-2">
                      <Label htmlFor="institute">Institute / School Name</Label>
                      <Input id="institute" placeholder="Global Academy" value={institute} onChange={(e) => setInstitute(e.target.value)} />
                    </div>
                  )}

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
