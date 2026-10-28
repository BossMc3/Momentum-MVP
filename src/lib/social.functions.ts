import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { availablePoints, freshProgress, referralEligible } from "./momentum";
import { BANANA_COST, INVITEE_BONUS, INVITER_BONUS, METEOR_COST, bananaStrike, meteorStrike, type GameState } from "./game";
import { earnedPoints } from "./momentum.functions";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

async function assertFriends(userId: string, friendId: string) {
  const db = await admin();
  const { data } = await db.from("friendships").select("friend_id").eq("user_id", userId).eq("friend_id", friendId).maybeSingle();
  if (!data) throw new Error("Doar prietenii își pot vedea și ataca orașele.");
  return db;
}

export const getFriends = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: links, error } = await context.supabase.from("friendships").select("friend_id, created_at").eq("user_id", context.userId);
  if (error) throw new Error("Prietenii nu pot fi încărcați.");
  const ids = (links ?? []).map((l) => l.friend_id);
  const { data: attacks } = await context.supabase.from("attacks").select("id, attacker_id, victim_id, kind, created_at").or(`attacker_id.eq.${context.userId},victim_id.eq.${context.userId}`).order("created_at", { ascending: false }).limit(20);
  const allIds = [...new Set([...ids, ...(attacks ?? []).flatMap((a) => [a.attacker_id, a.victim_id])])].filter((id) => id !== context.userId);
  const db = await admin();
  const [profiles, progress] = await Promise.all([
    allIds.length ? db.from("profiles").select("id, display_name").in("id", allIds) : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    ids.length ? db.from("momentum_progress").select("user_id, state").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string; state: Json }[] }),
  ]);
  const name = (id: string) => profiles.data?.find((p) => p.id === id)?.display_name || "Prieten";
  return {
    friends: ids.map((id) => {
      const s = (progress.data?.find((p) => p.user_id === id)?.state as unknown as GameState | undefined) ?? freshProgress();
      return { id, name: name(id), buildings: s.tiles.filter((t) => t.kind !== "empty").length, burning: s.tiles.filter((t) => t.onFire).length, bananas: Boolean(s.bananas) };
    }),
    attacks: (attacks ?? []).map((a) => ({ id: a.id, kind: a.kind as "meteor" | "banana", createdAt: a.created_at, incoming: a.victim_id === context.userId, other: name(a.victim_id === context.userId ? a.attacker_id : a.victim_id) })),
  };
});

export const getFriendCity = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({ friendId: z.string().uuid() }).parse(d)).handler(async ({ data, context }) => {
  const db = await assertFriends(context.userId, data.friendId);
  const [{ data: p }, { data: prog }] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", data.friendId).maybeSingle(),
    db.from("momentum_progress").select("state").eq("user_id", data.friendId).maybeSingle(),
  ]);
  return { name: p?.display_name || "Prieten", progress: (prog?.state as unknown as GameState | undefined) ?? freshProgress() };
});

/** Joins via invite link or friend code. Always creates the friendship; rewards only brand-new accounts once. */
export const claimInvite = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({ code: z.string().trim().min(4).max(32) }).parse(d)).handler(async ({ data, context }) => {
  const db = await admin();
  const { data: inviter } = await db.from("profiles").select("id, display_name").eq("invite_code", data.code.toLowerCase()).maybeSingle();
  if (!inviter) throw new Error("Codul de prieten nu există.");
  if (inviter.id === context.userId) throw new Error("Nu te poți adăuga singur ca prieten.");
  const { error: fErr } = await db.from("friendships").upsert([{ user_id: context.userId, friend_id: inviter.id }, { user_id: inviter.id, friend_id: context.userId }], { onConflict: "user_id,friend_id", ignoreDuplicates: true });
  if (fErr) throw new Error("Prietenia nu a putut fi salvată.");
  const { data: u } = await context.supabase.auth.getUser();
  const { data: prior } = await db.from("referrals").select("invitee_id").eq("invitee_id", context.userId).maybeSingle();
  let rewarded = false;
  if (u.user && referralEligible({ selfId: context.userId, inviterId: inviter.id, accountCreatedAt: u.user.created_at, now: Date.now(), alreadyReferred: Boolean(prior) })) {
    const { error } = await db.from("referrals").insert({ invitee_id: context.userId, inviter_id: inviter.id });
    if (!error) {
      await db.from("point_grants").insert([
        { user_id: inviter.id, amount: INVITER_BONUS, reason: "Invitație acceptată" },
        { user_id: context.userId, amount: INVITEE_BONUS, reason: "Bonus de bun venit" },
      ]);
      rewarded = true;
    }
  }
  return { friendName: inviter.display_name || "Prieten", rewarded };
});

export const attackFriend = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({ friendId: z.string().uuid(), kind: z.enum(["meteor", "banana"]) }).parse(d)).handler(async ({ data, context }) => {
  const db = await assertFriends(context.userId, data.friendId);
  const cost = data.kind === "meteor" ? METEOR_COST : BANANA_COST;
  const { data: mine } = await context.supabase.from("momentum_progress").select("state").eq("user_id", context.userId).maybeSingle();
  const myState = (mine?.state as unknown as GameState | undefined) ?? freshProgress();
  const points = availablePoints(await earnedPoints(context.supabase, context.userId), myState.portfolio);
  if (points < cost) throw new Error(`Ai nevoie de ${cost} puncte pentru acest atac.`);
  const { data: theirs } = await db.from("momentum_progress").select("state").eq("user_id", data.friendId).maybeSingle();
  const victim = (theirs?.state as unknown as GameState | undefined) ?? freshProgress();
  const next = data.kind === "meteor" ? meteorStrike(victim) : bananaStrike(victim);
  if (next === victim) throw new Error(data.kind === "meteor" ? "Orașul prietenului nu are clădiri intacte de lovit." : "Orașul e deja plin de coji de banane.");
  const now = new Date().toISOString();
  const { error: e1 } = await context.supabase.from("momentum_progress").upsert({ user_id: context.userId, state: { ...myState, portfolio: myState.portfolio + cost } as unknown as Json, updated_at: now });
  if (e1) throw new Error("Atacul nu a putut fi plătit.");
  await db.from("momentum_progress").upsert({ user_id: data.friendId, state: next as unknown as Json, updated_at: now });
  await db.from("attacks").insert({ attacker_id: context.userId, victim_id: data.friendId, kind: data.kind });
  return { cost };
});
