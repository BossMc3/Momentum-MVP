// Pure game logic for Oasis: Empire of Wealth (no browser APIs).

export type TileKind = "empty" | "house" | "cafe" | "road";
export type Degradation = 0 | 1 | 2;

export interface Tile {
  kind: TileKind;
  level: 1 | 2 | 3;
  degradation: Degradation;
  fundedBy?: string;
  /** Set by a friend's meteor attack; must be repaired before upgrading. */
  onFire?: boolean;
}

export interface HistoryItem {
  id: string;
  date: string;
  label: string;
  amount: number; // RON, + invest, - withdraw
  tokens: number;
}

export interface GameState {
  balance: number;
  portfolio: number;
  tokens: number;
  tiles: Tile[];
  history: HistoryItem[];
  week: number;
  cloudy: boolean;
  carsStopped: boolean;
  ruined: boolean;
  lastFunding?: string;
  /** Banana peels thrown by a friend; building is blocked until cleaned. */
  bananas?: boolean;
}

export const GRID = 5;
export const START_BALANCE = 4850;
export const RATE_FIDELIS = 0.065;
export const RATE_SP500 = 0.09;
export const BUCHAREST_DOWN_PAYMENT = 75000; // RON (~15% of a 2-room apartment)

export const BUILD_COST: Record<Exclude<TileKind, "empty">, number> = {
  house: 50,
  cafe: 120,
  road: 40,
};
export const UPGRADE_COST: Record<1 | 2, number> = { 1: 100, 2: 150 };

export const BUILDING_NAMES = {
  house: { 1: "Căsuța Albastră", 2: "Conacul Galben", 3: "Marele Conac" },
  cafe: "Cafenea Artizanală (Hambarul Roșu)",
  road: "Stradă Pietruită cu Mașini",
} as const;

export function emptyTile(): Tile {
  return { kind: "empty", level: 1, degradation: 0 };
}

export function initialState(): GameState {
  return {
    balance: START_BALANCE,
    portfolio: 0,
    tokens: 0,
    tiles: Array.from({ length: GRID * GRID }, emptyTile),
    history: [],
    week: 1,
    cloudy: false,
    carsStopped: false,
    ruined: false,
  };
}

const today = () =>
  new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "long" });

export function invest(s: GameState, amount: number, label: string, id: string): GameState {
  const amt = Math.min(amount, s.balance);
  if (amt <= 0) return s;
  return {
    ...s,
    balance: s.balance - amt,
    portfolio: s.portfolio + amt,
    tokens: s.tokens + amt,
    lastFunding: label,
    history: [{ id, date: today(), label, amount: amt, tokens: amt }, ...s.history].slice(0, 50),
  };
}

export function canBuild(s: GameState, index: number, kind: Exclude<TileKind, "empty">) {
  return !s.ruined && !s.bananas && s.tiles[index]?.kind === "empty" && s.tokens >= BUILD_COST[kind];
}

export function build(s: GameState, index: number, kind: Exclude<TileKind, "empty">): GameState {
  if (!canBuild(s, index, kind)) return s;
  const tiles = s.tiles.slice();
  tiles[index] = {
    kind,
    level: 1,
    degradation: 0,
    fundedBy: `Construită din ${s.lastFunding ?? "economiile tale"} pe ${today()}`,
  };
  return { ...s, tiles, tokens: s.tokens - BUILD_COST[kind] };
}

export function upgradeCost(t: Tile): number | null {
  if (t.kind !== "house" || t.level >= 3) return null;
  return UPGRADE_COST[t.level as 1 | 2];
}

export function upgrade(s: GameState, index: number): GameState {
  const t = s.tiles[index];
  const cost = t ? upgradeCost(t) : null;
  if (!t || cost === null || s.tokens < cost || s.ruined || s.bananas || t.onFire) return s;
  const tiles = s.tiles.slice();
  tiles[index] = { ...t, level: (t.level + 1) as 2 | 3, degradation: 0 };
  return { ...s, tiles, tokens: s.tokens - cost };
}

export function repair(s: GameState, index: number): GameState {
  const t = s.tiles[index];
  if (!t || t.degradation === 0 || s.tokens < 20) return s;
  const tiles = s.tiles.slice();
  tiles[index] = { ...t, degradation: (t.degradation - 1) as Degradation };
  return { ...s, tiles, tokens: s.tokens - 20 };
}

/** Compound interest lost if `amount` is withdrawn instead of left for `years`. */
export function lostInterest(amount: number, years = 10, rate = RATE_FIDELIS) {
  return Math.round(amount * (Math.pow(1 + rate, years) - 1));
}

export function futureValue(principal: number, yearly: number, years: number, rate: number) {
  const g = Math.pow(1 + rate, years);
  return Math.round(principal * g + (rate === 0 ? yearly * years : (yearly * (g - 1)) / rate));
}

/**
 * Withdraw a fraction of the portfolio. Partial (0.5) degrades ~half of the built
 * tiles by 1 level (at least one), stops cars and clouds the sky. Full (1) ruins the city.
 * `rand` is injectable for tests.
 */
