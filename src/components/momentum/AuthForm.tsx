import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "@lovable.dev/cloud-auth-js/styles.css";

function authErrorMessage(err: unknown): string {
  const msg = (err as { message?: string })?.message?.toLowerCase() ?? "";
  if (msg.includes("weak") || msg.includes("pwned") || msg.includes("easy to guess")) return "Parola este prea ușor de ghicit (apare în liste de parole compromise). Alege una mai puternică, de ex. cu cuvinte, cifre și simboluri.";
  if (msg.includes("already registered") || msg.includes("already exists")) return "Există deja un cont cu acest email. Conectează-te sau resetează parola.";
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) return "Email sau parolă greșite.";
  if (msg.includes("email not confirmed")) return "Confirmă mai întâi adresa de email din mesajul primit, apoi conectează-te.";
  if (msg.includes("rate limit") || msg.includes("too many")) return "Prea multe încercări. Așteaptă câteva minute și încearcă din nou.";
  if (msg.includes("fetch") || msg.includes("network")) return "Nu se poate contacta serverul. Verifică conexiunea și fișierul .env.";
  return "Operațiunea nu a reușit. Verifică datele și încearcă din nou.";
}

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error; setMessage("Dacă adresa are un cont, vei primi un link pentru resetarea parolei.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } } });
        if (error) throw error; if (!data.session) setMessage("Verifică emailul și confirmă contul înainte de conectare.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error;
      }
    } catch (err) { setMessage(authErrorMessage(err)); }
    finally { setBusy(false); }
  }
  async function social(provider: "google" | "lovable") {
    setMessage("");
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      setMessage("Conectarea cu Google sau Lovable funcționează doar pe linkul aplicației (preview sau publicat), nu pe localhost. Aici folosește email și parolă.");
      return;
    }
    setBusy(true);
    try { const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin }); if (res.error) setMessage("Conectarea nu a reușit. Încearcă din nou."); }
    catch { setMessage("Conectarea nu a reușit."); } finally { setBusy(false); }
  }
  return <div className="w-full max-w-sm">
    <h2 className="text-2xl font-semibold">{mode === "signup" ? "Creează contul tău" : mode === "reset" ? "Resetează parola" : "Bine ai revenit"}</h2>
    <p className="mt-2 mb-7 text-sm text-muted-foreground">Un nou pas pentru finanțele tale.</p>
    <form onSubmit={submit} className="space-y-4">
      {mode === "signup" && <label className="block text-sm font-medium">Nume afișat<Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required autoComplete="name" /></label>}
      <label className="block text-sm font-medium">Email<Input className="mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
      {mode !== "reset" && <label className="block text-sm font-medium">Parolă<Input className="mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>}
      <Button className="w-full h-11" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}{mode === "signup" ? "Creează cont" : mode === "reset" ? "Trimite link" : "Conectează-te"}</Button>
    </form>
    {message && <p role="status" className="mt-4 text-sm text-primary">{message}</p>}
    {mode !== "reset" && <><div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />sau<span className="h-px flex-1 bg-border" /></div>
      <Button variant="outline" disabled={busy} onClick={() => social("google")} className="mb-3 w-full h-11">Continuă cu Google</Button>
      <Button disabled={busy} onClick={() => social("lovable")} className="lovable-auth-button w-full">Continue with Lovable</Button></>}
    <div className="mt-5 flex flex-wrap justify-center gap-2"><Button variant="link" size="sm" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); }}>{mode === "signup" ? "Ai deja cont? Conectează-te" : "Nu ai cont? Înregistrează-te"}</Button>
      {mode === "login" && <Button variant="link" size="sm" onClick={() => setMode("reset")}>Ai uitat parola?</Button>}
      {mode === "reset" && <Button variant="link" size="sm" onClick={() => setMode("login")}>Înapoi la conectare</Button>}</div>
  </div>;
}