---
name: OCR grid anchoring
description: Why board recognition needs visible coordinate references and verification on the original source image.
---

Keep visible row/column references in the vision input when reading board positions. Prompt wording and a sparse coordinate response alone are not sufficient safeguards.

**Why:** A reported screenshot placed LIJ one column left, with L below G instead of E in GE, while claiming 99% confidence. Explicit coordinate output alone still reproduced the error on the original image. A numbered board image corrected the actual source screenshot.

**How to apply:** Preserve the grid reference preprocessing when changing scan providers or prompts. Reject uncertain crop geometry rather than labeling a guessed crop. A crop must include all 15 rows and columns; omitting an edge changes every affected coordinate.

Verify a positional fix against the original uploaded screenshot as well as its anonymized release fixture.

**Why:** The anonymized fixture passed majority-consensus evaluation while a live scan of the original screenshot still misplaced the tiles. A consensus pass can hide individual scan failures.

**How to apply:** Check the actual reported cells in an original-image live scan before claiming the issue fixed. Keep only anonymized images in permanent fixtures and shared repositories.