export function withdraw(s: GameState, fraction: 0.5 | 1, id: string, rand = Math.random): GameState {
  const amount = Math.round(s.portfolio * fraction);
  if (amount <= 0) return s;
  const history = [
    { id, date: today(), label: `Retragere ${fraction * 100}%`, amount: -amount, tokens: 0 },
    ...s.history,
  ].slice(0, 50);
  const base = { ...s, balance: s.balance + amount, portfolio: s.portfolio - amount, history };
  if (fraction === 1) {
    return {
      ...base,
      tiles: s.tiles.map((t) => (t.kind === "empty" ? t : { ...t, degradation: 2 as Degradation })),
      ruined: true,
      cloudy: true,
      carsStopped: true,
    };
  }
  const built = s.tiles.map((t, i) => (t.kind === "empty" ? -1 : i)).filter((i) => i >= 0);
  const shuffled = built.sort(() => rand() - 0.5);
  const hit = new Set(shuffled.slice(0, Math.max(1, Math.ceil(built.length / 2))));
  return {
    ...base,
    tiles: s.tiles.map((t, i) =>
      hit.has(i) ? { ...t, degradation: Math.min(2, t.degradation + 1) as Degradation } : t,
    ),
    cloudy: true,
    carsStopped: true,
  };
}

/** Re-deposit and rebuild: clears ruin, restores buildings. */
export function rebuild(s: GameState, amount: number, id: string): GameState {
  const next = invest(s, amount, "redepunere pentru reconstrucție", id);
  if (next === s) return s;
  return {
    ...next,
    tiles: next.tiles.map((t) => ({ ...t, degradation: 0 as Degradation })),
    ruined: false,
    cloudy: false,
    carsStopped: false,
  };
}

/* ---------------- Statement analysis ---------------- */

export interface HabitCategory {
  key: string;
  label: string;
  emoji: string;
  keywords: string[];
}

export const CATEGORIES: HabitCategory[] = [
  { key: "coffee", label: "Cafele", emoji: "☕", keywords: ["starbucks", "5 to go", "5togo", "tucano", "costa coffee", "ted's coffee", "teds coffee", "m60", "origo", "cafenea", "coffee"] },
  { key: "delivery", label: "Livrări mâncare", emoji: "🍔", keywords: ["tazz", "glovo", "foodpanda", "bolt food", "wolt", "uber eats"] },
  { key: "restaurants", label: "Restaurante & fast-food", emoji: "🍟", keywords: ["mcdonald", "kfc", "burger king", "subway", "pizza hut", "starbucks reserve", "taco bell", "spartan", "salad box", "restaurant", "bistro", "trattoria"] },
  { key: "rides", label: "Curse Uber / Bolt", emoji: "🚕", keywords: ["uber", "bolt", "free now", "freenow", "blackcab"] },
  { key: "fashion", label: "Haine & shopping", emoji: "👗", keywords: ["zara", "h&m", "bershka", "pull&bear", "stradivarius", "reserved", "about you", "shein", "zalando", "decathlon", "answear"] },
  { key: "online", label: "Cumpărături online", emoji: "📦", keywords: ["emag", "amazon", "temu", "aliexpress", "altex", "flanco"] },
  { key: "subscriptions", label: "Abonamente", emoji: "📺", keywords: ["netflix", "spotify", "hbo", "max.com", "disney", "youtube", "apple.com", "google one", "chatgpt", "openai", "voyo", "playstation", "xbox", "steam"] },
  { key: "snacks", label: "Supermarket & gustări", emoji: "🛒", keywords: ["mega image", "megaimage", "lidl", "kaufland", "carrefour", "profi", "penny", "auchan", "la doi pasi", "freshful"] },
  { key: "fun", label: "Ieșiri & distracție", emoji: "🎉", keywords: ["cinema city", "happy cinema", "iabilet", "eventim", "bar ", "pub ", "club "] },
];

export interface HabitResult {
  key: string;
  label: string;
  emoji: string;
  count: number;
  total: number;
}

export interface Analysis {
  habits: HabitResult[];
  transactions: number;
  total: number;
  savings: number;
}

const AMOUNT_RE = /(-?\d{1,5}(?:[.,]\d{1,2})?)\s*(?:ron|lei)?/gi;

function lineAmount(line: string): number {
  const nums = [...line.matchAll(AMOUNT_RE)]
    .map((m) => Math.abs(parseFloat((m[1] ?? "0").replace(",", "."))))
    .filter((n) => n > 0 && n < 5000 && !(n >= 1900 && n <= 2100 && Number.isInteger(n)));
  // amounts usually at end of line; skip date parts like 12, 10
  const decimals = nums.filter((n) => !Number.isInteger(n));
  if (decimals.length) return decimals[decimals.length - 1] ?? 0;
  return nums[nums.length - 1] ?? 0;
}

