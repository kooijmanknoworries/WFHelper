import { Router, type IRouter } from "express";
import {
  DUTCH_OPEN_DICTIONARY_META,
  DUTCH_OPEN_WORDS_TEXT,
  OPEN_TAAL_LICENSE_TEXT,
} from "../data/dutch-open-wordlist";

const router: IRouter = Router();
const version = DUTCH_OPEN_DICTIONARY_META.version;

router.get("/dictionary/manifest", (_req, res) => {
  res.set("Cache-Control", "no-cache");
  res.json({
    version,
    source: DUTCH_OPEN_DICTIONARY_META.sourceName,
    sourceUrl: DUTCH_OPEN_DICTIONARY_META.sourceBaseUrl,
    wordCount: DUTCH_OPEN_DICTIONARY_META.wordCount,
    minLength: DUTCH_OPEN_DICTIONARY_META.minLength,
    maxLength: DUTCH_OPEN_DICTIONARY_META.maxLength,
    dictionarySha256: DUTCH_OPEN_DICTIONARY_META.dictionarySha256,
    attribution: DUTCH_OPEN_DICTIONARY_META.attribution,
    license: DUTCH_OPEN_DICTIONARY_META.openTaalLicense,
    licenseUrl: "/api/dictionary/license",
    upstreamLicenseUrl: DUTCH_OPEN_DICTIONARY_META.licenseUrl,
    sourceCommit: DUTCH_OPEN_DICTIONARY_META.openTaalCommit,
    packUrl: `/api/dictionary/pack/${version}`,
  });
});

router.get("/dictionary/license", (_req, res) => {
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.type("text/plain").send(OPEN_TAAL_LICENSE_TEXT);
});

router.get("/dictionary/pack/:version", (req, res) => {
  if (req.params.version !== version) {
    res.status(404).json({ message: "Dictionary version not found." });
    return;
  }
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.json({ wordsText: DUTCH_OPEN_WORDS_TEXT });
});

export default router;