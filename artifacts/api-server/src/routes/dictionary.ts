import { Router, type IRouter } from "express";
import {
  DUTCH_SITE_DICTIONARY_META,
  DUTCH_SITE_WORDS,
} from "../../../crosslex/data/dutch-site-wordlist";

const router: IRouter = Router();
const version = DUTCH_SITE_DICTIONARY_META.version;

router.get("/dictionary/manifest", (_req, res) => {
  res.set("Cache-Control", "no-cache");
  res.json({
    version,
    source: DUTCH_SITE_DICTIONARY_META.sourceName,
    sourceUrl: DUTCH_SITE_DICTIONARY_META.sourceBaseUrl,
    wordCount: DUTCH_SITE_DICTIONARY_META.wordCount,
    minLength: DUTCH_SITE_DICTIONARY_META.minLength,
    maxLength: DUTCH_SITE_DICTIONARY_META.maxLength,
    dictionarySha256: DUTCH_SITE_DICTIONARY_META.dictionarySha256,
    packUrl: `/api/dictionary/pack/${version}`,
  });
});

router.get("/dictionary/pack/:version", (req, res) => {
  if (req.params.version !== version) {
    res.status(404).json({ message: "Dictionary version not found." });
    return;
  }
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.json({ words: DUTCH_SITE_WORDS });
});

export default router;