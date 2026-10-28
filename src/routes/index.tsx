import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { PaymentDialog } from "@/components/momentum/PaymentDialog";
import { FriendsView } from "@/components/momentum/FriendsView";
import { LineChart as LineIcon, PiggyBank, ArrowDownLeft, ArrowUpRight, BarChart3, Check, ChevronRight, FileText, FileUp, LayoutDashboard, Loader2, Users, Flame, LogOut, Plus, ShieldCheck, Sparkles, Sprout, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthForm } from "@/components/momentum/AuthForm";
import { useAccount } from "@/components/momentum/AuthProvider";
import { IsoMap } from "@/components/oasis/IsoMap";
import { BUILD_COST, BUILDING_NAMES, BANANA_CLEAN_COST, FIRE_REPAIR_COST, upgradeCost, type Analysis, type GameState } from "@/lib/game";
import { availablePoints, freshProgress, investmentProjection } from "@/lib/momentum";
import { RATE_FIDELIS, RATE_SP500 } from "@/lib/game";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { getDashboard, importStatement, cityAction, confirmInvestment, saveProfile } from "@/lib/momentum.functions";
import { supabase } from "@/integrations/supabase/client";
import { claimInvite } from "@/lib/social.functions";
import logo from "@/assets/momentum-logo.jpeg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Momentum — Finanțele tale, în mișcare" },
    { name: "description", content: "Analizează extrasele tale bancare, descoperă oportunități de economisire și urmărește progresul într-un cont personal Momentum." },
    { property: "og:title", content: "Momentum — Finanțele tale, în mișcare" },
    { property: "og:description", content: "Extrase reale. Un cont personal. O perspectivă nouă asupra economiilor tale." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Dashboard,
});
const money = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function Dashboard() {
  const { user, loading } = useAccount();
  const queryClient = useQueryClient();
  const load = useServerFn(getDashboard), upload = useServerFn(importStatement), act = useServerFn(cityAction), updateName = useServerFn(saveProfile), invest = useServerFn(confirmInvestment);
  const [investFor, setInvestFor] = useState<{ id: string; name: string; max: number } | null>(null);
  const query = useQuery({ queryKey: ["momentum", user?.id], queryFn: () => load(), enabled: Boolean(user), retry: false });
  const [authOpen, setAuthOpen] = useState(false), [profileOpen, setProfileOpen] = useState(false), [name, setName] = useState("");
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [drag, setDrag] = useState(false), [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<"overview" | "statements" | "city" | "invest" | "friends">("overview");
  const claim = useServerFn(claimInvite);
  useEffect(() => { const code = new URLSearchParams(window.location.search).get("invite"); if (code) { localStorage.setItem("momentum-invite", code); window.history.replaceState({}, "", "/"); } if (code && !user && !loading) setAuthOpen(true); }, [user, loading]);
  useEffect(() => {
    const code = user ? localStorage.getItem("momentum-invite") : null;
    if (!user || !code) return;
    localStorage.removeItem("momentum-invite");
    claim({ data: { code } }).then((r) => { setNotice(r.rewarded ? `Ești acum prieten cu ${r.friendName}! Ai primit 50 de puncte bonus.` : `Ești acum prieten cu ${r.friendName}.`); setView("friends"); void queryClient.invalidateQueries(); }).catch((e) => setNotice(e instanceof Error ? e.message : "Invitația nu a putut fi folosită."));
  }, [user, claim, queryClient]);
  const fileRef = useRef<HTMLInputElement>(null);
  const statements = query.data?.statements ?? [];
  const analyses = statements.map((s) => s.analysis as unknown as Analysis);
  const total = analyses.reduce((s, a) => s + a.total, 0), savings = analyses.reduce((s, a) => s + a.savings, 0), transactions = analyses.reduce((s, a) => s + a.transactions, 0);
  const saved = query.data?.progress as unknown as GameState | undefined;
  const progress = saved ?? freshProgress();
  const contributions = query.data?.contributions ?? [];
  const invested = contributions.reduce((s, c) => s + c.amount, 0);
  const investedIds = new Set(contributions.map((c) => c.statementId));
  const grants = query.data?.grants ?? [];
  const points = availablePoints([...contributions.map((c) => c.amount), ...grants.map((g) => g.amount)], progress.portfolio);
  const openInvest = (id: string, name: string, max: number) => { setInvestFor({ id, name, max }); };
  const buildings = progress.tiles.filter((t) => t.kind !== "empty").length;
  const habits = analyses.flatMap((a) => a.habits).reduce<Record<string, { label: string; total: number; count: number; emoji: string }>>((acc, h) => { const old = acc[h.key]; acc[h.key] = { label: h.label, total: (old?.total ?? 0) + h.total, count: (old?.count ?? 0) + h.count, emoji: h.emoji }; return acc; }, {});
  async function onFile(file?: File) {
    if (!file) return;
    if (!user) { setAuthOpen(true); return; }
    setBusy(true); setNotice("");
    try {
      const { extractText } = await import("@/lib/parse-statement");
      const text = await extractText(file);
      const res = await upload({ data: { text, fileName: file.name } });
      await queryClient.invalidateQueries({ queryKey: ["momentum", user.id] });
      setNotice("Extrasul a fost analizat. Confirmă investiția pentru a primi puncte.");
      openInvest(res.statementId, file.name, res.savings);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Extrasul nu a putut fi importat."); }
    finally { setBusy(false); }
  }
  async function buildCity(kind: "house" | "cafe" | "road" | "upgrade" | "repair" | "clean", index = selected) {
    if (index === null || !user) return;
    setBusy(true); setNotice("");
    try { await act({ data: { index, kind } }); await queryClient.invalidateQueries({ queryKey: ["momentum", user.id] }); setSelected(null); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Acțiunea nu a reușit."); } finally { setBusy(false); }
  }
  const tile = selected === null ? null : progress.tiles[selected];
  return <div className="momentum-shell">
    <aside className="app-sidebar">
      <a href="/" className="brand"><img src={logo.url} alt="Logo Momentum" /><span>Momentum<span className="brand-dot">.</span></span></a>
      <div className="sidebar-label">SPAȚIUL TĂU</div>
      <nav className="app-nav" aria-label="Navigare principală">
        <Button variant="ghost" className={view === "overview" ? "nav-active" : ""} onClick={() => setView("overview")}><LayoutDashboard />Prezentare generală</Button>
        <Button variant="ghost" className={view === "statements" ? "nav-active" : ""} onClick={() => setView("statements")}><FileText />Extrasele mele<span className="nav-count">{statements.length}</span></Button>
        <Button variant="ghost" className={view === "city" ? "nav-active" : ""} onClick={() => setView("city")}><Sprout />Orașul meu</Button>
        <Button variant="ghost" className={view === "invest" ? "nav-active" : ""} onClick={() => setView("invest")}><LineIcon />Investițiile mele</Button>
        <Button variant="ghost" className={view === "friends" ? "nav-active" : ""} onClick={() => setView("friends")}><Users />Prieteni</Button>
      </nav>
      <div className="sidebar-bottom"><ShieldCheck /><div><strong>Datele tale sunt private</strong><p>Accesibile doar în contul tău.</p></div></div>
    </aside>
    <div className="app-body">
      <header className="app-topbar"><span className="text-sm text-muted-foreground">Spațiul personal <ChevronRight className="inline h-3 w-3 mx-2" /><span className="text-foreground">{view === "overview" ? "Prezentare generală" : view === "city" ? "Orașul meu" : view === "invest" ? "Investițiile mele" : view === "friends" ? "Prieteni" : "Extrasele mele"}</span></span>
        {user ? <div className="flex gap-2"><Button variant="ghost" onClick={() => { setName(query.data?.displayName ?? ""); setProfileOpen(true); }}><span className="account-avatar"><UserRound /></span><span className="hidden sm:inline">{query.data?.displayName || "Contul meu"}</span></Button><Button variant="ghost" size="icon" aria-label="Deconectare" title="Deconectare" onClick={async () => { await supabase.auth.signOut(); setSelected(null); setNotice(""); }}><LogOut /></Button></div> : <Button onClick={() => setAuthOpen(true)} disabled={loading}><UserRound />{loading ? "Se încarcă" : "Conectează-te"}</Button>}
      </header>
      <main className="dashboard-content">
        <div className="page-heading"><div><div className="eyebrow"><span />MAI MULTĂ CLARITATE. MAI MULT MOMENTUM.</div><h1>{view === "friends" ? "Prietenii tăi." : view === "invest" ? "Investiția ta în timp." : view === "city" ? "Orașul tău, pas cu pas." : view === "statements" ? "Extrasele tale." : user && query.data?.displayName ? `Salut, ${query.data.displayName}.` : "Finanțele tale, în mișcare."}</h1><p>{view === "city" ? "Progres virtual bazat pe oportunitățile din extrase." : "O perspectivă nouă asupra obiceiurilor tale financiare."}</p></div>
          <Button className="h-11" disabled={busy} onClick={() => user ? fileRef.current?.click() : setAuthOpen(true)}><Plus />Adaugă extras</Button>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.csv,.txt" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
        {(notice || query.error) && <div role="status" className="notice"><span>{notice || "Datele nu pot fi încărcate momentan."}</span>{query.error && <Button variant="outline" size="sm" onClick={() => query.refetch()}>Reîncearcă</Button>}<Button variant="ghost" size="icon" aria-label="Închide mesajul" onClick={() => setNotice("")}><X /></Button></div>}
        {query.isFetching && <div className="mb-3 flex gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Se încarcă datele tale…</div>}
        {view !== "city" && view !== "invest" && view !== "friends" && <div className="metric-grid">
          <Metric label="Cheltuieli identificate" value={statements.length ? money(total) : "—"} unit="RON" icon={ArrowUpRight} detail={`${transactions} tranzacții clasificate`} />
          <Metric label="Potențial de economisire" value={statements.length ? money(savings) : "—"} unit="RON" icon={ArrowDownLeft} detail="Estimare: 30% din cheltuielile clasificate" accent />
          <Metric label="Puncte Momentum" value={String(points)} unit="puncte" icon={Sparkles} detail={`Din ${money(invested)} RON investiți confirmați`} />
        </div>}
        {view === "overview" && <div className="overview-grid">
          <section className="upload-section"><div className="section-heading"><h2>Un nou început</h2><span className="small-tag">EXTRAS BANCAR</span></div><h3>Din obiceiuri mici,<br />oportunități mari.</h3><p className="text-sm text-muted-foreground mt-3 mb-6">{user ? "Adaugă un extras pentru o analiză a cheltuielilor tale." : "Conectează-te pentru a analiza și salva propriile extrase."}</p>
            <div className={`upload-zone ${drag ? "upload-drag" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void onFile(e.dataTransfer.files[0]); }}>
              <span className="upload-icon"><FileUp /></span><strong>Extrasul tău, punctul de plecare</strong><span>Revolut PDF sau CSV · alte bănci CSV · maximum 20 MB</span><Button variant="outline" disabled={busy} onClick={() => user ? fileRef.current?.click() : setAuthOpen(true)}>{busy ? <Loader2 className="animate-spin" /> : <FileUp />}{busy ? "Se analizează…" : "Alege un fișier"}</Button>
            </div><div className="privacy-note"><ShieldCheck /><span>Fișierul este citit local. Se salvează doar analiza, nu extrasul original.</span></div>
          </section>
          <City onClean={() => buildCity("clean", 0)} busy={busy} progress={progress} points={points} buildings={buildings} selected={selected} onSelect={(i) => user ? setSelected(i) : setAuthOpen(true)} />
        </div>}
        {view === "city" && <City onClean={() => buildCity("clean", 0)} busy={busy} progress={progress} points={points} buildings={buildings} selected={selected} onSelect={(i) => user ? setSelected(i) : setAuthOpen(true)} />}
        {view === "friends" && (user ? <FriendsView userId={user.id} inviteCode={query.data?.inviteCode ?? ""} points={points} onNotice={setNotice} /> : <div className="empty-list"><Users /><h3>Conectează-te</h3><p>Ai nevoie de un cont ca să inviți prieteni.</p><Button onClick={() => setAuthOpen(true)}>Conectează-te</Button></div>)}
        {view === "invest" && <InvestView invested={invested} count={contributions.length} statements={statements.length} />}
        {view !== "city" && view !== "invest" && view !== "friends" && <div className="lower-grid"><section><div className="section-heading"><h2>Extrase recente</h2>{view === "overview" && <Button variant="ghost" size="sm" onClick={() => setView("statements")}>Vezi toate<ArrowUpRight /></Button>}</div>
          {statements.length === 0 ? <div className="empty-list"><FileText /><h3>Niciun extras încă</h3><p>Datele tale vor apărea aici după primul import.</p></div> : <div className="statement-list">{statements.map((s) => { const a = s.analysis as unknown as Analysis; return <div className="statement-row" key={s.id}><span className="file-symbol"><FileText /></span><div className="min-w-0 flex-1"><strong className="block truncate">{s.file_name}</strong><p>{new Date(s.created_at).toLocaleDateString("ro-RO")} · {a.transactions} tranzacții clasificate</p></div><div className="text-right"><strong>{money(a.total)} <span className="text-muted-foreground font-normal">RON</span></strong>{investedIds.has(s.id) ? <p className="text-accent flex items-center justify-end gap-1"><Check className="h-3 w-3" />Investit</p> : <Button size="sm" variant="outline" className="mt-1" onClick={() => openInvest(s.id, s.file_name, a.savings)}><PiggyBank />Investește</Button>}</div></div>; })}</div>}
        </section><section><div className="section-heading"><h2>Obiceiurile tale</h2><BarChart3 className="h-4 w-4 text-muted-foreground" /></div>{Object.keys(habits).length === 0 ? <div className="empty-list"><BarChart3 /><h3>Fără categorii identificate</h3><p>Doar cheltuielile recunoscute în RON sunt incluse.</p></div> : <div className="habit-list">{Object.values(habits).sort((a,b) => b.total - a.total).map((h) => <div key={h.label}><div className="flex justify-between gap-2 text-sm"><span>{h.emoji} {h.label}</span><strong>{money(h.total)} RON</strong></div><progress max={total} value={h.total} /><p className="text-xs text-muted-foreground">{h.count} tranzacții</p></div>)}</div>}</section></div>}
        <footer className="dashboard-footer"><span>Momentum<span className="text-primary">.</span></span><p>Analiză orientativă · Oraș și puncte virtuale · Investițiile sunt confirmate de tine</p><ShieldCheck className="h-4 w-4 text-muted-foreground" /></footer>
      </main>
    </div>
    <Dialog open={authOpen && !user} onOpenChange={setAuthOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-3"><img src={logo.url} alt="Momentum" className="h-9 w-9 rounded-lg" />Momentum</DialogTitle></DialogHeader><div className="py-5"><AuthForm /></div></DialogContent></Dialog>
    <Dialog open={profileOpen} onOpenChange={setProfileOpen}><DialogContent><DialogHeader><DialogTitle>Profilul tău</DialogTitle></DialogHeader><form className="space-y-5" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await updateName({ data: { displayName: name } }); await queryClient.invalidateQueries({ queryKey: ["momentum", user?.id] }); setProfileOpen(false); } catch { setNotice("Numele nu a putut fi salvat."); } finally { setBusy(false); } }}><label className="block text-sm">Nume afișat<Input className="mt-2" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></label><Button disabled={busy}><Check />Salvează</Button></form></DialogContent></Dialog>
    <PaymentDialog target={investFor} onClose={() => setInvestFor(null)} onPay={async (p) => { if (!user) return; const r = await invest({ data: { statementId: investFor!.id, ...p } }); await queryClient.invalidateQueries({ queryKey: ["momentum", user.id] }); setNotice(`Ai investit ${money(r.amount)} RON și ai primit ${Math.floor(r.amount)} puncte.`); }} />
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{tile?.kind === "empty" ? "Construiește în orașul tău" : "Clădirea ta"}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{points} puncte disponibile · recompense virtuale</p>{tile?.kind === "empty" ? <div className="space-y-2">{(["house", "cafe", "road"] as const).map((kind) => <Button key={kind} variant="outline" className="w-full justify-between h-auto min-h-11 whitespace-normal text-left" disabled={busy || progress.bananas || points < BUILD_COST[kind]} onClick={() => buildCity(kind)}><span>{kind === "house" ? "Căsuță" : kind === "cafe" ? "Cafenea" : "Stradă"}</span><span>{BUILD_COST[kind]} puncte</span></Button>)}</div> : tile && <><p>{tile.kind === "house" ? BUILDING_NAMES.house[tile.level] : BUILDING_NAMES[tile.kind]}</p>{tile.onFire ? <Button variant="destructive" disabled={busy || points < FIRE_REPAIR_COST} onClick={() => buildCity("repair")}><Flame />Stinge și repară · {FIRE_REPAIR_COST} puncte</Button> : upgradeCost(tile) !== null ? <Button disabled={busy || points < (upgradeCost(tile) ?? 0)} onClick={() => buildCity("upgrade")}>Upgrade · {upgradeCost(tile)} puncte</Button> : <p className="text-sm text-accent">Nivel maxim</p>}</>}</DialogContent></Dialog>
  </div>;
}
function Metric({ label, value, unit, icon: Icon, detail, accent }: { label: string; value: string; unit: string; icon: typeof FileUp; detail: string; accent?: boolean }) {
  return <section className={`metric ${accent ? "metric-accent" : ""}`}><div className="flex justify-between items-center"><h2>{label}</h2><span className="metric-icon"><Icon /></span></div><div className="metric-value">{value}<span>{unit}</span></div><p>{detail}</p></section>;
}
function City({ progress, points, buildings, selected, onSelect, onClean, busy }: { progress: GameState; points: number; buildings: number; selected: number | null; onSelect: (i: number) => void; onClean: () => void; busy: boolean }) {
  const burning = progress.tiles.filter((t) => t.onFire).length;
  return <section className="city-section"><div className="section-heading"><h2>Orașul tău Momentum</h2><span className="city-live"><span />{buildings} clădiri</span></div>{progress.bananas && <div className="notice"><span>🍌 Un prieten ți-a umplut orașul cu coji de banane. Nu poți construi până nu cureți.</span><Button size="sm" disabled={busy || points < BANANA_CLEAN_COST} onClick={onClean}>Curăță · {BANANA_CLEAN_COST} puncte</Button></div>}{burning > 0 && <div className="notice"><span><Flame className="inline h-4 w-4 text-destructive" /> {burning} clădiri ard după un atac cu meteoriți. Atinge-le ca să le repari ({FIRE_REPAIR_COST} puncte fiecare).</span></div>}<div className="city-map"><IsoMap bananas={progress.bananas} tiles={progress.tiles} tokens={points} cloudy={false} carsStopped={false} ruined={false} selected={selected} onSelect={(i) => onSelect(i)} /></div><div className="city-caption"><span className="city-caption-icon"><Sprout /></span><div><strong>{buildings ? "Progresul prinde contur." : "Loc pentru un viitor mai bun."}</strong><p>{buildings ? `${buildings} clădiri în orașul tău virtual` : "Orașul tău începe cu primul extras."}</p></div><span className="small-tag">VIRTUAL</span></div></section>;
}

function InvestView({ invested, count, statements }: { invested: number; count: number; statements: number }) {
  const avg = count ? invested / count : 0;
  const [monthly, setMonthly] = useState(Math.round(avg) || 100), [years, setYears] = useState(10);
  const fid = investmentProjection(invested, monthly, years, RATE_FIDELIS), sp = investmentProjection(invested, monthly, years, RATE_SP500);
  const data = fid.map((d, i) => ({ an: d.an, depus: d.depus, fidelis: d.valoare, sp: sp[i]!.valoare }));
  const last = data[data.length - 1]!;
  return <div className="space-y-4">
    <div className="metric-grid">
      <Metric label="Investit până acum" value={money(invested)} unit="RON" icon={PiggyBank} detail={`${count} din ${statements} extrase confirmate`} />
      <Metric label={`Valoare estimată în ${years} ani`} value={money(last.fidelis)} unit="RON" icon={LineIcon} detail="Titluri de stat ~6,5%/an" accent />
      <Metric label="Scenariu bursă" value={money(last.sp)} unit="RON" icon={ArrowUpRight} detail={`Indice ~9%/an · depus ${money(last.depus)} RON`} />
    </div>
    <section className="city-section"><div className="section-heading"><h2>Cum evoluează investiția ta</h2><span className="small-tag">PROIECȚIE</span></div>
      <div className="grid gap-4 sm:grid-cols-2 my-4 text-sm">
        <label>Investești lunar: <b className="text-primary">{monthly} RON</b>{count > 0 && <span className="text-muted-foreground"> (media ta: {Math.round(avg)} RON)</span>}<input type="range" min={0} max={2000} step={10} value={monthly} onChange={(e) => setMonthly(+e.target.value)} className="mt-2 w-full accent-[var(--primary)]" /></label>
        <label>Orizont: <b className="text-primary">{years} ani</b><input type="range" min={1} max={30} value={years} onChange={(e) => setYears(+e.target.value)} className="mt-2 w-full accent-[var(--primary)]" /></label>
      </div>
      <div className="h-72"><ResponsiveContainer><LineChart data={data}><CartesianGrid stroke="var(--border)" /><XAxis dataKey="an" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} /><Tooltip formatter={(v) => `${money(Number(v))} RON`} labelFormatter={(l) => `Anul ${l}`} /><Legend />
        <Line type="monotone" dataKey="depus" name="Bani depuși" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} />
        <Line type="monotone" dataKey="fidelis" name="Titluri de stat 6,5%" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="sp" name="Bursă 9%" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
      </LineChart></ResponsiveContainer></div>
      <p className="text-xs text-muted-foreground mt-3">Estimare orientativă cu dobândă compusă lunar, dacă păstrezi ritmul de investiții. Randamentele nu sunt garantate.</p>
    </section>
  </div>;
}
