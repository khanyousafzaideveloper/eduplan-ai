import { Link, useLocation, useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  User, 
  BookOpen, 
  Mail, 
  Shield,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";

export default function Navbar() {
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const navLinks = {
    admin: [
      { name: "Admin Panel", path: "/admin", icon: Shield },
      { name: "Settings", path: "/settings", icon: Settings },
    ],
    teacher: [
      { name: "Dashboard", path: "/teacher", icon: LayoutDashboard },
      { name: "Lesson Planner", path: "/planner", icon: BookOpen },
      { name: "Settings", path: "/settings", icon: Settings },
    ],
    student: [
      { name: "My Classes", path: "/student", icon: GraduationCap },
      { name: "Invitations", path: "/student/invitations", icon: Mail },
      { name: "Settings", path: "/settings", icon: Settings },
    ],
  };

  const currentLinks = profile ? navLinks[profile.role as keyof typeof navLinks] : [];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:inline-block">
              EduPlan <span className="text-primary">AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {currentLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Button
                  key={link.path}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className="h-9 px-4 gap-2 transition-all"
                >
                  <Link to={link.path}>
                    <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    {link.name}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-border/50 hover:border-primary/30 transition-colors p-0 overflow-hidden">
                  <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}
