---
name: Local scanner provider isolation
description: Why locally configured screenshot scanning must avoid eager cloud-only AI initialization
---

Keep the screenshot scanner's provider client isolated from unrelated image-generation clients when running with a local OpenAI-compatible model server.

**Why:** A broad AI integration entry point can eagerly initialize image-generation exports that require Replit cloud credentials. In a self-hosted container this fails at process startup, before the scanner's own local endpoint configuration can be used. A successful API build does not catch this; the container must actually start without Replit AI environment variables.

**How to apply:** When editing AI imports or exports used by the API, ensure the scanner loads only what it needs (or make unrelated clients lazy). Verify a standalone API/container boots and accepts a scan through a local mock endpoint with no Replit AI credentials.