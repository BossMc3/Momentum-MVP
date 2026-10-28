import { describe, expect, it } from "vitest";
import * as G from "./game";

describe("game rules", () => {
  it("starts with 4850 RON balance", () => {
    expect(G.initialState().balance).toBe(4850);
  });

  it("investing 150 RON moves money to portfolio and grants 150 tokens", () => {
    const s = G.invest(G.initialState(), 150, "cafele", "x");
    expect(s.balance).toBe(4700);
    expect(s.portfolio).toBe(150);
    expect(s.tokens).toBe(150);
  });

  it("cottage costs 50, cafe 120, road 40 tokens", () => {
    let s = G.invest(G.initialState(), 210, "t", "x");
    s = G.build(s, 0, "house");
    expect(s.tokens).toBe(160);
    s = G.build(s, 1, "cafe");
    expect(s.tokens).toBe(40);
    s = G.build(s, 2, "road");
    expect(s.tokens).toBe(0);
  });

  it("cannot build without enough tokens", () => {
    const s = G.build(G.initialState(), 0, "house");
    expect(s.tiles[0]?.kind).toBe("empty");
  });

  it("upgrades cost 100 then 150", () => {
    let s = G.invest(G.initialState(), 300, "t", "x");
    s = G.build(s, 0, "house");
    s = G.upgrade(s, 0);
    expect(s.tiles[0]?.level).toBe(2);
    expect(s.tokens).toBe(150);
    s = G.upgrade(s, 0);
    expect(s.tiles[0]?.level).toBe(3);
    expect(s.tokens).toBe(0);
  });

  it("full withdrawal ruins every building", () => {
    let s = G.invest(G.initialState(), 150, "t", "x");
    s = G.build(s, 0, "house");
    s = G.withdraw(s, 1, "w");
    expect(s.ruined).toBe(true);
    expect(s.portfolio).toBe(0);
    expect(s.tiles[0]?.degradation).toBe(2);
  });

  it("partial withdrawal takes 50% and degrades at least one building", () => {
    let s = G.invest(G.initialState(), 200, "t", "x");
    s = G.build(s, 0, "house");
    s = G.withdraw(s, 0.5, "w");
    expect(s.portfolio).toBe(100);
    expect(s.tiles[0]?.degradation).toBe(1);
    expect(s.ruined).toBe(false);
  });

  it("compound interest at 6.5% over 10 years", () => {
    expect(G.lostInterest(1000, 10, 0.065)).toBe(877);
  });

  it("detects guilty pleasures in demo statement", () => {
    const a = G.analyzeStatement(G.DEMO_STATEMENT);
    expect(a.transactions).toBe(19);
    expect(a.habits.find((h) => h.key === "coffee")?.count).toBe(6);
  });
});
