# Synthetic scan fixtures

These files are intentionally synthetic Wordfeud-like screenshots. They contain
no player names, avatars, scores, game IDs, or copied gameplay. The SVG format
keeps each fixture small, reviewable, and easy to update while still exercising
the API's base64 image request path.

## Fixture metadata

`scan-fixtures.json` is the source of truth for the regression checks. Each
fixture records:

- the screenshot file and MIME type used by the endpoint check;
- the device class, viewport dimensions, crop, and theme it represents;
- expected occupied board cells as zero-based `row`/`col` coordinates;
- the expected rack, in left-to-right order;
- the minimum acceptable overall recognition confidence.

The endpoint check sends each image through the real API process and uses a
local, deterministic vision response. This makes the shape and normalization
checks repeatable without uploading fixture data or spending vision-model
credits. It does not replace periodic manual or live-model accuracy review.

## Adding a fixture

1. Create a synthetic or thoroughly redacted screenshot. Remove player names,
   avatars, scores, chat, game IDs, notifications, and any other personal
   information. Do not copy a real player's screenshot into this directory.
2. Prefer a reviewable SVG with a realistic device viewport, board crop, and
   light/dark Wordfeud-like theme. If a raster image is needed, use PNG, JPEG,
   or WebP and keep it free of personal information.
3. Add one entry to `scan-fixtures.json` with unique `id`, `file`, dimensions,
   crop/theme details, every expected occupied cell, rack, and confidence floor.
4. Run `pnpm --filter @workspace/api-server run test:scan-fixtures`.
5. Review the diff and verify that the fixture contains only synthetic or
   redacted content before committing it.

Coordinates are zero-based: the top-left board square is `row: 0, col: 0`
and the bottom-right square is `row: 14, col: 14`.