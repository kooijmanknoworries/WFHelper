# Dutch Wordfeud dictionary

This offline pack is generated from lowercase playable entries returned by the
official `woordenlijst.org` lexicon, supplemented with Wordfeud entries
published by `wordfeudwoorden.nl` and `wordfeudhelper.nl`.

The project owner explicitly authorized CrossLex to scrape and package data
from all three sites on 2026-09-03. The generated metadata records a SHA-256
hash over the exact URL/body sequence used for the build.

Only 2–15 letter A–Z entries are packaged. Casing from the official source is
preserved until filtering, so its capitalized proper names are excluded.
Supplemental entries are accepted independently because those pages explicitly
publish them as Wordfeud words. Generation fails if a source is unavailable, a
wildcard result reaches its cap, representative Dutch words are missing, or
known rejected place names are present. Runtime loading also verifies the
generated word-sequence SHA-256, count, ordering and entry format.

Run `pnpm generate:dictionary` from `artifacts/crosslex`.