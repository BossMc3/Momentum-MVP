import Papa from "papaparse";
import { z } from "zod";
import { CATEGORIES, GRID, type Analysis, type GameState } from "./game";

export const statementInput = z.object({ text: z.string().trim().min(1).max(2000000), fileName: z.string().trim().min(1).max(255) });
export function freshProgress(): GameState {
  return { balance: 0, portfolio: 0, tokens: 0, tiles: Array.from({ length: GRID * GRID }, () => ({ kind: "empty", level: 1, degradation: 0 })), history: [], week: 1, cloudy: false, carsStopped: false, ruined: false };
}

function amount(value: string): number | null {
  const clean = value.replace(/\b(RON|LEI)\b/gi, "").replace(/[\s\u00a0+]/g, "");
  if (!/^-?\d+(?:[.,]\d+)*$/.test(clean)) return null;
  const comma = clean.lastIndexOf(","), dot = clean.lastIndexOf(".");
  const normalized = comma > dot ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.abs(n) : null;
}

const INCOMING = /(top[- ]?up|alimentare|refund|rambursare|transfer from|transfer de la|exchanged|schimb valutar|salary|salariu|cashback|money added|primit)/i;
const MONEY = /(?:\b(RON|LEI)\s?)?(-?\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|-?\d+(?:[.,]\d{1,2})?)(?:\s?(RON|LEI)\b)?/gi;

function col(header: string[], re: RegExp) { return header.findIndex((v) => re.test(v)); }

/** Reads Revolut (EN/RO) and generic bank exports. Only explicit outgoing RON amounts count; unrecognized merchants remain unclassified. */
export function analyzeRealStatement(text: string): Analysis {
  const habits = new Map<string, Analysis["habits"][number]>();
  const csv = Papa.parse<string[]>(text.replace(/^\uFEFF/, "").trim(), { skipEmptyLines: true });
  const header = (csv.data[0] ?? []).map((v) => v.trim().toLowerCase());
  const amountIndex = col(header, /^(amount|sum[aă]|valoare|debit|suma tranzactie|transaction amount)$/);
  const currencyIndex = col(header, /^(currency|moned[aă]|valut[aă])$/);
  const stateIndex = col(header, /^(state|stare|status)$/);
  const descIndex = col(header, /^(description|descriere|detalii|merchant|comerciant)$/);
  const typeIndex = col(header, /^(type|tip)$/);
  const entries: { description: string; value: number | null }[] = [];
  if (amountIndex >= 0) {
    const rows = csv.data.slice(1);
    const signed = rows.some((r) => (r[amountIndex] ?? "").trim().startsWith("-"));
    for (const row of rows) {
      if (currencyIndex >= 0 && !/^(ron|lei)$/i.test(row[currencyIndex]?.trim() ?? "")) continue;
      if (stateIndex >= 0 && /(revert|declin|fail|anulat|respins|pending|[iî]n a[sș]teptare)/i.test(row[stateIndex] ?? "")) continue;
      const raw = (row[amountIndex] ?? "").trim();
      if (signed && !raw.startsWith("-")) continue; // income / top-ups
      const description = descIndex >= 0 ? `${row[descIndex] ?? ""} ${typeIndex >= 0 ? row[typeIndex] ?? "" : ""}` : row.filter((_, i) => i !== amountIndex).join(" ");
      if (INCOMING.test(description)) continue;
      entries.push({ description, value: amount(raw) });
    }
  } else {
    for (const line of text.split(/\r?\n/)) {
      const money = [...line.matchAll(MONEY)].find((m) => m[1] || m[3]);
      if (!money?.[2] || INCOMING.test(line)) continue;
      entries.push({ description: line.slice(0, money.index), value: amount(money[2]) });
    }
  }
  for (const entry of entries) {
    if (entry.value === null || entry.value <= 0) continue;
    const low = entry.description.toLowerCase();
    const category = CATEGORIES.find((c) => c.keywords.some((k) => low.includes(k)));
    if (!category) continue;
    const current = habits.get(category.key) ?? { key: category.key, label: category.label, emoji: category.emoji, count: 0, total: 0 };
    current.count++;
    current.total = Math.round((current.total + entry.value) * 100) / 100;
    habits.set(category.key, current);
  }
  const result = [...habits.values()].sort((a, b) => b.total - a.total);
  const total = Math.round(result.reduce((s, h) => s + h.total, 0) * 100) / 100;
  return { habits: result, transactions: result.reduce((s, h) => s + h.count, 0), total, savings: Math.round(total * .3 * 100) / 100 };
}
/** Points come only from contributions the user confirmed, never from merely uploading a statement. */
export function availablePoints(contributions: number[], spent: number): number {
  return Math.max(0, Math.floor(contributions.reduce((s, a) => s + a, 0)) - spent);
}
/** An investment confirmation must be positive and at most the statement's 30% saving opportunity. */
export function validContribution(amount: number, savings: number): boolean {
  return Number.isFinite(amount) && amount > 0 && amount <= savings + 1e-9;
}
/** Year-by-year value if the user keeps investing `monthly` RON at an annual `rate`, compounded monthly. */
export function investmentProjection(invested: number, monthly: number, years: number, rate: number) {
  const r = rate / 12, out: { an: number; depus: number; valoare: number }[] = [];
  let value = invested;
  for (let y = 0; y <= years; y++) {
    if (y > 0) for (let m = 0; m < 12; m++) value = value * (1 + r) + monthly;
    out.push({ an: y, depus: Math.round(invested + monthly * 12 * y), valoare: Math.round(value) });
  }
  return out;
}
/** Invite rewards go only to brand-new accounts (≤ 24h old) joining via someone else's link, once. */
export const REFERRAL_WINDOW_MS = 24 * 60 * 60 * 1000;
export function referralEligible(o: { selfId: string; inviterId: string; accountCreatedAt: string; now: number; alreadyReferred: boolean }): boolean {
  return o.selfId !== o.inviterId && !o.alreadyReferred && o.now - new Date(o.accountCreatedAt).getTime() <= REFERRAL_WINDOW_MS;
}

/** Investment destinations the client can pick; yearly rates are illustrative, not guaranteed. */
export const STRATEGIES = {
  bonds: { name: "Obligațiuni / titluri de stat", risk: "Risc scăzut", rate: 0.065 },
  pension: { name: "Pilon III de pensii", risk: "Risc scăzut-mediu", rate: 0.07 },
  balanced: { name: "Portofoliu echilibrat", risk: "Risc mediu", rate: 0.075 },
  stocks: { name: "Acțiuni (ETF global)", risk: "Risc ridicat", rate: 0.09 },
} as const;
export type StrategyId = keyof typeof STRATEGIES;
export const isStrategy = (s: string): s is StrategyId => s in STRATEGIES;

export function luhnValid(card: string) {
  const d = card.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = +d[d.length - 1 - i]!;
    if (i % 2) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}
/** "MM/YY" must not be in the past relative to `now`. */
export function expiryValid(exp: string, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(exp.trim());
  if (!m) return false;
  const month = +m[1]!, year = 2000 + +m[2]!;
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}
export const cvcValid = (c: string) => /^\d{3,4}$/.test(c);
/** Simulated decline: test card 4000 0000 0000 0002 always fails. */
export const simulatedDecline = (card: string) => card.replace(/\s/g, "") === "4000000000000002";
