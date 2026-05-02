import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("[Auth Debug] Error fetching profile:", error);
          setProfile(null);
        } else {
          console.log("[Auth Debug] Profile loaded:", data);
          setProfile(data);
        }
      } catch (err) {
        console.error("Unexpected error in useProfile:", err);
      } finally {
        setLoading(false);
      }
    }

    getProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        getProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = profile?.role === 'admin' || (profile?.email === adminEmail && !!profile?.email);

  return { 
    profile, 
    loading, 
    isAdmin, 
    isTeacher: profile?.role === 'teacher' && !isAdmin, 
    isStudent: profile?.role === 'student' && !isAdmin 
  };
}
