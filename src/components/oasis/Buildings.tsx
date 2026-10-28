// Hand-made isometric SVG buildings. Coordinates: x,y on ground (tile = -30..30), z up.
import type { Degradation } from "@/lib/game";

const P = (x: number, y: number, z: number) => `${x - y},${(x + y) / 2 - z}`;
const poly = (pts: [number, number, number][]) => pts.map((p) => P(...p)).join(" ");

interface BoxProps {
  x0: number; x1: number; y0: number; y1: number; z0?: number; h: number;
  left: string; right: string; top?: string;
}
function Box({ x0, x1, y0, y1, z0 = 0, h, left, right, top }: BoxProps) {
  const z1 = z0 + h;
  return (
    <g stroke="#1a1a22" strokeWidth={0.6} strokeLinejoin="round">
      <polygon points={poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])} fill={left} />
      <polygon points={poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])} fill={right} />
      {top && <polygon points={poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])} fill={top} />}
    </g>
  );
}

/** Gable roof with ridge along x. */
function Roof({ x0, x1, y0, y1, z, r, front, back, gable, broken }: {
  x0: number; x1: number; y0: number; y1: number; z: number; r: number;
  front: string; back: string; gable: string; broken?: boolean;
}) {
  const ym = (y0 + y1) / 2;
  const o = 3;
  return (
    <g stroke="#1a1a22" strokeWidth={0.6} strokeLinejoin="round">
      <polygon points={poly([[x0 - o, y0 - o, z - 2], [x1 + o, y0 - o, z - 2], [x1 + o, ym, z + r], [x0 - o, ym, z + r]])} fill={back} />
      <polygon points={poly([[x1, y0, z], [x1, y1, z], [x1, ym, z + r]])} fill={gable} />
      <polygon points={poly([[x0 - o, y1 + o, z - 2], [x1 + o, y1 + o, z - 2], [x1 + o, ym, z + r], [x0 - o, ym, z + r]])} fill={front} />
      {/* shingle lines */}
      {[0.33, 0.66].map((t) => (
        <polyline key={t} fill="none" stroke="#00000033"
          points={poly([[x0 - o, y1 + o - (y1 + o - ym) * t, z - 2 + (r + 2) * t], [x1 + o, y1 + o - (y1 + o - ym) * t, z - 2 + (r + 2) * t]])} />
      ))}
      {broken && (
        <polygon points={poly([[x0 + 6, y1 - 2, z + r * 0.3], [x0 + 16, y1 - 2, z + r * 0.35], [x0 + 12, ym + 3, z + r * 0.8]])} fill="#141414" />
      )}
    </g>
  );
}

function WinL({ y, a, b, c, d, lit }: { y: number; a: number; b: number; c: number; d: number; lit: boolean }) {
  return <polygon points={poly([[a, y, c], [b, y, c], [b, y, d], [a, y, d]])} fill={lit ? "#ffd27a" : "#3a3f4a"} stroke="#f4efe6" strokeWidth={0.8} />;
}
function WinR({ x, a, b, c, d, lit }: { x: number; a: number; b: number; c: number; d: number; lit: boolean }) {
  return <polygon points={poly([[x, a, c], [x, b, c], [x, b, d], [x, a, d]])} fill={lit ? "#ffcf6e" : "#353a45"} stroke="#f4efe6" strokeWidth={0.8} />;
}

function Smoke({ x, y, z, on }: { x: number; y: number; z: number; on: boolean }) {
  if (!on) return null;
  const sx = x - y, sy = (x + y) / 2 - z;
  return (
    <g fill="#e6e6e6">
      {[0, 0.8, 1.6].map((d) => (
        <circle key={d} cx={sx} cy={sy - 4} r={3} className="smoke" style={{ animationDelay: `${d}s` }} />
      ))}
    </g>
  );
}

function Cracks({ deg }: { deg: Degradation }) {
  if (!deg) return null;
  return (
    <g stroke="#111" strokeWidth={1.2} fill="none" opacity={0.8}>
      <polyline points="-14,-8 -10,-2 -13,4 -8,10" />
      <polyline points="10,-14 14,-6 11,0 16,6" />
      {deg === 2 && <>
        <polyline points="-4,-30 0,-22 -3,-14" />
        <polygon points="-22,10 -12,14 -18,18" fill="#5b4a3a" stroke="none" />
        <polygon points="12,12 22,10 18,16" fill="#6b5a48" stroke="none" />
      </>}
    </g>
  );
}

export const degradeFilter = (d: Degradation) =>
  d === 0 ? undefined : d === 1 ? "sepia(0.55) saturate(0.7) brightness(0.9)" : "grayscale(0.9) brightness(0.6) contrast(1.1)";

