import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { AlertTriangle, Building2, Globe2, Landmark, ShieldCheck, Users } from "lucide-react";
import { BUCHAREST_DOWN_PAYMENT, RATE_FIDELIS, RATE_SP500, futureValue, lostInterest } from "@/lib/game";
import { Modal } from "./Modal";

const ron = (n: number) => `${n.toLocaleString("ro-RO")} RON`;

export function Projection({ open, onClose, portfolio, avgWeekly }: { open: boolean; onClose: () => void; portfolio: number; avgWeekly: number }) {
  const [weekly, setWeekly] = useState(Math.max(50, avgWeekly || 150));
  const [years, setYears] = useState(20);
  const data = useMemo(() => Array.from({ length: years + 1 }, (_, y) => ({
    an: y,
    fidelis: futureValue(portfolio, weekly * 52, y, RATE_FIDELIS),
    sp: futureValue(portfolio, weekly * 52, y, RATE_SP500),
  })), [portfolio, weekly, years]);
  const final = data[data.length - 1] ?? { an: 0, fidelis: portfolio, sp: portfolio };
  const yearsToApt = data.find((d) => d.fidelis >= BUCHAREST_DOWN_PAYMENT)?.an;

  return (
    <Modal open={open} onClose={onClose} wide>
      <h2 className="font-display text-2xl text-primary">📈 Proiecție Viitor — Dobânda Compusă</h2>
      <p className="mt-1 text-sm text-muted-foreground">Portofoliul tău actual: <b className="text-foreground">{ron(portfolio)}</b></p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label className="text-sm">Economisești săptămânal: <b className="text-primary">{weekly} RON</b>
          <input type="range" min={25} max={500} step={25} value={weekly} onChange={(e) => setWeekly(+e.target.value)} className="mt-2 w-full accent-[var(--gold)]" />
        </label>
        <label className="text-sm">Orizont: <b className="text-primary">{years} ani</b>
          <input type="range" min={1} max={30} value={years} onChange={(e) => setYears(+e.target.value)} className="mt-2 w-full accent-[var(--gold)]" />
        </label>
      </div>
      <div className="mt-4 h-64">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="var(--border)" />
            <XAxis dataKey="an" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} formatter={(v) => ron(Number(v))} labelFormatter={(l) => `Anul ${l}`} />
            <Legend />
            <ReferenceLine y={BUCHAREST_DOWN_PAYMENT} stroke="var(--amber)" strokeDasharray="5 5" label={{ value: "Avans apartament București", fill: "var(--amber)", fontSize: 11 }} />
            <Line type="monotone" dataKey="fidelis" name="Titluri de Stat Fidelis/Tezaur 6.5% (scutit de impozit)" stroke="var(--emerald)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="sp" name="S&P 500 / BET 9%" stroke="var(--gold)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[5, 10, 20, 30].map((y) => (
          <div key={y} className="rounded-xl border border-border bg-muted/50 p-3 text-center">
            <div className="text-xs text-muted-foreground">{y} ani</div>
            <div className="font-bold text-accent">{ron(futureValue(portfolio, weekly * 52, y, RATE_FIDELIS))}</div>
            <div className="text-xs text-primary">{ron(futureValue(portfolio, weekly * 52, y, RATE_SP500))}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-xl bg-primary/10 p-3 text-sm">
        🏠 Avansul pentru un apartament de 2 camere în București (~{ron(BUCHAREST_DOWN_PAYMENT)}):{" "}
        {yearsToApt !== undefined ? <>atins în <b className="text-primary">{yearsToApt} ani</b> doar din plăceri vinovate reduse.</> : <>în {years} ani ai acumula {ron(final.fidelis)} — mărește orizontul!</>}
      </p>
    </Modal>
  );
}

export function JudgeInfo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cards = [
    { icon: Users, t: "Cui se adresează", d: "Gen Z și tinerilor profesioniști din România care suferă de anxietate financiară și paralizie decizională. Nu le cerem sacrificii, ci compromisuri de 30%." },
    { icon: Globe2, t: "De ce România", d: "Cea mai rapidă adopție a plăților cu cardul și a livrărilor de mâncare din CEE, dar cea mai scăzută participare la bursă. Oasis face puntea dintre stilul de viață și titlurile de stat Fidelis/Tezaur garantate de stat." },
    { icon: Landmark, t: "Date & Open Banking", d: "Strat de gamificare comportamentală peste PSD2 Open Banking (AISP pentru citirea tranzacțiilor) și Stripe Payment Intents pentru inițierea depunerilor." },
    { icon: ShieldCheck, t: "Reglementare (Sandbox)", d: "Arhitectură pass-through: Oasis nu deține niciodată fondurile clienților, evitând licențierea de custode ASF/BNR. Banii merg direct la broker/Trezorerie." },
    { icon: Building2, t: "Model de business", d: "Lead-generation B2B pentru bănci și brokeri (cost per cont deschis) + Freemium: skin-uri premium pentru oraș, clădiri rare și provocări sezoniere." },
    { icon: AlertTriangle, t: "Loss Aversion", d: "Retragerea timpurie degradează vizibil orașul. Pierderea emoțională a clădirilor transformă dobânda compusă abstractă într-o consecință tangibilă." },
  ];
  return (
    <Modal open={open} onClose={onClose} wide>
      <h2 className="font-display text-2xl text-primary">⚖️ Arhitectură, Reglementări & Context România</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {cards.map(({ icon: I, t, d }) => (
          <div key={t} className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold"><I className="h-5 w-5 text-accent" />{t}</div>
            <p className="text-sm leading-relaxed text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
      <pre className="mt-5 overflow-x-auto rounded-xl bg-background/60 p-4 text-xs text-muted-foreground">{`Bancă (PSD2 AISP) ──► Oasis AI Agent ──► Propunere compromis 30%
                                   │
Utilizator aprobă ──► Stripe PaymentIntent ──► Broker / Trezorerie (Fidelis, Tezaur, ETF)
                                   │
                     Oasis Tokens ──► Orașul izometric (fără custodie de fonduri)`}</pre>
    </Modal>
  );
}

export function Withdraw({ open, onClose, portfolio, onConfirm }: { open: boolean; onClose: () => void; portfolio: number; onConfirm: (f: 0.5 | 1) => void }) {
  return (
    <Modal open={open} onClose={onClose} danger>
      <div className="text-center">
        <AlertTriangle className="mx-auto h-12 w-12 animate-pulse text-destructive" />
        <h2 className="mt-2 font-display text-2xl text-destructive">Sparge Economiile?</h2>
        {portfolio <= 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nu ai nimic investit încă. Analizează un extras pentru a începe.</p>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed">
              Atenție! Retragerea timpurie a celor <b>{ron(portfolio)}</b> îți va anula dobânda compusă de{" "}
              <b className="text-destructive">{ron(lostInterest(portfolio))}</b> (10 ani, 6.5%) și va declanșa degradarea clădirilor din orașul tău!
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={() => onConfirm(0.5)} className="rounded-xl border border-destructive/60 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10">
                Retrage 50% ({ron(Math.round(portfolio / 2))})
              </button>
              <button onClick={() => onConfirm(1)} className="rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground hover:opacity-90">
                Retrage 100% ({ron(portfolio)})
              </button>
            </div>
            <button onClick={onClose} className="btn-emerald mt-4 w-full rounded-xl py-3 font-bold">Păstrează viitorul (Anulează)</button>
          </>
        )}
      </div>
    </Modal>
  );
}
