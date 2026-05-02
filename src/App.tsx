import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import TeacherDashboard from "./pages/TeacherDashboard.tsx";
import StudentDashboard from "./pages/StudentDashboard.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import ClassDetails from "./pages/ClassDetails.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useProfile } from "@/hooks/use-profile";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const DashboardRedirect = () => {
  const { profile, loading } = useProfile();

  if (loading) return null;
  if (!profile) return <Navigate to="/auth" replace />;

  switch (profile.role) {
    case "admin": return <Navigate to="/admin" replace />;
    case "teacher": return <Navigate to="/teacher" replace />;
    case "student": return <Navigate to="/student" replace />;
    default: return <Navigate to="/auth" replace />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<DashboardRedirect />} />
          
          <Route 
            path="/teacher" 
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/class/:classId" 
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <ClassDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student" 
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/planner" 
            element={
              <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                <Index />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
