import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Flame, Loader2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IsoMap } from "@/components/oasis/IsoMap";
import { attackFriend, claimInvite, getFriendCity, getFriends } from "@/lib/social.functions";
import { BANANA_CLEAN_COST, BANANA_COST, FIRE_REPAIR_COST, INVITEE_BONUS, INVITER_BONUS, METEOR_COST } from "@/lib/game";

export function FriendsView({ userId, inviteCode, points, onNotice }: { userId: string; inviteCode: string; points: number; onNotice: (m: string) => void }) {
  const qc = useQueryClient();
  const list = useServerFn(getFriends), loadCity = useServerFn(getFriendCity), attack = useServerFn(attackFriend), claim = useServerFn(claimInvite);
  const friends = useQuery({ queryKey: ["friends", userId], queryFn: () => list() });
  const [open, setOpen] = useState<string | null>(null);
  const city = useQuery({ queryKey: ["friend-city", open], queryFn: () => loadCity({ data: { friendId: open! } }), enabled: Boolean(open) });
  const [code, setCode] = useState(""), [busy, setBusy] = useState(false);
  const link = typeof window !== "undefined" && inviteCode ? `${window.location.origin}/?invite=${inviteCode}` : "";
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["friends", userId] }), qc.invalidateQueries({ queryKey: ["friend-city"] }), qc.invalidateQueries({ queryKey: ["momentum", userId] })]);

  async function doAttack(kind: "meteor" | "banana") {
    if (!open) return;
    setBusy(true);
    try { await attack({ data: { friendId: open, kind } }); await refresh(); onNotice(kind === "meteor" ? "☄️ Meteoriții au lovit! Clădirile prietenului ard." : "🍌 Ai aruncat coji de banane peste orașul prietenului."); }
    catch (e) { onNotice(e instanceof Error ? e.message : "Atacul nu a reușit."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <div className="overview-grid">
      <section className="upload-section">
        <div className="section-heading"><h2>Invită un prieten</h2><span className="small-tag">+{INVITER_BONUS} PUNCTE</span></div>
        <p className="text-sm text-muted-foreground mb-4">Când un prieten își face cont prin linkul tău, tu primești {INVITER_BONUS} puncte, iar el {INVITEE_BONUS} puncte gratuite. Deveniți automat prieteni.</p>
        <div className="flex gap-2"><Input readOnly value={link} aria-label="Linkul tău de invitație" /><Button variant="outline" disabled={!link} onClick={async () => { await navigator.clipboard.writeText(link); onNotice("Linkul a fost copiat."); }}><Copy />Copiază</Button></div>
        <p className="text-sm mt-3">Codul tău de prieten: <b className="text-primary tracking-widest">{inviteCode || "—"}</b></p>
        <form className="flex gap-2 mt-5" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { const r = await claim({ data: { code } }); setCode(""); await refresh(); onNotice(`Ești acum prieten cu ${r.friendName}.${r.rewarded ? ` Ai primit ${INVITEE_BONUS} puncte bonus.` : ""}`); } catch (err) { onNotice(err instanceof Error ? err.message : "Codul nu a putut fi folosit."); } finally { setBusy(false); } }}>
          <Input placeholder="Codul unui prieten" value={code} onChange={(e) => setCode(e.target.value)} required minLength={4} /><Button disabled={busy}><UserPlus />Adaugă</Button>
        </form>
      </section>
      <section className="city-section">
        <div className="section-heading"><h2>Prietenii tăi</h2><Users className="h-4 w-4 text-muted-foreground" /></div>
        {friends.isLoading ? <Loader2 className="animate-spin" /> : !friends.data?.friends.length ? <div className="empty-list"><Users /><h3>Niciun prieten încă</h3><p>Trimite linkul de invitație ca să începeți.</p></div> :
          <div className="statement-list">{friends.data.friends.map((f) => <div key={f.id} className="statement-row"><span className="account-avatar"><Users /></span><div className="min-w-0 flex-1"><strong className="block truncate">{f.name}</strong><p>{f.buildings} clădiri{f.burning ? ` · 🔥 ${f.burning} ard` : ""}{f.bananas ? " · 🍌 coji de banane" : ""}</p></div><Button size="sm" variant="outline" onClick={() => setOpen(f.id)}><Eye />Vezi orașul</Button></div>)}</div>}
      </section>
    </div>
    <section className="city-section">
      <div className="section-heading"><h2>Istoric atacuri</h2><Flame className="h-4 w-4 text-muted-foreground" /></div>
      {!friends.data?.attacks.length ? <p className="text-sm text-muted-foreground">Niciun atac încă.</p> : <ul className="space-y-2 text-sm">{friends.data.attacks.map((a) => <li key={a.id}>{a.kind === "meteor" ? "☄️" : "🍌"} {a.incoming ? <><b>{a.other}</b> a atacat orașul tău</> : <>Ai atacat orașul lui <b>{a.other}</b></>} cu {a.kind === "meteor" ? "meteoriți" : "banane"} · <span className="text-muted-foreground">{new Date(a.createdAt).toLocaleString("ro-RO")}</span></li>)}</ul>}
    </section>
    <Dialog open={open !== null} onOpenChange={(o) => { if (!o) setOpen(null); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Orașul lui {city.data?.name ?? "…"}</DialogTitle></DialogHeader>
        {city.isLoading || !city.data ? <Loader2 className="animate-spin" /> : <>
          <div className="city-map"><IsoMap tiles={city.data.progress.tiles} bananas={city.data.progress.bananas} tokens={0} cloudy={false} carsStopped={false} ruined={false} selected={null} onSelect={() => {}} /></div>
          <p className="text-sm text-muted-foreground">Ai {points} puncte. Atacurile sunt virtuale și afectează doar orașul prietenului.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="destructive" className="h-auto py-3 flex-col" disabled={busy || points < METEOR_COST} onClick={() => doAttack("meteor")}><span>☄️ Meteoriți · {METEOR_COST} puncte</span><span className="text-xs font-normal opacity-80">Incendiază până la 3 clădiri · reparație {FIRE_REPAIR_COST}/clădire</span></Button>
            <Button variant="outline" className="h-auto py-3 flex-col" disabled={busy || points < BANANA_COST || city.data.progress.bananas} onClick={() => doAttack("banana")}><span>🍌 Coji de banane · {BANANA_COST} puncte</span><span className="text-xs font-normal opacity-80">Blochează construcția · curățare {BANANA_CLEAN_COST}</span></Button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </div>;
}
