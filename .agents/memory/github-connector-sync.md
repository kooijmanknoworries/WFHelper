---
name: GitHub connector synchronization
description: Safe repository synchronization when connector-created remote history differs from the local backup history.
---

When syncing this project through the GitHub connector, do not assume the local parent commit ID exists on remote or that matching content has the same commit ID. Compare parent trees and overlay changed files on the current remote tree instead of replacing it.

**Why:** Connector-created commits can have different identities from local backup commits. The connector security filter also omits generated HTML templates, while GitHub may contain useful files absent from the local backup history.

**How to apply:** Read the current remote head and recursive tree first. Preserve remote-only files, keep previously blocked generated templates omitted, upload only the intended changed blobs, verify every changed blob in the resulting tree, and refuse to move the branch if remote changes unexpectedly during synchronization. Immediately after updating a branch ref, bypass caches or verify through the branch commits endpoint; the connector can briefly return the old ref. Normalize trailing `\r` in shell callback output before comparing SHA strings.