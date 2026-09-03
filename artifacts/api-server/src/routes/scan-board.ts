import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();
const BOARD_SIZE = 15;
const MAX_IMAGE_BASE64_LENGTH = 10_000_000;
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

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
    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-terra",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCAN_INSTRUCTIONS },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read this screenshot and return the board and rack JSON. Pay special attention to the small letters on the 15x15 grid, then count every visible rack tile from left to right before returning the rack.",
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

    const parsed = parseModelJson(content) as Record<string, unknown>;
    const result: ScanResult = {
      board: normalizeBoard(parsed.board),
      rack: normalizeRack(parsed.rack),
      confidence: normalizeConfidence(parsed.confidence),
      warnings: normalizeWarnings(parsed.warnings),
    };

    res.json(result);
  } catch (error) {
    req.log?.error({ err: error }, "Wordfeud screenshot scan failed");
    res.status(502).json({
      error: "The screenshot could not be read. Please try a clearer Wordfeud screenshot.",
    });
  }
});

export default router;