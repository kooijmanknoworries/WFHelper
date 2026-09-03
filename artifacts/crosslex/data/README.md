# Dutch dictionary pack

This pack is derived from the [OpenTaal Dutch word list](https://github.com/OpenTaal/opentaal-wordlist), release 2.20.23 (2023-03-10), commit `b250510dda431785f962019167d1415198ff3905`. OpenTaal permits reuse under the Revised BSD License and/or CC BY 3.0; the full terms are preserved in [LICENSE.txt](./LICENSE.txt).

The source list contains general Dutch words, inflections, names, place names, and entries with punctuation or spaces. The generated `dutch-wordlist.ts` keeps the entries that can be represented by the Wordfeud A–Z rack: uppercase ASCII letters only, between 2 and 15 letters inclusive. Entries are deduplicated case-insensitively and sorted. The solver validates the expected release count and representative words before use, so a partial or corrupted pack fails visibly instead of producing incomplete move results.

This is a legally redistributable OpenTaal-based compatibility dictionary, not a copy of Wordfeud/TaalTik’s proprietary modifications.
