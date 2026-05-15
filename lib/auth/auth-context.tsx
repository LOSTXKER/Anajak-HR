"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Database } from "@/types/database";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

// Phase B: default org UUID (Anajak) — matches migration seed
const ANAJAK_ORG_ID = "00000000-0000-0000-0000-000000000001";

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isConfigured: boolean;
  /** Phase B: current org scope. Null = Step 1 (pre-backfill) → defaults to Anajak at app layer */
  currentOrgId: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  // Phase B: org scope — default Anajak until Step 2 backfill populates employees.organization_id
  const [currentOrgId, setCurrentOrgId] = useState<string>(ANAJAK_ORG_ID);

  useEffect(() => {
    // If Supabase is not configured, just set loading to false
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Detect password recovery from URL hash before Supabase processes it
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      if (!window.location.pathname.startsWith('/reset-password')) {
        const hash = window.location.hash;
        window.location.href = '/reset-password' + hash;
        return;
      }
    }

    // Check active sessions and sets the user
    supabase.auth.getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEmployee(session.user.id);
      } else {
        setLoading(false);
      }
      })
      .catch((error: any) => {
        console.error('Session error:', error);
        // If refresh token is invalid, sign out
        if (error?.message?.includes('refresh')) {
          supabase.auth.signOut();
        }
        setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      // Handle token refresh errors
      if (_event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }

      // Handle password recovery - redirect to reset password page
      if (_event === 'PASSWORD_RECOVERY' && session) {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/reset-password')) {
          window.location.href = '/reset-password';
          return;
        }
      }

      if (_event === 'SIGNED_OUT' || session === null) {
        setUser(null);
        setEmployee(null);
        setLoading(false);
        return;
      }
      
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEmployee(session.user.id);
      } else {
        setEmployee(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchEmployee = async (userId: string) => {
    if (!isSupabaseConfigured) return;
    
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching employee - Code:", error.code, "Message:", error.message, "Details:", error.details);
        // If row not found, user may not exist in employees table yet
        if (error.code === 'PGRST116') {
          console.warn("Employee record not found for user:", userId);
        }
        return;
      }

      // Check if employee has resigned, been terminated, or deleted
      if (data?.employment_status === "resigned" || data?.employment_status === "terminated" || data?.deleted_at) {
        console.warn("Employee account is inactive:", userId, "status:", data?.employment_status);
        await supabase.auth.signOut();
        setUser(null);
        setEmployee(null);
        return;
      }

      setEmployee(data);
      // Phase B Step 1: use employees.organization_id if populated (post-Step-2)
      // otherwise fall back to cookie-based selection via /api/auth/switch-org
      if (data?.organization_id) {
        setCurrentOrgId(data.organization_id);
      } else {
        // Pre-backfill: read from switch-org cookie (default = Anajak)
        fetch("/api/auth/switch-org")
          .then((r) => r.json())
          .then((org: { org_id: string }) => {
            if (org?.org_id) setCurrentOrgId(org.org_id);
          })
          .catch(() => {
            // silently fall back to Anajak default
          });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error fetching employee:", msg);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;

    await supabase.auth.signOut();
    setUser(null);
    setEmployee(null);
    setCurrentOrgId(ANAJAK_ORG_ID);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        loading,
        signOut,
        isConfigured: isSupabaseConfigured,
        currentOrgId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
