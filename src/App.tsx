import React from "react";
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
import StudentInvites from "./pages/StudentInvites.tsx";
import StudentClassDetails from "./pages/StudentClassDetails.tsx";
import TakeQuiz from "./pages/TakeQuiz.tsx";
import PrintQuiz from "./pages/PrintQuiz.tsx";
import Settings from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";
import Navbar from "./components/Navbar.tsx";
import ChatbotWidget from "./components/ChatbotWidget.tsx";
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

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  console.log("[Auth Debug] Redirecting role:", profile.role, "Email:", profile.email);

  switch (profile.role) {
    case "admin": 
      console.log("[Auth Debug] Target: /admin");
      return <Navigate to="/admin" replace />;
    case "teacher": 
      console.log("[Auth Debug] Target: /teacher");
      return <Navigate to="/teacher" replace />;
    case "student": 
      if (profile.email === adminEmail) {
        console.log("[Auth Debug] Target: /admin (forced by email)");
        return <Navigate to="/admin" replace />;
      }
      console.log("[Auth Debug] Target: /student");
      return <Navigate to="/student" replace />;
    default: 
      console.log("[Auth Debug] Target: /auth (unknown role)");
      return <Navigate to="/auth" replace />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        <ChatbotWidget />
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
              <ProtectedRoute allowedRoles={["student", "admin"]}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/invitations" 
            element={
              <ProtectedRoute allowedRoles={["student", "admin"]}>
                <StudentInvites />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/class/:classId" 
            element={
              <ProtectedRoute allowedRoles={["student", "admin"]}>
                <StudentClassDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student/quiz/:quizId" 
            element={
              <ProtectedRoute allowedRoles={["student", "admin"]}>
                <TakeQuiz />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quiz/print/:quizId" 
            element={
              <ProtectedRoute allowedRoles={["student", "teacher", "admin"]}>
                <PrintQuiz />
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
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
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
