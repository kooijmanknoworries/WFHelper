# Dutch site word list

This pack contains the words rendered on the published A-Z pages at [wordfeudwoorden.nl](https://www.wordfeudwoorden.nl/), restricted to 2–12 letters.

The site describes these pages as selected/high-scoring lists, so this is a reproducible published subset rather than a claim about the private backend dictionary. Regenerate it with:

```
pnpm --filter @workspace/crosslex run generate:dictionary
```

The generated TypeScript pack records every source page, retrieval date, unique release version, word count, and per-length count. The version includes the full retrieval timestamp so a corrected pack generated on the same day always receives a new immutable URL.

## Downloadable updates

The API exposes this generated list as a versioned JSON pack:

- `GET /api/dictionary/manifest` returns the version, source, limits, word count, SHA-256 checksum, and pack URL.
- `GET /api/dictionary/pack/:version` returns `{ "words": [...] }` and is immutable for that version.

The app checks the HTTPS `EXPO_PUBLIC_DICTIONARY_MANIFEST_URL` when set, otherwise it uses the API domain at `/api/dictionary/manifest`. Pack URLs must also use HTTPS on the manifest's origin. A downloaded pack becomes active only after its shape, count, entries, and `dictionarySha256` all validate. The bundled pack remains the fallback.
