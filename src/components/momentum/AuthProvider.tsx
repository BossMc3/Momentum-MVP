import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const Context = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });
export const useAccount = () => useContext(Context);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const client = useQueryClient();
  useEffect(() => {
    let active = true;
    const validate = () => { void supabase.auth.getUser().then(({ data }) => { if (active) { setUser(data.user); setLoading(false); } }); };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setUser(null); client.clear(); setLoading(false); }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") { client.clear(); queueMicrotask(validate); }
    });
    validate();
    return () => { active = false; subscription.unsubscribe(); };
  }, [client]);
  return <Context.Provider value={{ user, loading }}>{children}</Context.Provider>;
}