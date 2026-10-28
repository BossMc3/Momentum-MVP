import { describe, it, expect } from "vitest";
import { freshProgress, referralEligible } from "./momentum";
import { BANANA_CLEAN_COST, BANANA_COST, FIRE_REPAIR_COST, INVITEE_BONUS, INVITER_BONUS, METEOR_COST, bananaStrike, build, canBuild, cleanBananas, meteorStrike, repairFire, upgrade, type GameState } from "./game";

const city = (): GameState => { let s = { ...freshProgress(), tokens: 1000 }; for (const i of [0, 1, 2, 3, 4]) s = build(s, i, "house"); return s; };
describe("invites", () => {
  it("gives 100 points to the inviter and 50 to the friend", () => { expect(INVITER_BONUS).toBe(100); expect(INVITEE_BONUS).toBe(50); });
  it("rewards only new accounts, once, not self-invites", () => {
    const base = { selfId: "a", inviterId: "b", accountCreatedAt: new Date(0).toISOString(), now: 1000, alreadyReferred: false };
    expect(referralEligible(base)).toBe(true);
    expect(referralEligible({ ...base, alreadyReferred: true })).toBe(false);
    expect(referralEligible({ ...base, inviterId: "a" })).toBe(false);
    expect(referralEligible({ ...base, now: 25 * 3600 * 1000 })).toBe(false);
  });
});
describe("attacks", () => {
  it("meteor costs 150 and repair 60 per building; banana costs 40 and cleaning 15", () => {
    expect(METEOR_COST).toBe(150); expect(FIRE_REPAIR_COST).toBe(60); expect(BANANA_COST).toBe(40); expect(BANANA_CLEAN_COST).toBe(15);
    expect(BANANA_COST).toBeLessThan(METEOR_COST); expect(BANANA_CLEAN_COST).toBeLessThan(FIRE_REPAIR_COST);
  });
  it("meteor sets up to 3 buildings on fire and blocks their upgrade until repaired", () => {
    const hit = meteorStrike(city(), () => 0.3);
    const burning = hit.tiles.map((t, i) => (t.onFire ? i : -1)).filter((i) => i >= 0);
    expect(burning).toHaveLength(3);
    expect(upgrade(hit, burning[0]!)).toBe(hit);
    const fixed = repairFire(hit, burning[0]!);
    expect(fixed.tiles[burning[0]!]!.onFire).toBe(false); expect(fixed.tokens).toBe(hit.tokens - 60);
  });
  it("meteor does nothing on an empty city", () => { const s = freshProgress(); expect(meteorStrike(s)).toBe(s); });
  it("bananas block building until cleaned for 15 points", () => {
    const s = bananaStrike(city());
    expect(canBuild(s, 10, "house")).toBe(false);
    const clean = cleanBananas(s);
    expect(clean.tokens).toBe(s.tokens - 15); expect(canBuild(clean, 10, "house")).toBe(true);
  });
});
