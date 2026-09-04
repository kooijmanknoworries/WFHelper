# Reviewed Wordfeud scan fixtures

These fixtures are pixel-preserving anonymizations of original Wordfeud
screenshots. Solid-color masks remove device chrome, player names, avatars,
scores, and game status while leaving the complete 15×15 board and seven-tile
rack unchanged.

`scan-fixtures.json` stores the reviewed expected result for each image:

- `board` is exactly 15 strings of 15 characters. `.` means an empty square.
- `rack` is exactly seven letters in left-to-right order (`?` is a blank tile).
- `reviewed: true` makes any letter regression fail release validation.
- `minConfidence` catches a material confidence drop even when letters match.

Run the live evaluation with:

```sh
pnpm --filter @workspace/api-server run eval:scan-fixtures
```

The evaluator starts the real API server, sends every original image through
`POST /api/scan-board`, and compares all 225 board cells plus all seven rack
positions. Its report gives coordinates for board errors, positions for rack
errors, and marks every `I→T` or `T→I` substitution as `I/T`.

The command uses the configured Replit OpenAI integration and consumes vision
credits. It deliberately does not mock the model: its purpose is to catch model
or prompt regressions before release.

## Adding a fixture

1. Start from an original screenshot containing useful I/T examples.
2. Mask identifying areas without resizing, redrawing, or modifying board/rack
   pixels. Never commit an unredacted original.
3. Add its complete reviewed 15×15 board and seven rack letters to the manifest.
4. Run the evaluator and manually review any reported mismatch before accepting
   a prompt or model change.

Coordinates in reports are one-based for easy comparison with the visible
board.