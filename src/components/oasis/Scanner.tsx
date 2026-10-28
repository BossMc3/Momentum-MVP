import { motion } from "framer-motion";
import { Bot, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { Analysis } from "@/lib/game";
import { Modal } from "./Modal";

export function Scanner({ open, analysis, source, onClose, onInvest }: {
  open: boolean; analysis: Analysis | null; source: string; onClose: () => void; onInvest: (amount: number) => void;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!open) return;
    setStep(0);
    const ts = [900, 1900, 2900].map((d, i) => setTimeout(() => setStep(i + 1), d));
    return () => ts.forEach(clearTimeout);
  }, [open, analysis]);

  const steps = [
    `Se extrag tranzacțiile din ${source}...`,
    "Agentul AI clasifică cheltuielile recurente...",
    `S-au identificat ${analysis?.transactions ?? 0} tranzacții de tip „Plăceri Vinovate”...`,
  ];
  const done = step >= 3;
  const empty = done && analysis && analysis.transactions === 0;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-accent/20 p-2 text-accent"><Bot className="h-6 w-6" /></div>
        <div>
          <h2 className="font-display text-xl text-primary">Agentul Financiar Oasis</h2>
          <p className="text-xs text-muted-foreground">Analiză comportamentală a extrasului</p>
        </div>
      </div>
      <ul className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className={`flex items-center gap-2 text-sm transition-opacity ${step >= i ? "opacity-100" : "opacity-30"}`}>
            {step > i ? <CheckCircle2 className="h-4 w-4 text-accent" /> : step === i ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4" />}
            {s}
          </li>
        ))}
      </ul>

      {empty && (
        <p className="mt-6 rounded-xl bg-muted p-4 text-sm">Nu am găsit plăceri vinovate în acest document. Încearcă extrasul demo!</p>
      )}

      {done && analysis && analysis.transactions > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Obiceiuri detectate</h3>
            <div className="space-y-2">
              {analysis.habits.map((h) => (
                <div key={h.key} className="flex items-center justify-between text-sm">
                  <span>{h.emoji} <b>{h.count}x</b> {h.label}</span>
                  <span className="font-semibold text-amber">{Math.round(h.total)} RON/săpt</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
                <span>Total săptămânal</span><span>{analysis.total} RON</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm leading-relaxed">
            <Sparkles className="mb-1 inline h-4 w-4 text-primary" />{" "}
            „Nu renunța la stilul tău de viață! Dar dacă reduci comenzile și cafelele cu doar <b>30%</b> săptămâna aceasta,
            eliberezi <b className="text-primary">{analysis.savings} RON</b>. Investind această sumă acum, primești{" "}
            <b className="text-primary">+{analysis.savings} Oasis Tokens</b> pentru a-ți construi orașul!”
          </div>
          <button onClick={() => onInvest(analysis.savings)} className="btn-gold w-full rounded-xl py-3 font-bold">
            Investește {analysis.savings} RON & Revendică {analysis.savings} Tokeni 🪙
          </button>
        </motion.div>
      )}
    </Modal>
  );
}
