# Dutch Wordfeud dictionary

This offline pack is generated from the OpenTaal Dutch word list plus Wordfeud
entries published by `wordfeudwoorden.nl` and `wordfeudhelper.nl`. The owner of
both sites explicitly authorized CrossLex to use their published lists on
2026-09-03.

The generator keeps lowercase OpenTaal entries of 2–15 A–Z letters, excluding
capitalized proper names, numbers, punctuation and multi-word forms. It then
adds the owner-authorized Wordfeud entries published on both sites. Generation
fails if a source page is unavailable, representative Dutch words are missing,
or known rejected place names are present.

Run:

`node scripts/generate-dutch-dictionary.mjs <OpenTaal wordlist.txt>`

Keep the OpenTaal license in `LICENSE-OpenTaal.txt` with redistributed copies.