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
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          setProfile(null);
        } else {
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

  return { profile, loading, isAdmin: profile?.role === 'admin', isTeacher: profile?.role === 'teacher', isStudent: profile?.role === 'student' };
}
