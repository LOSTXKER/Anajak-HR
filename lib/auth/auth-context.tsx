"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Database } from "@/types/database";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  employee: null,
  loading: true,
  signOut: async () => {},
  isConfigured: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase is not configured, just set loading to false
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
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
      setEmployee(data);
    } catch (error: any) {
      console.error("Error fetching employee:", error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    
    await supabase.auth.signOut();
    setUser(null);
    setEmployee(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        employee, 
        loading, 
        signOut, 
        isConfigured: isSupabaseConfigured 
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
