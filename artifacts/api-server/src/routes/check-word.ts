import { Router, type IRouter } from "express";

const router: IRouter = Router();
const TAALTIK_URL = "https://wordfeud.taaltik.nl/";
const WORD_PATTERN = /^[A-Z]{2,15}$/;
const CACHE_TTL_MS = 10 * 60 * 1000;

type CachedVerdict = {
  allowed: boolean;
  checkedAt: string;
  expiresAt: number;
};

const verdictCache = new Map<string, CachedVerdict>();

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&#8291;|&#x2063;/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTaalTikVerdict(word: string): Promise<CachedVerdict> {
  const body = new URLSearchParams({
    word: word.toLowerCase(),
    exact: "zoek",
    checkthis: "",
    code: "319d",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(TAALTIK_URL, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Wordfeud-Helper-taaltik-check/1.0",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`TaalTik returned HTTP ${response.status}.`);

    const text = stripHtml(await response.text());
    const rejected = /NIET\s+toegestaan/i.test(text);
    const allowed = /WEL\s+toegestaan/i.test(text);
    if (!allowed && !rejected) throw new Error("TaalTik returned no clear verdict.");

    return {
      allowed: allowed && !rejected,
      checkedAt: new Date().toISOString(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  } finally {
    clearTimeout(timeout);
  }
}

router.post("/check-word", async (req, res) => {
  const rawWord = (req.body as { word?: unknown } | undefined)?.word;
  const word = typeof rawWord === "string" ? rawWord.trim().toUpperCase() : "";

  if (!WORD_PATTERN.test(word)) {
    res.status(400).json({ error: "Enter a word of 2 to 15 letters." });
    return;
  }

  const cached = verdictCache.get(word);
  if (cached && cached.expiresAt > Date.now()) {
    res.json({ word, allowed: cached.allowed, source: TAALTIK_URL, checkedAt: cached.checkedAt });
    return;
  }
  verdictCache.delete(word);

  try {
    const verdict = await fetchTaalTikVerdict(word);
    verdictCache.set(word, verdict);
    res.json({ word, allowed: verdict.allowed, source: TAALTIK_URL, checkedAt: verdict.checkedAt });
  } catch (error) {
    req.log?.error({ err: error, word }, "TaalTik word check failed");
    res.status(502).json({
      error: "TaalTik kon het woord nu niet controleren. Probeer het later opnieuw.",
    });
  }
});

export default router;