export function Cottage({ deg = 0, smoke }: { deg?: Degradation; smoke: boolean }) {
  const lit = deg < 2;
  return (
    <g>
      <Box x0={-22} x1={22} y0={-18} y1={20} h={3} left="#c4512f" right="#a8432a" top="#d9663f" />
      <Box x0={-18} x1={18} y0={-14} y1={14} z0={3} h={18} left="#b9b7c6" right="#9a98ab" />
      <WinL y={14} a={-12} b={-5} c={9} d={16} lit={lit} />
      <WinL y={14} a={4} b={11} c={9} d={16} lit={lit} />
      <WinR x={18} a={-8} b={-2} c={9} d={16} lit={lit} />
      <polygon points={poly([[-3, 14, 3], [2, 14, 3], [2, 14, 13], [-3, 14, 13]])} fill="#6b3b22" />
      <Box x0={8} x1={13} y0={-6} y1={-1} z0={28} h={14} left="#c0392b" right="#962d22" top="#7a241b" />
      <Roof x0={-18} x1={18} y0={-14} y1={14} z={21} r={16} front="#2f5d8a" back="#244a70" gable="#c7c4d4" broken={deg === 2} />
      <Smoke x={10} y={-4} z={44} on={smoke && deg === 0} />
    </g>
  );
}

export function Townhouse({ deg = 0, smoke }: { deg?: Degradation; smoke: boolean }) {
  const lit = deg < 2;
  return (
    <g>
      <Box x0={-21} x1={21} y0={-17} y1={17} h={36} left="#c98b2b" right="#a8711f" />
      {[8, 24].map((z) => (
        <g key={z}>
          <WinL y={17} a={-16} b={-10} c={z} d={z + 8} lit={lit} />
          <WinL y={17} a={-3} b={3} c={z} d={z + 8} lit={lit} />
          <WinL y={17} a={10} b={16} c={z} d={z + 8} lit={lit} />
          <WinR x={21} a={-12} b={-6} c={z} d={z + 8} lit={lit} />
          <WinR x={21} a={2} b={8} c={z} d={z + 8} lit={lit} />
        </g>
      ))}
      {/* porch */}
      <Box x0={4} x1={18} y0={17} y1={27} h={2} left="#7b4a26" right="#643b1e" top="#8d5a31" />
      {([[5, 26], [17, 26]] as const).map(([x, y]) => <Box key={x} x0={x} x1={x + 1.5} y0={y - 1.5} y1={y} z0={2} h={12} left="#5a3418" right="#4a2a12" />)}
      <polygon points={poly([[3, 17, 16], [19, 17, 16], [19, 28, 13], [3, 28, 13]])} fill="#6b7b85" stroke="#1a1a22" strokeWidth={0.6} />
      <Box x0={-14} x1={-8} y0={-8} y1={-2} z0={42} h={16} left="#b5532f" right="#8f4024" top="#5c2a18" />
      <Roof x0={-21} x1={21} y0={-17} y1={17} z={36} r={15} front="#5e7a91" back="#4d6578" gable="#d29a3a" broken={deg === 2} />
      <Smoke x={-11} y={-5} z={58} on={smoke && deg === 0} />
    </g>
  );
}

export function Manor({ deg = 0, smoke }: { deg?: Degradation; smoke: boolean }) {
  const lit = deg < 2;
  return (
    <g>
      {/* side wing */}
      <Box x0={-24} x1={-2} y0={-22} y1={0} h={30} left="#d8c95a" right="#b9ab45" />
      <Roof x0={-24} x1={-2} y0={-22} y1={0} z={30} r={12} front="#2b5e63" back="#224c50" gable="#d8c95a" />
      {/* main */}
      <Box x0={-6} x1={24} y0={-14} y1={20} h={40} left="#3f8f4f" right="#2f733e" />
      {[8, 26].map((z) => (
        <g key={z}>
          <WinL y={20} a={-1} b={5} c={z} d={z + 9} lit={lit} />
          <WinL y={20} a={12} b={18} c={z} d={z + 9} lit={lit} />
          <WinR x={24} a={-9} b={-3} c={z} d={z + 9} lit={lit} />
          <WinR x={24} a={4} b={10} c={z} d={z + 9} lit={lit} />
          <WinR x={24} a={13} b={18} c={z} d={z + 9} lit={lit} />
        </g>
      ))}
      <Box x0={-6} x1={26} y0={20} y1={30} h={2} left="#40525c" right="#34444c" top="#56707e" />
      <polygon points={poly([[-6, 20, 17], [26, 20, 17], [26, 31, 14], [-6, 31, 14]])} fill="#2d3e48" stroke="#1a1a22" strokeWidth={0.6} />
      <Box x0={8} x1={14} y0={-8} y1={-2} z0={46} h={16} left="#6d6d6d" right="#555" top="#333" />
      <Roof x0={-6} x1={24} y0={-14} y1={20} z={40} r={18} front="#262a33" back="#1d2129" gable="#3f8f4f" broken={deg === 2} />
      <Smoke x={11} y={-5} z={62} on={smoke && deg === 0} />
    </g>
  );
}

