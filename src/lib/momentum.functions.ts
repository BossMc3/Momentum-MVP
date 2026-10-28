import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeRealStatement, availablePoints, freshProgress, statementInput, validContribution } from "./momentum";
import { build, cleanBananas, repairFire, upgrade, type GameState } from "./game";
import type { Json } from "@/integrations/supabase/types";

export const getDashboard = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [profile, statements, progress, contributions, grants] = await Promise.all([
    context.supabase.from("profiles").select("display_name, invite_code").eq("id", context.userId).maybeSingle(),
    context.supabase.from("statement_analyses").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100),
    context.supabase.from("momentum_progress").select("state").eq("user_id", context.userId).maybeSingle(),
    context.supabase.from("investment_contributions").select("statement_id, amount, created_at, strategy").eq("user_id", context.userId).order("created_at"),
    context.supabase.from("point_grants").select("amount, reason, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }),
  ]);
  for (const res of [profile, statements, progress, contributions, grants]) if (res.error) throw new Error("Datele nu au putut fi încărcate.");
  return { inviteCode: profile.data?.invite_code ?? "", grants: (grants.data ?? []).map((g) => ({ amount: g.amount, reason: g.reason, createdAt: g.created_at })), displayName: profile.data?.display_name ?? "", statements: statements.data ?? [], progress: progress.data?.state ?? freshProgress(), contributions: (contributions.data ?? []).map((c) => ({ statementId: c.statement_id, amount: Number(c.amount), createdAt: c.created_at })) };
});

export const importStatement = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => statementInput.parse(data)).handler(async ({ data, context }) => {
  const analysis = analyzeRealStatement(data.text);
  if (!analysis.transactions) throw new Error("Nu am identificat cheltuieli eligibile cu sume explicite în RON. Pentru Revolut, exportă extrasul din aplicație (Extrase → CSV sau PDF) în lei; nu vom înlocui datele cu un exemplu.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.text.replace(/\r\n/g, "\n").trim()));
  const fingerprint = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
  const { data: row, error } = await context.supabase.from("statement_analyses").insert({ user_id: context.userId, file_name: data.fileName, fingerprint, analysis: analysis as unknown as Json }).select("id").single();
  if (error?.code === "23505") throw new Error("Acest extras a fost deja importat.");
  if (error) throw new Error("Extrasul nu a putut fi salvat. Încearcă din nou.");
  return { ...analysis, statementId: row.id };
});

export const confirmInvestment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ statementId: z.string().uuid(), amount: z.number(), strategy: z.enum(["bonds","pension","balanced","stocks"]), cardLast4: z.string().regex(/^\d{4}$/) }).parse(data)).handler(async ({ data, context }) => {
  const { data: st, error } = await context.supabase.from("statement_analyses").select("analysis").eq("id", data.statementId).eq("user_id", context.userId).maybeSingle();
  if (error || !st) throw new Error("Extrasul nu a fost găsit.");
  const savings = (st.analysis as unknown as { savings: number }).savings;
  const amount = Math.round(data.amount * 100) / 100;
  if (!validContribution(amount, savings)) throw new Error(`Suma trebuie să fie între 0,01 și ${savings} RON.`);
  const { error: e } = await context.supabase.from("investment_contributions").insert({ user_id: context.userId, statement_id: data.statementId, amount, strategy: data.strategy, card_last4: data.cardLast4 });
  if (e?.code === "23505") throw new Error("Ai confirmat deja investiția pentru acest extras.");
  if (e) throw new Error("Investiția nu a putut fi salvată.");
  return { amount };
});

export const saveProfile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ displayName: z.string().trim().min(1).max(100) }).parse(data)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from("profiles").upsert({ id: context.userId, display_name: data.displayName });
  if (error) throw new Error("Numele nu a putut fi salvat.");
  return { ok: true };
});

export const cityAction = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => z.object({ index: z.number().int().min(0).max(24), kind: z.enum(["house", "cafe", "road", "upgrade", "repair", "clean"]) }).parse(data)).handler(async ({ data, context }) => {
  const { data: stored, error } = await context.supabase.from("momentum_progress").select("state").eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error("Progresul nu poate fi încărcat.");
  const state = stored ? stored.state as unknown as GameState : freshProgress();
  const earned = await earnedPoints(context.supabase, context.userId);
  const current = { ...state, tokens: availablePoints(earned, state.portfolio) };
  const next = data.kind === "upgrade" ? upgrade(current, data.index) : data.kind === "repair" ? repairFire(current, data.index) : data.kind === "clean" ? cleanBananas(current) : build(current, data.index, data.kind);
  if (next === current) throw new Error(current.bananas && data.kind !== "clean" ? "Curăță mai întâi cojile de banane din oraș." : "Nu ai suficiente puncte sau parcela nu permite această acțiune.");
  const spent = current.tokens - next.tokens;
  const saved = { ...next, portfolio: state.portfolio + spent };
  const { error: writeError } = await context.supabase.from("momentum_progress").upsert({ user_id: context.userId, state: saved as unknown as Json, updated_at: new Date().toISOString() });
  if (writeError) throw new Error("Progresul nu a putut fi salvat.");
  return saved;
});

/** Confirmed investment amounts plus bonus grants (invites); spending is tracked in progress.portfolio. */
export async function earnedPoints(client: { from: (t: "investment_contributions" | "point_grants") => any }, userId: string): Promise<number[]> {
  const [c, g] = await Promise.all([
    client.from("investment_contributions").select("amount").eq("user_id", userId),
    client.from("point_grants").select("amount").eq("user_id", userId),
  ]);
  if (c.error || g.error) throw new Error("Punctele nu pot fi încărcate.");
  return [...(c.data ?? []), ...(g.data ?? [])].map((r: { amount: number }) => Number(r.amount));
}
