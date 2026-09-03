# CrossLex agent handoff

This file is the shared context for future agents working on this project. Keep it current after meaningful changes. Do not put secrets, access tokens, or private credentials here.

## Product

CrossLex is a mobile Wordfeud helper for Android and iOS. Its differentiator is that it validates every word created by touching letters, rather than only checking whether the main word fits.

The preferred product name is **CrossLex**. The target GitHub repository is **WFHelper**.

## Current state

- Expo 57 / React Native 0.86 mobile app.
- Dutch-first offline prototype.
- Screenshot import from the device photo library is implemented.
- Imported screenshots currently require manual board verification/editing; automatic OCR is not implemented yet.
- Editable 15×15 board with rack input for up to seven tiles.
- `?` is supported as a blank tile and scores zero.
- Move generation checks horizontal and vertical placements, board connection rules, crossing words, and board multipliers.
- Results are ranked by score and show coordinates, orientation, tiles used, and validated crossing words.
- Current board and rack are saved locally with AsyncStorage.
- A compact Dutch starter dictionary is embedded for the prototype; it is not yet a complete production Wordfeud dictionary pack.
- A settings screen is present for the active dictionary/scoring language surface.

## Source map

- `artifacts/crosslex/app/index.tsx` — primary solver screen and interaction flow.
- `artifacts/crosslex/app/settings.tsx` — dictionary/scoring settings surface.
- `artifacts/crosslex/lib/solver.ts` — board model, dictionary, legality checks, and scoring.
- `artifacts/crosslex/constants/colors.ts` — CrossLex visual tokens.
- `artifacts/crosslex/assets/images/icon.png` — app icon.
- `replit.md` — collaborator-visible project overview and operating commands.

## Product decisions

1. Keep the first mobile build frontend-only with local persistence; add a backend only when cloud accounts, shared positions, analytics, or paid entitlements require it.
2. Use native photo-library access for screenshot import. Directly reading another app's live board is not assumed to be possible on iOS or Android.
3. Keep the solver dictionary-independent so complete, properly licensed Dutch and other language packs can be added without rewriting move generation.
4. Treat crossing-word validation as a hard legality rule, not a post-processing warning.
5. The user wants completed code pushed to the GitHub repository `WFHelper` so other agents can continue from the same source.

## Next milestones

1. Replace the starter Dutch list with a complete, legally sourced dictionary pack and add unit coverage for Wordfeud board rules.
2. Add screenshot board recognition with confidence indicators and a correction flow.
3. Add more Wordfeud languages through downloadable dictionary packs.
4. Add optional accounts and paid features only after the core solver is reliable.

## Agent workflow

- Read this file before making changes.
- Keep product context and decisions updated here; avoid writing secrets or conversationally irrelevant details.
- Run the CrossLex typecheck after mobile code changes.
- Push completed code to the `WFHelper` GitHub repository after meaningful changes when the GitHub integration is available.