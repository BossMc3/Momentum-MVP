import { useState } from "react";
import { Check, CreditCard, Loader2, Lock, PiggyBank } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STRATEGIES, cvcValid, expiryValid, investmentProjection, luhnValid, simulatedDecline, type StrategyId } from "@/lib/momentum";

const money = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COLORS: Record<StrategyId, string> = { bonds: "var(--muted-foreground)", pension: "var(--accent)", balanced: "var(--chart-3, #f59e0b)", stocks: "var(--primary)" };
const ids = Object.keys(STRATEGIES) as StrategyId[];

export type PaymentTarget = { id: string; name: string; max: number };

export function PaymentDialog({ target, onClose, onPay }: {
  target: PaymentTarget | null; onClose: () => void;
  onPay: (p: { amount: number; strategy: StrategyId; cardLast4: string }) => Promise<void>;
}) {
  return <Dialog open={target !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
      {target && <PaymentForm key={target.id} target={target} onClose={onClose} onPay={onPay} />}
    </DialogContent>
  </Dialog>;
}

function PaymentForm({ target, onClose, onPay }: { target: PaymentTarget; onClose: () => void; onPay: (p: { amount: number; strategy: StrategyId; cardLast4: string }) => Promise<void> }) {
  const [amount, setAmount] = useState(String(target.max));
  const [strategy, setStrategy] = useState<StrategyId>("balanced");
  const [card, setCard] = useState(""), [exp, setExp] = useState(""), [cvc, setCvc] = useState(""), [holder, setHolder] = useState("");
  const [stage, setStage] = useState<"form" | "processing" | "done">("form");
  const [error, setError] = useState("");
  const value = Number(amount.replace(",", ".")) || 0;
  const data = investmentProjection(value, 0, 10, 0).map((d, i) => {
    const row: Record<string, number> = { an: d.an, depus: d.depus };
    for (const s of ids) row[s] = investmentProjection(value, 0, 10, STRATEGIES[s].rate)[i]!.valoare;
    return row;
  });
  const last = data[data.length - 1]!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!(value > 0 && value <= target.max)) return setError(`Suma trebuie să fie între 0,01 și ${money(target.max)} RON.`);
    if (!holder.trim()) return setError("Completează numele de pe card.");
    if (!luhnValid(card)) return setError("Numărul cardului nu este valid.");
    if (!expiryValid(exp)) return setError("Data de expirare nu este validă (LL/AA).");
    if (!cvcValid(cvc)) return setError("CVC-ul trebuie să aibă 3 sau 4 cifre.");
    setStage("processing");
    await new Promise((r) => setTimeout(r, 1600));
    if (simulatedDecline(card)) { setStage("form"); return setError("Plata a fost refuzată de bancă (card de test refuzat)."); }
    try { await onPay({ amount: Math.round(value * 100) / 100, strategy, cardLast4: card.replace(/\s/g, "").slice(-4) }); setStage("done"); }
    catch (err) { setStage("form"); setError(err instanceof Error ? err.message : "Plata nu a reușit."); }
  };

  if (stage === "done") return <div className="text-center py-6 space-y-3">
    <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 grid place-items-center"><Check className="h-7 w-7 text-primary" /></div>
    <h2 className="text-xl font-semibold">Plată reușită</h2>
    <p className="text-sm text-muted-foreground">{money(value)} RON au fost încasați de pe cardul •••• {card.replace(/\s/g, "").slice(-4)} și transferați în contul tău Momentum, cu destinația <b className="text-foreground">{STRATEGIES[strategy].name}</b>. Ai primit {Math.floor(value)} puncte.</p>
    <p className="text-xs text-muted-foreground">Simulare — nu s-au mutat bani reali.</p>
    <Button onClick={onClose}>Gata</Button>
  </div>;

  return <form onSubmit={submit} className="space-y-5">
    <DialogHeader><DialogTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5 text-primary" />Investește din {target.name}</DialogTitle></DialogHeader>
    <label className="block text-sm">Suma (RON) · recomandat {money(target.max)}
      <Input className="mt-2" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
    </label>

    <div>
      <p className="text-sm mb-2">Unde vrei să investești?</p>
      <div className="grid grid-cols-2 gap-2">{ids.map((s) => <button type="button" key={s} onClick={() => setStrategy(s)}
        className={`rounded-lg border p-3 text-left text-sm transition ${strategy === s ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"}`}>
        <strong className="block">{STRATEGIES[s].name}</strong>
        <span className="text-xs text-muted-foreground">{STRATEGIES[s].risk} · ~{(STRATEGIES[s].rate * 100).toLocaleString("ro-RO")}%/an</span>
        <span className="block text-xs mt-1">În 10 ani: <b className="text-primary">{money(last[s]!)} RON</b></span>
      </button>)}</div>
    </div>

    <div className="h-56"><ResponsiveContainer><LineChart data={data}><CartesianGrid stroke="var(--border)" /><XAxis dataKey="an" fontSize={11} stroke="var(--muted-foreground)" /><YAxis fontSize={11} stroke="var(--muted-foreground)" width={50} /><Tooltip formatter={(v) => `${money(Number(v))} RON`} labelFormatter={(l) => `Anul ${l}`} /><Legend wrapperStyle={{ fontSize: 11 }} />
      <Line dataKey="depus" name="Depus" stroke="var(--border)" strokeDasharray="4 4" dot={false} />
      {ids.map((s) => <Line key={s} dataKey={s} name={STRATEGIES[s].name} stroke={COLORS[s]} strokeWidth={strategy === s ? 3 : 1.2} strokeOpacity={strategy === s ? 1 : 0.5} dot={false} />)}
    </LineChart></ResponsiveContainer></div>
    <p className="text-xs text-muted-foreground -mt-3">Proiecție pentru această sumă, fără depuneri noi. Randamentele sunt orientative, nu garantate.</p>

    <div className="rounded-xl border p-4 space-y-3">
      <p className="text-sm font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" />Datele cardului</p>
      <Input placeholder="Nume pe card" value={holder} onChange={(e) => setHolder(e.target.value)} autoComplete="cc-name" />
      <Input placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number" value={card}
        onChange={(e) => setCard(e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "))} />
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="LL/AA" inputMode="numeric" autoComplete="cc-exp" value={exp}
          onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d); }} />
        <Input placeholder="CVC" inputMode="numeric" autoComplete="cc-csc" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} />
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" />Plată simulată. Card de test: 4242 4242 4242 4242 (reușește) · 4000 0000 0000 0002 (refuzat). Nu salvăm datele cardului.</p>
    </div>

    {error && <p className="text-sm text-destructive">{error}</p>}
    <div className="flex gap-2">
      <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={stage === "processing"}>Mai târziu</Button>
      <Button className="flex-1" disabled={stage === "processing"}>{stage === "processing" ? <><Loader2 className="animate-spin" />Se procesează…</> : <>Plătește {money(value)} RON</>}</Button>
    </div>
  </form>;
}
