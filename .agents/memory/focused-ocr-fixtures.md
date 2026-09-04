---
name: Focused OCR fixtures
description: How to scope real screenshot regressions when the same image contains unrelated recognition errors.
---

For a screenshot added to reproduce a specific glyph ambiguity, assert the complete rack plus the targeted glyph class on the board; keep separate broad fixtures for whole-board accuracy.

**Why:** A real I/T screenshot consistently verified the corrected rack and every I/T board cell, but an unrelated V/W error made a whole-board assertion fail and encouraged ineffective prompt expansion.

**How to apply:** Use focused assertions only for the named ambiguity. If another repeated mismatch matters, promote it to its own reviewed fixture and fix it independently rather than weakening or broadening the original regression.