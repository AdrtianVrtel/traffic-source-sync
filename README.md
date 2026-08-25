# IIS Tooling

Interné nástroje pre Invest in Slovakia. Next.js appka s prihlásením, správou používateľov a troma nástrojmi.

## Nástroje

| Nástroj | Route | Čo robí |
|---|---|---|
| Traffic Source Sync | `/traffic-sync` | K e-mailom z nahraného Excelu doplní zdroj návštevnosti z PostHogu a vráti obohatený súbor + grafy |
| ActiveCampaign Cleaner | `/ac-cleaner` | Nájde testovacie kontakty v ActiveCampaign, rozdelí ich na "na archiváciu" a "na kontrolu", po potvrdení archivuje |
| Mention Tracker | `/mention-tracker` | Sleduje verejné zmienky o IIS na webe cez Tavily API, dedupuje ich a ukazuje neprečítané |

Prístup k jednotlivým nástrojom sa nastavuje per používateľ v `/admin/users` (len admin).

## Štruktúra

```
src/
  app/            routing (Next.js App Router) - stránky a API endpointy
  features/       kód jednotlivých nástrojov (components / server / hooks)
  shared/         zdieľané veci - auth, db, UI shell, utils, env
  providers/      Refine a NextAuth providery
```

Keď hľadáš kód k nástroju, choď do `src/features/<nazov-nastroja>/`.

## Lokálny vývoj

```bash
pnpm install
pnpm dev
```

Potrebné env premenné sú v `.env.local` (vzor a popis všetkých premenných je v [COOLIFY_DEPLOY.md](COOLIFY_DEPLOY.md)). Databáza je SQLite, vytvorí sa automaticky v `./data/app.db`.

## Nasadenie

Docker + Coolify. Postup, env premenné, persistent volume pre databázu a nastavenie cron tasku pre Mention Tracker sú v [COOLIFY_DEPLOY.md](COOLIFY_DEPLOY.md).
