# Wordfeud Helper

A Dutch-first mobile Wordfeud helper that ranks legal board moves and validates every crossing word.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/crosslex run dev` — run the Expo mobile app through its managed workflow
- `pnpm --filter @workspace/crosslex run typecheck` — check the mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo 57, React Native 0.86, Expo Router
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/crosslex/app/` — Expo Router screens
- `artifacts/crosslex/lib/solver.ts` — board rules, validated Dutch dictionary loading, move generation, and scoring
- `artifacts/crosslex/constants/colors.ts` — Wordfeud Helper mobile design tokens
- `artifacts/crosslex/assets/images/icon.png` — app icon

## Architecture decisions

- The first build is frontend-only and keeps the current position in AsyncStorage.
- Screenshot selection uses the native photo library and server-side vision recognition; the user verifies or corrects detected tiles in the editor.
- The solver is dictionary-independent so complete licensed language packs can replace the embedded Dutch starter list.
- Candidate moves are rejected when any perpendicular crossing word is absent from the active dictionary.

## Product

- Import and scan a board screenshot from the device photo library.
- Automatically recognize the 15×15 board and rack, show confidence feedback, and calculate legal move advice.
- Start from a blank board with the real 15×15 Wordfeud premium-square layout.
- Edit any square and enter the seven rack tiles, including blanks.
- Generate and rank legal horizontal and vertical moves by score.
- Show move coordinates, tile count, and validated crossing words.
- Load a demo position and preserve the current position locally.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Keep React Native and React Native Worklets aligned with the installed Expo SDK; run Expo dependency checks after upgrades.
- The embedded Dutch pack is generated from OpenTaal plus owner-authorized Wordfeudwoorden.nl and Wordfeudhelper.nl entries; generation rejects proper names and malformed entries.
- Screenshot recognition uses Replit AI Integrations for OpenAI on the API server; never expose its credentials in the mobile client.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `AGENTS.md` for the current product context, decisions, roadmap, and GitHub handoff notes