export function Cafe({ deg = 0 }: { deg?: Degradation }) {
  const lit = deg < 2;
  return (
    <g>
      <Box x0={-22} x1={22} y0={-18} y1={18} h={26} left="#c4542a" right="#a24420" />
      {/* white cross timber door on right face */}
      <polygon points={poly([[22, -8, 0], [22, 8, 0], [22, 8, 16], [22, -8, 16]])} fill="#f3eee4" />
      <polyline points={poly([[22, -6, 2], [22, 6, 14]])} stroke="#c4542a" strokeWidth={2} fill="none" />
      <polyline points={poly([[22, 6, 2], [22, -6, 14]])} stroke="#c4542a" strokeWidth={2} fill="none" />
      <WinL y={18} a={-16} b={-8} c={10} d={18} lit={lit} />
      <WinL y={18} a={6} b={14} c={10} d={18} lit={lit} />
      {/* awning stalls */}
      {[-18, -4, 10].map((x, i) => (
        <g key={x}>
          <Box x0={x} x1={x + 10} y0={22} y1={28} h={6} left="#8a5a32" right="#6e4626" top="#b58a5a" />
          <polygon points={poly([[x - 1, 21, 14], [x + 11, 21, 14], [x + 11, 30, 10], [x - 1, 30, 10]])}
            fill={i % 2 ? "#f2f2f2" : "#e2b33c"} stroke="#1a1a22" strokeWidth={0.5} />
        </g>
      ))}
      <Roof x0={-22} x1={22} y0={-18} y1={18} z={26} r={20} front="#b0461f" back="#8c3818" gable="#f3eee4" broken={deg === 2} />
    </g>
  );
}

export function Road({ deg = 0, cars }: { deg?: Degradation; cars: boolean }) {
  const a = P(-30, 0, 0), b = P(30, 0, 0);
  return (
    <g>
      <polygon points={poly([[-30, -12, 0.5], [30, -12, 0.5], [30, 12, 0.5], [-30, 12, 0.5]])} fill={deg ? "#5b5b5b" : "#7c7f86"} stroke="#4b4e55" />
      {[-20, -6, 8, 22].map((x) => (
        <polyline key={x} points={poly([[x, 0, 0.6], [x + 6, 0, 0.6]])} stroke="#f0e6b0" strokeWidth={1.4} />
      ))}
      {/* lamps */}
      {([[-24, -14], [20, 14]] as const).map(([x, y]) => {
        const sx = x - y, sy = (x + y) / 2;
        return (
          <g key={x}>
            <line x1={sx} y1={sy} x2={sx} y2={sy - 22} stroke="#2a2a2a" strokeWidth={1.6} />
            <circle cx={sx} cy={sy - 23} r={2.6} fill={deg ? "#555" : "#ffe08a"} />
            {!deg && <circle cx={sx} cy={sy - 23} r={7} fill="#ffe08a" opacity={0.25} />}
          </g>
        );
      })}
      {/* cars */}
      {[{ c: "#d63b3b", d: 0, off: -6 }, { c: "#3b7bd6", d: 2, off: 6 }].map((car, i) => {
        const pa = P(-26, car.off, 0), pb = P(26, car.off, 0);
        const path = i ? `M${pb} L${pa}` : `M${pa} L${pb}`;
        return (
          <g key={i}>
            <g>
              <rect x={-6} y={-6} width={12} height={6} rx={2} fill={car.c} stroke="#111" strokeWidth={0.5} />
              <rect x={-3} y={-9} width={6} height={4} rx={1} fill="#cfe6ff" />
              {cars && <animateMotion dur="4s" begin={`${car.d}s`} repeatCount="indefinite" path={path} />}
              {!cars && <animateMotion dur="0.01s" fill="freeze" path={path} keyPoints="0.4;0.4" keyTimes="0;1" calcMode="linear" />}
            </g>
          </g>
        );
      })}
      <line x1={a.split(",")[0]} y1={a.split(",")[1]} x2={b.split(",")[0]} y2={b.split(",")[1]} stroke="none" />
    </g>
  );
}

export function Pine({ dead }: { dead: boolean }) {
  const c1 = dead ? "#6b5640" : "#1f6b3a";
  const c2 = dead ? "#55432f" : "#185a30";
  return (
    <g>
      <rect x={-1.5} y={-6} width={3} height={7} fill="#5a3a1e" />
      <polygon points="-10,-4 0,-22 10,-4" fill={c1} stroke="#0e2a18" strokeWidth={0.5} />
      <polygon points="-8,-14 0,-30 8,-14" fill={c2} stroke="#0e2a18" strokeWidth={0.5} />
      {!dead && <polygon points="-5,-24 0,-36 5,-24" fill={c1} stroke="#0e2a18" strokeWidth={0.5} />}
    </g>
  );
}

export { Cracks };
