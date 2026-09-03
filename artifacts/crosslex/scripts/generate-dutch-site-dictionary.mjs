import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const baseUrl = 'https://www.wordfeudwoorden.nl';
const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
const wordPattern = /^[A-Za-z]{2,12}$/;

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&#039;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function extractWords(html, letter) {
  const listStart = html.indexOf('<div id="az-lijst">');
  if (listStart < 0) throw new Error(`No A-Z list found for ${letter.toUpperCase()}.`);
  const boundary = html.slice(listStart).match(/<\/div>\s*<div style="clear:both/i);
  if (!boundary || boundary.index === undefined) {
    throw new Error(`A-Z list boundary not found for ${letter.toUpperCase()}.`);
  }
  const listEnd = listStart + boundary.index;

  const listHtml = html.slice(listStart, listEnd);
  const words = [];
  for (const block of listHtml.matchAll(/<div class="w_aa">([\s\S]*?)<\/div>/g)) {
    const heading = block[1].match(/<span class="w_b">(\d+) Letters<\/span>(?:<br>|<p>)/i);
    if (!heading || Number(heading[1]) > 12) continue;
    const body = block[1].slice(heading.index + heading[0].length);
    for (const rawWord of body.split(/<br\s*\/?>/i)) {
      const word = decodeHtml(rawWord.replace(/<[^>]+>/g, '').trim()).toUpperCase();
      if (wordPattern.test(word) && word.startsWith(letter.toUpperCase())) words.push(word);
    }
  }
  return words;
}

const paragraphFixture =
  '<div id="az-lijst"><div class="w_aa"><span class="w_b">2 Letters</span><p>Af<br>Ah</p></div></div><div style="clear:both"></div>';
const directBreakFixture =
  '<div id="az-lijst"><div class="w_aa"><span class="w_b">3 Letters</span><br>Qat<br>Qua</div></div><div style="clear:both"></div>';
if (extractWords(paragraphFixture, 'a').join(',') !== 'AF,AH') {
  throw new Error('Paragraph-style A-Z parser fixture failed.');
}
if (extractWords(directBreakFixture, 'q').join(',') !== 'QAT,QUA') {
  throw new Error('Direct-break A-Z parser fixture failed.');
}

const words = new Set();
const sourcePages = [];
const sourceSnapshotHash = createHash('sha256');
for (const letter of letters) {
  const url = `${baseUrl}/letter-${letter}/`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  const html = await response.text();
  sourceSnapshotHash.update(`${url}\n${html}\n`);
  const pageWords = [...new Set(extractWords(html, letter))];
  if (pageWords.length === 0) throw new Error(`${url} returned no words.`);
  sourcePages.push({ letter, url, wordCount: pageWords.length });
  for (const word of pageWords) words.add(word);
}

const sortedWords = [...words].sort();
const retrievedAt = new Date().toISOString();
const version = `${retrievedAt.slice(0, 10).replaceAll('-', '.')}.${retrievedAt
  .slice(11, 23)
  .replaceAll(':', '')
  .replace('.', '')}`;
const dictionarySha256 = createHash('sha256').update(sortedWords.join('\n')).digest('hex');
const sourceSnapshotSha256 = sourceSnapshotHash.digest('hex');
const byLength = Object.fromEntries(
  Array.from({ length: 11 }, (_, index) => {
    const length = index + 2;
    return [length, sortedWords.filter((word) => word.length === length).length];
  }),
);

await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../data/dutch-site-wordlist.ts', import.meta.url),
  `// Generated from the published A-Z pages at wordfeudwoorden.nl.\n// Do not edit manually; rerun generate-dutch-site-dictionary.mjs.\nexport const DUTCH_SITE_WORDS = ${JSON.stringify(sortedWords, null, 2)} as const;\n\nexport const DUTCH_SITE_DICTIONARY_META = {\n  version: '${version}',\n  sourceName: 'Wordfeudwoorden.nl published A-Z word lists',\n  sourceBaseUrl: '${baseUrl}',\n  sourcePages: ${JSON.stringify(sourcePages, null, 2)},\n  retrievedAt: '${retrievedAt}',\n  minLength: 2,\n  maxLength: 12,\n  wordCount: ${sortedWords.length},\n  byLength: ${JSON.stringify(byLength)},\n  dictionarySha256: '${dictionarySha256}',\n  sourceSnapshotSha256: '${sourceSnapshotSha256}',\n} as const;\n`,
);
await writeFile(
  new URL('../data/README.md', import.meta.url),
  `# Dutch site word list\n\nThis pack contains the words rendered on the published A-Z pages at [wordfeudwoorden.nl](https://www.wordfeudwoorden.nl/), restricted to 2–12 letters.\n\nThe site describes these pages as selected/high-scoring lists, so this is a reproducible published subset rather than a claim about the private backend dictionary. Regenerate it with:\n\n\`\`\`\npnpm --filter @workspace/crosslex run generate:dictionary\n\`\`\`\n\nThe generated TypeScript pack records every source page, retrieval date, word count, and per-length count.\n`,
);

console.log(JSON.stringify({ outputPath: 'data/dutch-site-wordlist.ts', wordCount: sortedWords.length, byLength }, null, 2));