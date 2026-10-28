import { motion } from "framer-motion";
import { GRID, type Tile } from "@/lib/game";
import { Cafe, Cottage, Cracks, Manor, Pine, Road, Townhouse, degradeFilter } from "./Buildings";

const HW = 60, HH = 30;
const center = (r: number, c: number) => [(c - r) * HW, (c + r) * HH] as const;
const diamond = (cx: number, cy: number) =>
  `${cx},${cy - HH} ${cx + HW},${cy} ${cx},${cy + HH} ${cx - HW},${cy}`;
const hash = (r: number, c: number) => Math.abs(Math.sin(r * 12.9898 + c * 78.233) * 43758.5453) % 1;

interface Props {
  tiles: Tile[];
  tokens: number;
  cloudy: boolean;
  carsStopped: boolean;
  ruined: boolean;
  selected: number | null;
  onSelect: (i: number, e: React.MouseEvent) => void;
  bananas?: boolean | undefined;
}

function Flames() {
  return <g pointerEvents="none">
    {[-16, 0, 16].map((o, k) => <path key={o} d={`M${o - 9},-6 Q${o - 10},-30 ${o},-${48 + k * 6} Q${o + 10},-30 ${o + 9},-6 Z`} fill="#f97316" opacity={0.9}>
      <animate attributeName="opacity" values="0.6;1;0.6" dur={`${0.6 + k * 0.2}s`} repeatCount="indefinite" />
    </path>)}
    {[-8, 8].map((o) => <path key={o} d={`M${o - 5},-8 Q${o - 5},-22 ${o},-32 Q${o + 5},-22 ${o + 5},-8 Z`} fill="#fde047" />)}
    <ellipse cx={0} cy={-70} rx={22} ry={10} fill="#44403c" opacity={0.45}><animate attributeName="cy" values="-60;-90;-60" dur="2s" repeatCount="indefinite" /></ellipse>
  </g>;
}
function Peel({ x, y, rot }: { x: number; y: number; rot: number }) {
  return <g transform={`translate(${x},${y}) rotate(${rot})`} pointerEvents="none">
    <path d="M-10,0 Q0,-8 10,0 Q0,-3 -10,0 Z" fill="#facc15" stroke="#a16207" strokeWidth={1} />
    <path d="M0,-3 Q-6,6 -9,9 M0,-3 Q6,6 9,9" stroke="#eab308" strokeWidth={3} fill="none" strokeLinecap="round" />
  </g>;
}

