---
name: Transitive security overrides
description: Compatibility rule for fixing vulnerable transitive packages with newer module formats.
---

Security overrides for transitive dependencies must be smoke-tested through the parent package's actual resolution path. A clean audit alone is insufficient when the patched release changes CommonJS/ESM interop.

**Why:** A secured decoder release changed to an ESM default export while an Expo routing dependency still called its CommonJS import directly. The audit passed, but URL parsing failed at runtime until the parent package was compatibility-patched.

**How to apply:** When forcing a transitive dependency across a major or module-format boundary, invoke the parent package's affected API after installation and confirm the runtime resolves the patched instance rather than an unused package-store copy.