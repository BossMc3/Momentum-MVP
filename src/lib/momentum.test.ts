import { describe, it, expect } from "vitest";
import { analyzeRealStatement, freshProgress } from "./momentum";
describe("real personal data", () => {
  it("starts without a fabricated balance or user history", () => {
    const state = freshProgress();
    expect(state.balance).toBe(0); expect(state.portfolio).toBe(0); expect(state.tokens).toBe(0); expect(state.history).toEqual([]);
  });
  it("never substitutes a merchant's missing amount", () => {
    expect(analyzeRealStatement("28.10.2026 STARBUCKS").transactions).toBe(0);
  });
  it("never substitutes demo transactions for an unknown statement", () => {
    expect(analyzeRealStatement("ELECTRICA FURNIZARE 20.00 RON")).toEqual({ habits: [], transactions: 0, total: 0, savings: 0 });
  });
  it("reads actual CSV values rather than dates or running balances", () => {
    const a = analyzeRealStatement('Date,Description,Amount,Currency,Balance\n2026-10-28,"STARBUCKS, Bucuresti",-22.50,RON,4800\n2026-10-28,GLOVO,-40.00,RON,4760');
    expect(a.transactions).toBe(2); expect(a.total).toBe(62.5); expect(a.savings).toBe(18.75);
  });
  it("does not interpret a foreign-currency amount as RON", () => {
    expect(analyzeRealStatement("Description,Amount,Currency\nSTARBUCKS,-20,EUR").transactions).toBe(0);
  });
  it("uses explicit RON amounts in text", () => {
    expect(analyzeRealStatement("28.10.2026 UBER -31.00 RON").total).toBe(31);
  });
});import { availablePoints, validContribution, investmentProjection } from "./momentum";
describe("investment confirmation", () => {
  it("gives no points for uploaded statements without a confirmed contribution", () => { expect(availablePoints([], 0)).toBe(0); });
  it("gives points equal to confirmed contributions minus points spent", () => { expect(availablePoints([127.59, 50], 100)).toBe(77); });
  it("rejects contributions above the 30% saving opportunity", () => { expect(validContribution(128, 127.59)).toBe(false); expect(validContribution(127.59, 127.59)).toBe(true); expect(validContribution(0, 10)).toBe(false); });
  it("projects compound growth beyond deposits", () => {
    const p = investmentProjection(1000, 100, 1, 0.065);
    expect(p[1]!.depus).toBe(2200); expect(p[1]!.valoare).toBeGreaterThan(2200);
    expect(investmentProjection(1000, 0, 1, 0)[1]!.valoare).toBe(1000);
  });
});
describe("Revolut statements", () => {
  it("reads a Revolut English CSV, counting only completed outgoing RON payments", () => {
    const csv = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_PAYMENT,Current,2026-10-21 10:00:00,2026-10-22 10:00:00,Starbucks,-22.50,0.00,RON,COMPLETED,977.50
TOPUP,Current,2026-10-21 09:00:00,2026-10-21 09:00:00,Top-up by *1234,1000.00,0.00,RON,COMPLETED,1000.00
CARD_PAYMENT,Current,2026-10-23 10:00:00,,Glovo,-40.00,0.00,RON,PENDING,937.50
CARD_PAYMENT,Current,2026-10-23 12:00:00,2026-10-24 10:00:00,Lidl,-58.30,0.00,RON,COMPLETED,919.20
CARD_PAYMENT,Current,2026-10-24 12:00:00,2026-10-24 10:00:00,Netflix,-10.00,0.00,EUR,COMPLETED,50.00`;
    const a = analyzeRealStatement(csv);
    expect(a.transactions).toBe(2); expect(a.total).toBe(80.8);
  });
  it("reads a Revolut Romanian CSV", () => {
    const a = analyzeRealStatement(`Tip,Produs,Data începerii,Data finalizării,Descriere,Sumă,Comision,Monedă,Stare,Sold
PLATĂ CU CARDUL,Curent,2026-10-21,2026-10-22,Uber,-31.00,0.00,RON,FINALIZAT,969.00`);
    expect(a.total).toBe(31);
  });
  it("reads Revolut PDF text lines and ignores top-ups and the balance column", () => {
    const a = analyzeRealStatement("21 oct. 2026 Starbucks 22,50 RON 977,50 RON\n21 oct. 2026 Top-up by *1234 Starbucks 1.000,00 RON\nOct 22, 2026 Bolt RON 1,027.50 RON 2,000.00");
    expect(a.transactions).toBe(2); expect(a.total).toBe(1050);
  });
});