export function IsoMap({ tiles, tokens, cloudy, carsStopped, ruined, selected, onSelect, bananas }: Props) {
  const dead = ruined || cloudy;
  const decor: { r: number; c: number }[] = [];
  for (let r = -2; r <= GRID + 1; r++)
    for (let c = -2; c <= GRID + 1; c++)
      if (r < 0 || c < 0 || r >= GRID || c >= GRID) decor.push({ r, c });
  decor.sort((a, b) => a.r + a.c - (b.r + b.c));

  const cells = tiles.map((t, i) => ({ t, i, r: Math.floor(i / GRID), c: i % GRID }));
  const L = -2, Rm = GRID + 1;
  // island edge (dirt thickness)
  const [lx, ly] = center(Rm, L), [bx, by] = center(Rm, Rm), [rx, ry] = center(L, Rm);
  const D = 34;

  return (
    <svg viewBox="-560 -150 1120 760" className="h-full w-full select-none" role="img" aria-label="Harta orașului Momentum">
      <defs>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dead ? "#6f7a52" : "#6cbf4a"} />
          <stop offset="1" stopColor={dead ? "#5c6544" : "#4f9c38"} />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={dead ? "#3e5560" : "#3fa3d8"} />
          <stop offset="1" stopColor={dead ? "#2c3f48" : "#2a78b5"} />
        </linearGradient>
      </defs>

      <polygon points={`${lx - HW},${ly} ${bx},${by + HH} ${bx},${by + HH + D} ${lx - HW},${ly + D}`} fill="#6b4a2b" />
      <polygon points={`${bx},${by + HH} ${rx + HW},${ry} ${rx + HW},${ry + D} ${bx},${by + HH + D}`} fill="#523820" />

      {decor.map(({ r, c }) => {
        const [x, y] = center(r, c);
        const river = c === GRID + 1 || (r === -2 && c >= 2);
        const path = c === -1 && r >= 0 && r < GRID;
        const h = hash(r, c);
        return (
          <g key={`d${r},${c}`}>
            <polygon points={diamond(x, y)} fill={river ? "url(#water)" : path ? "#b9a58a" : "url(#grass)"} stroke={river ? "#2a6f9e" : "#3e7f2c"} strokeWidth={0.6} />
            {river && !dead && <ellipse cx={x + (h - 0.5) * 30} cy={y} rx={10} ry={2} fill="#bfe6ff" opacity={0.6}>
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur={`${2 + h * 2}s`} repeatCount="indefinite" />
            </ellipse>}
            {path && [-20, 0, 20].map((o) => <ellipse key={o} cx={x + o} cy={y + o / 4} rx={7} ry={3.5} fill="#9a8a72" />)}
            {!river && !path && (
              <>
                <g transform={`translate(${x - 18 + h * 10},${y - 4})`}><Pine dead={dead} /></g>
                {h > 0.35 && <g transform={`translate(${x + 18},${y + 6})`}><Pine dead={dead} /></g>}
                {h > 0.7 && <g transform={`translate(${x},${y + 14})`}><Pine dead={dead} /></g>}
              </>
            )}
          </g>
        );
      })}

      {/* buildable grid ground */}
      {cells.map(({ t, i, r, c }) => {
        const [x, y] = center(r, c);
        const canAfford = t.kind === "empty" && tokens >= 40 && !ruined && !bananas;
        return (
          <g key={`g${i}`} onClick={(e) => onSelect(i, e)} className="cursor-pointer">
            <polygon points={diamond(x, y)} fill={t.kind === "road" ? "#8c8f72" : "url(#grass)"}
              stroke={selected === i ? "var(--primary)" : "#3a7a2a"} strokeWidth={selected === i ? 3 : 0.8} />
            {canAfford && (
              <g pointerEvents="none">
                <polygon points={diamond(x, y)} fill="var(--secondary)" fillOpacity={0.2} stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="6 5">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
                </polygon>
                <text x={x} y={y + 6} textAnchor="middle" fontSize={20} fill="var(--primary-foreground)" fontWeight={700}>+</text>
              </g>
            )}
          </g>
        );
      })}

      {/* buildings, back to front */}
      {cells
        .filter(({ t }) => t.kind !== "empty")
        .sort((a, b) => a.r + a.c - (b.r + b.c))
        .map(({ t, i, r, c }) => {
          const [x, y] = center(r, c);
          return (
            <motion.g key={`b${i}-${t.kind}-${t.level}`} onClick={(e) => onSelect(i, e as unknown as React.MouseEvent)}
              className="cursor-pointer"
              initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 180, damping: 14 }}>
              <g transform={`translate(${x},${y})`} style={{ filter: degradeFilter(t.degradation) }}>
                {t.kind === "road" && <Road deg={t.degradation} cars={!carsStopped && t.degradation === 0} />}
                {t.kind === "cafe" && <Cafe deg={t.degradation} />}
                {t.kind === "house" && t.level === 1 && <Cottage deg={t.degradation} smoke={!cloudy} />}
                {t.kind === "house" && t.level === 2 && <Townhouse deg={t.degradation} smoke={!cloudy} />}
                {t.kind === "house" && t.level === 3 && <Manor deg={t.degradation} smoke={!cloudy} />}
                {t.kind !== "road" && <Cracks deg={t.degradation} />}
              </g>
              {t.onFire && <g transform={`translate(${x},${y})`}><Flames /></g>}
            </motion.g>
          );
        })}
      {bananas && cells.map(({ i, r, c }) => { const [x, y] = center(r, c); const h = hash(r + 7, c + 3); return <Peel key={`p${i}`} x={x + (h - 0.5) * 50} y={y + (hash(c, r) - 0.5) * 20} rot={h * 360} />; })}
    </svg>
  );
}
