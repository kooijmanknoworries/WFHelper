import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();
const BOARD_SIZE = 15;
const MAX_IMAGE_BASE64_LENGTH = 10_000_000;
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const SCAN_MODEL = "gpt-5.6-terra";

type ScanPayload = {
  imageBase64?: unknown;
  mimeType?: unknown;
};

type ScanResult = {
  board: string[][];
  rack: string;
  confidence: number;
  warnings: string[];
};

type VWAuditTarget = {
  kind: "board" | "rack";
  row?: number;
  col?: number;
  position?: number;
  initialLetter: "V" | "W";
};

type VWAuditResult = {
  result: ScanResult;
  durationMs: number;
  targetCount: number;
};

const SCAN_INSTRUCTIONS = `You are reading a Wordfeud game screenshot.

Return JSON only, with exactly this shape:
{
  "board": [["", "... 15 cells total ..."], "... 15 rows total ..."],
  "rack": "SEVENLETTERS",
  "confidence": 0.0,
  "warnings": []
}

Rules:
- board must be exactly 15 rows of exactly 15 strings.
- Read only the central 15x15 game board. Each occupied cell is one uppercase A-Z letter; every empty cell is "".
- Ignore all premium-square labels such as TL, DL, TW, DW, 2L, 3W and the small point numbers printed on tiles.
- Do not interpret player names, scores, status text, timers, or buttons as board letters.
- Read the player's rack at the bottom separately. Return only its uppercase letters, in left-to-right order, with no spaces. Use ? for a visibly blank rack tile.
- Count the visible rack tiles one by one from left to right before returning the rack. A normal rack has seven separate white tile rectangles; do not skip narrow letters such as I or N between neighboring tiles. Return fewer than seven only when fewer tiles are truly visible.
- Treat I and T as a critical ambiguity on both the board and rack. In Wordfeud's tile font, uppercase I is a narrow vertical stem with short horizontal bars at BOTH the top and bottom. Uppercase T has a wider horizontal bar only at the top and no matching bottom bar. Never classify a glyph as T merely because it has a top bar. Check the bottom edge and overall width before deciding. Both I and T can show a small point value 2, so the point number cannot distinguish them.
- Treat V and W as another critical ambiguity. V has two diagonal strokes meeting at one bottom point; W is wider and has four diagonal strokes. In Dutch Wordfeud their printed point values provide a decisive cross-check: V has a small 4 and W has a small 5. If the glyph is visually compressed, use that point value to distinguish V from W.
- The rack string must contain your best final reading. Never put one letter in rack while saying in warnings that the tile is probably another letter. If a warning says a tile is likely I, rack must contain I at that position; use the warning only to tell the user that the remaining confidence is lower.
- Before returning, compare board, rack, and warnings for contradictions and correct the JSON values first.
- Recently played board tiles may have a yellow, green, or other highlight. They are still occupied board cells and must be read.
- If part of the board or rack is obscured, leave uncertain cells empty and explain that in warnings.
- confidence is a number from 0 to 1 describing the overall recognition confidence.
- warnings is an array of short strings for anything the user should verify.`;

function emptyBoard(): string[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array<string>(BOARD_SIZE).fill(""));
}

function normalizeBoard(value: unknown): string[][] {
  const board = emptyBoard();
  if (!Array.isArray(value)) return board;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const sourceRow = value[row];
    if (!Array.isArray(sourceRow)) continue;
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const sourceCell = sourceRow[col];
      if (typeof sourceCell !== "string") continue;
      const cell = sourceCell.trim().toUpperCase();
      if (/^[A-Z]$/.test(cell)) board[row][col] = cell;
    }
  }
  return board;
}

function normalizeRack(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.toUpperCase().replace(/[^A-Z?]/g, "").slice(0, 7);
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((warning): warning is string => typeof warning === "string").slice(0, 8);
}

function parseModelJson(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

function collectVWAuditTargets(result: ScanResult): VWAuditTarget[] {
  const targets: VWAuditTarget[] = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const letter = result.board[row][col];
      if (letter === "V" || letter === "W") {
        targets.push({
          kind: "board",
          row: row + 1,
          col: col + 1,
          initialLetter: letter,
        });
      }
    }
  }
  for (const [index, letter] of [...result.rack].entries()) {
    if (letter === "V" || letter === "W") {
      targets.push({
        kind: "rack",
        position: index + 1,
        initialLetter: letter,
      });
    }
  }
  return targets;
}

