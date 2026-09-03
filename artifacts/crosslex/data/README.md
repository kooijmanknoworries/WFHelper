# Dutch site word list

This pack contains the words rendered on the published A-Z pages at [wordfeudwoorden.nl](https://www.wordfeudwoorden.nl/), restricted to 2–12 letters.

The site describes these pages as selected/high-scoring lists, so this is a reproducible published subset rather than a claim about the private backend dictionary. Regenerate it with:

```
pnpm --filter @workspace/crosslex run generate:dictionary
```

The generated TypeScript pack records every source page, retrieval date, word count, and per-length count.
