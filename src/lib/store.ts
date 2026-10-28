import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as G from "./game";

interface Store extends G.GameState {
  investAmount: (amount: number, label: string) => void;
  build: (i: number, kind: "house" | "cafe" | "road") => void;
  upgrade: (i: number) => void;
  repair: (i: number) => void;
  withdraw: (f: 0.5 | 1) => void;
  rebuild: (amount: number) => void;
  nextWeek: () => void;
  reset: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useGame = create<Store>()(
  persist(
    (set) => ({
      ...G.initialState(),
      investAmount: (a, l) => set((s) => G.invest(s, a, l, uid())),
      build: (i, k) => set((s) => G.build(s, i, k)),
      upgrade: (i) => set((s) => G.upgrade(s, i)),
      repair: (i) => set((s) => G.repair(s, i)),
      withdraw: (f) => set((s) => G.withdraw(s, f, uid())),
      rebuild: (a) => set((s) => G.rebuild(s, a, uid())),
      nextWeek: () => set((s) => ({ week: s.week + 1, cloudy: s.ruined ? s.cloudy : false, carsStopped: s.ruined ? s.carsStopped : false })),
      reset: () => set(G.initialState()),
    }),
    { name: "oasis-empire-v1", skipHydration: true },
  ),
);