async function auditVWCandidates(
  imageBase64: string,
  mimeType: string,
  result: ScanResult,
): Promise<VWAuditResult> {
  const targets = collectVWAuditTargets(result);
  if (targets.length === 0) {
    return { result, durationMs: 0, targetCount: 0 };
  }

  const startedAt = performance.now();
  const completion = await openai.chat.completions.create({
    model: SCAN_MODEL,
    seed: 16,
    max_completion_tokens: 512,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Audit only the listed V/W candidates in this Dutch Wordfeud screenshot.

Return JSON only:
{"results":[{"kind":"board","row":1,"col":1,"letter":"V"},{"kind":"rack","position":1,"letter":"W"}]}

Rules:
- Return exactly one result for every listed candidate and no other cells.
- Board rows and columns and rack positions are one-based.
- Each returned letter must be either V or W.
- Read the large glyph and its small point number together.
- Dutch Wordfeud V has value 4. Dutch Wordfeud W has value 5.
- V has two diagonal strokes meeting at one bottom point.
- W is wider, has four diagonal strokes, and has two bottom points.
- When the small printed number is visible, 4 means V and 5 means W even if the compressed glyph initially looked different.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Recheck these exact candidates:\n${targets
              .map((target) =>
                target.kind === "board"
                  ? `board R${target.row}C${target.col}, initially ${target.initialLetter}`
                  : `rack position ${target.position}, initially ${target.initialLetter}`,
              )
              .join("\n")}`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("The V/W audit returned no result.");
  const parsed = parseModelJson(content) as { results?: unknown };
  if (!Array.isArray(parsed.results) || parsed.results.length !== targets.length) {
    throw new Error("The V/W audit did not verify every candidate.");
  }

  const board = result.board.map((row) => [...row]);
  const rack = [...result.rack];
  const verified = new Set<string>();
  for (const entry of parsed.results) {
    if (!entry || typeof entry !== "object") {
      throw new Error("The V/W audit returned an invalid candidate.");
    }
    const candidate = entry as Record<string, unknown>;
    const letter = candidate.letter;
    if (letter !== "V" && letter !== "W") {
      throw new Error("The V/W audit returned an invalid letter.");
    }

    if (candidate.kind === "board") {
      const row = Number(candidate.row);
      const col = Number(candidate.col);
      const key = `board:${row}:${col}`;
      const isTarget = targets.some(
        (target) => target.kind === "board" && target.row === row && target.col === col,
      );
      if (!isTarget || verified.has(key)) {
        throw new Error("The V/W audit returned an unexpected board cell.");
      }
      board[row - 1][col - 1] = letter;
      verified.add(key);
    } else if (candidate.kind === "rack") {
      const position = Number(candidate.position);
      const key = `rack:${position}`;
      const isTarget = targets.some(
        (target) => target.kind === "rack" && target.position === position,
      );
      if (!isTarget || verified.has(key)) {
        throw new Error("The V/W audit returned an unexpected rack position.");
      }
      rack[position - 1] = letter;
      verified.add(key);
    } else {
      throw new Error("The V/W audit returned an invalid target kind.");
    }
  }

  if (verified.size !== targets.length) {
    throw new Error("The V/W audit did not verify every candidate.");
  }
  return {
    result: { ...result, board, rack: rack.join("") },
    durationMs: Math.round(performance.now() - startedAt),
    targetCount: targets.length,
  };
}

router.post("/scan-board", async (req, res) => {
  const { imageBase64, mimeType } = (req.body ?? {}) as ScanPayload;

  if (
    typeof imageBase64 !== "string" ||
    imageBase64.length === 0 ||
    imageBase64.length > MAX_IMAGE_BASE64_LENGTH
  ) {
    res.status(400).json({ error: "A valid screenshot is required." });
    return;
  }

  const normalizedMimeType =
    typeof mimeType === "string" && SUPPORTED_IMAGE_TYPES.has(mimeType)
      ? mimeType
      : "image/jpeg";

  try {
    const scanStartedAt = performance.now();
    const completion = await openai.chat.completions.create({
      model: SCAN_MODEL,
      seed: 16,
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCAN_INSTRUCTIONS },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read this screenshot and return the board and rack JSON. Pay special attention to the small letters on the 15x15 grid, count every visible rack tile from left to right, then perform a final I-versus-T check. Make sure no warning contradicts the returned board or rack.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${normalizedMimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("The vision model returned no scan result.");
    const firstPassDurationMs = Math.round(performance.now() - scanStartedAt);

    const parsed = parseModelJson(content) as Record<string, unknown>;
    const initialResult: ScanResult = {
      board: normalizeBoard(parsed.board),
      rack: normalizeRack(parsed.rack),
      confidence: normalizeConfidence(parsed.confidence),
      warnings: normalizeWarnings(parsed.warnings),
    };
    const audit = await auditVWCandidates(
      imageBase64,
      normalizedMimeType,
      initialResult,
    );
    req.log?.info(
      {
        firstPassDurationMs,
        vwAuditDurationMs: audit.durationMs,
        totalScanDurationMs: Math.round(performance.now() - scanStartedAt),
        vwAuditTargetCount: audit.targetCount,
      },
      "Wordfeud screenshot scan timing",
    );

    res.json(audit.result);
  } catch (error) {
    req.log?.error({ err: error }, "Wordfeud screenshot scan failed");
    res.status(502).json({
      error: "The screenshot could not be read. Please try a clearer Wordfeud screenshot.",
    });
  }
});

export default router;