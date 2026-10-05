---
name: Dutch dictionary sourcing
description: Source and verification boundaries for Dutch Wordfeud dictionary updates.
---

Use the permissively licensed OpenTaal list as the bulk Dutch source. Add words outside that source only through a small, explicit allowlist when both TaalTik accepts the word for Wordfeud and Woordenlijst.org confirms the spelling. Do not describe the result as the complete proprietary Wordfeud dictionary.

Filter OpenTaal before uppercasing: accept only entries that were originally lowercase, because its capitalized entries include proper names, abbreviations, and Roman numerals. For 2–3-letter entries, also require the Wordfeud-specific source or the explicit dual-verified allowlist; OpenTaal contains lowercase abbreviations such as `CV`, `CRM`, `VJ`, and `ON`.

**Why:** TaalTik's Wordfeud list is proprietary and has no public bulk export, while Woordenlijst.org is a spelling authority rather than a Wordfeud acceptance list. Bulk scraping either would be inaccurate or unsupported.

**How to apply:** Pin and attribute the exact OpenTaal commit, preserve source casing until filtering is complete, ship its license, checksum the generated pack, and add every reported TaalTik rejection to targeted verification plus a solver regression when it affects a crossing word.

Gameplay-confirmed rejections take precedence over imported source entries. The user explicitly reported that ET and RI are not accepted by Dutch Wordfeud.

**Why:** The imported lists admitted ET and RI, causing the helper to suggest BEZEER with invalid crossing words in a real game.

**How to apply:** Exclude confirmed rejections from main and crossing words even when a device loads an older cached dictionary. Ship corrected downloadable packs with an advanced version and matching count/checksum so existing clients receive the correction.