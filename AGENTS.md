<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Oasis game rules (costs, interest, withdrawal, statement parsing) live as pure functions in src/lib/game.ts with tests in game.test.ts; the zustand store only wraps them — keeps rules testable and UI-free.
- Game state persists to localStorage via zustand persist with skipHydration, rehydrated in useEffect — avoids SSR hydration mismatches.
- Momentum's active UI uses authenticated server functions and owner-scoped Cloud tables for analyses, display names, and virtual city progress; legacy Oasis local storage is not imported or migrated because it contains demo finances.
- Real statement parsing and empty Momentum progress live in src/lib/momentum.ts with adjacent tests; explicit parsed RON amounts are required, never synthetic fallback values.
- Original statements are parsed locally and only aggregate analyses are saved; city points represent saving opportunities, not verified savings, deposits, or investments.
- Multiplayer: friendships, referrals, point grants and attacks are Cloud tables; cross-user reads/writes (friend cities, attacks, invite rewards) go through server functions using the admin client only after verifying friendship — users' RLS stays owner-only.
