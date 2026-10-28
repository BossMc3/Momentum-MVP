import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/momentum-logo.jpeg.asset.json";
export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Resetează parola — Momentum" }, { name: "description", content: "Setează o parolă nouă pentru contul tău Momentum." }, { property: "og:title", content: "Resetează parola — Momentum" }, { property: "og:description", content: "Recuperează accesul la contul tău Momentum." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ResetPassword,
});
function ResetPassword() {
  const [ready, setReady] = useState(false); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("type") === "recovery") setReady(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setReady(true); });
    return () => subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? "Linkul nu mai este valid sau parola nu este acceptată. Solicită un link nou." : "Parola a fost actualizată."); setBusy(false);
  }
  return <main className="grid min-h-screen place-items-center p-6"><div className="w-full max-w-sm"><img src={logo.url} alt="Momentum" className="mb-7 h-12 w-12 rounded-lg" /><h1 className="mb-6 text-2xl font-semibold">Parolă nouă</h1>{ready ? <form onSubmit={submit} className="space-y-4"><label className="block text-sm">Parolă<Input type="password" className="mt-2" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><Button disabled={busy} className="w-full">Salvează parola</Button></form> : <p className="text-sm text-muted-foreground">Deschide linkul din email pentru resetarea parolei.</p>}{message && <p role="status" className="mt-4 text-sm">{message}</p>}<Button asChild variant="link" className="mt-5"><Link to="/">Înapoi la Momentum</Link></Button></div></main>;
}