export function analyzeStatement(text: string): Analysis {
  const lines = text.split(/\r?\n|(?=\d{2}[./]\d{2}[./]\d{2,4})/).map((l) => l.trim()).filter(Boolean);
  const map = new Map<string, HabitResult>();
  for (const line of lines) {
    const low = line.toLowerCase();
    // order matters: "bolt food" before "bolt"
    const cat = CATEGORIES.find((c) => c.keywords.some((k) => low.includes(k)));
    if (!cat) continue;
    const amt = lineAmount(line) || 25;
    const cur = map.get(cat.key) ?? { key: cat.key, label: cat.label, emoji: cat.emoji, count: 0, total: 0 };
    cur.count += 1;
    cur.total = Math.round((cur.total + amt) * 100) / 100;
    map.set(cat.key, cur);
  }
  const habits = [...map.values()].sort((a, b) => b.total - a.total);
  const total = Math.round(habits.reduce((s, h) => s + h.total, 0));
  const transactions = habits.reduce((s, h) => s + h.count, 0);
  const savings = transactions ? Math.max(50, Math.round((total * 0.3) / 10) * 10) : 0;
  return { habits, transactions, total, savings };
}

export const DEMO_STATEMENT = `BANCA TRANSILVANIA - Extras de cont
21.10.2026 POS STARBUCKS AFI COTROCENI -22.50 RON
21.10.2026 UBER *TRIP BUCURESTI -31.00 RON
22.10.2026 TAZZ*KFC UNIRII -64.90 RON
22.10.2026 5 TO GO VICTORIEI -14.00 RON
22.10.2026 BOLT.EU RIDE -27.50 RON
23.10.2026 GLOVO*MCDONALDS -58.30 RON
23.10.2026 STARBUCKS UNIVERSITATE -24.00 RON
23.10.2026 MEGA IMAGE 0412 -38.70 RON
24.10.2026 5 TO GO PIATA ROMANA -16.00 RON
24.10.2026 UBER *TRIP -29.00 RON
24.10.2026 ZARA PARK LAKE -189.90 RON
25.10.2026 TAZZ*SUSHI ROOM -71.20 RON
25.10.2026 BOLT.EU RIDE -33.00 RON
26.10.2026 STARBUCKS PROMENADA -21.50 RON
26.10.2026 GLOVO*SALAD BOX -46.00 RON
26.10.2026 5 TO GO OBOR -13.50 RON
27.10.2026 UBER *TRIP -30.00 RON
27.10.2026 MEGA IMAGE 0217 -27.40 RON
REVOLUT - Card ****4421
27.10.2026 LIDL SALARIU NU - plata utilitati 210.00 RON`;

/** Build a random weekly statement for "new week" simulations. */
export function randomWeekStatement(rand = Math.random): string {
  const pool = ["STARBUCKS", "5 TO GO", "TAZZ*PIZZA", "GLOVO*BURGER", "UBER *TRIP", "BOLT.EU RIDE", "ZARA", "MEGA IMAGE"];
  const n = 10 + Math.floor(rand() * 10);
  return Array.from({ length: n }, () => {
    const m = pool[Math.floor(rand() * pool.length)];
    const amt = (12 + rand() * 70).toFixed(2);
    return `01.11.2026 ${m} -${amt} RON`;
  }).join("\n");
}

/* ---------------- Friends: invites & attacks ---------------- */

export const INVITER_BONUS = 100;
export const INVITEE_BONUS = 50;
export const METEOR_COST = 150;
export const FIRE_REPAIR_COST = 60; // per burning building
export const METEOR_TARGETS = 3;
export const BANANA_COST = 40;
export const BANANA_CLEAN_COST = 15;

/** Sets up to METEOR_TARGETS intact buildings on fire. Returns s unchanged if nothing can burn. */
export function meteorStrike(s: GameState, rand = Math.random): GameState {
  const candidates = s.tiles.map((t, i) => (t.kind !== "empty" && !t.onFire ? i : -1)).filter((i) => i >= 0);
  if (!candidates.length) return s;
  const hit = new Set(candidates.sort(() => rand() - 0.5).slice(0, METEOR_TARGETS));
  return { ...s, tiles: s.tiles.map((t, i) => (hit.has(i) ? { ...t, onFire: true } : t)) };
}

export function bananaStrike(s: GameState): GameState {
  return s.bananas ? s : { ...s, bananas: true };
}

export function repairFire(s: GameState, index: number): GameState {
  const t = s.tiles[index];
  if (!t?.onFire || s.tokens < FIRE_REPAIR_COST) return s;
  const tiles = s.tiles.slice();
  tiles[index] = { ...t, onFire: false };
  return { ...s, tiles, tokens: s.tokens - FIRE_REPAIR_COST };
}

export function cleanBananas(s: GameState): GameState {
  if (!s.bananas || s.tokens < BANANA_CLEAN_COST) return s;
  return { ...s, bananas: false, tokens: s.tokens - BANANA_CLEAN_COST };
}
