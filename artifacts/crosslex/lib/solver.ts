import {
  DUTCH_DICTIONARY_METADATA,
  DUTCH_WORDS as PACKAGED_DUTCH_WORDS,
} from '../data/dutch-wordlist.ts';

export const BOARD_SIZE = 15;
export const RACK_SIZE = 7;

export type Board = string[][];
export type Direction = 'H' | 'V';

export type Move = {
  word: string;
  score: number;
  direction: Direction;
  row: number;
  col: number;
  crossWords: string[];
  tilesUsed: number;
};

const LETTER_VALUES: Record<string, number> = {
  A: 1,
  B: 4,
  C: 4,
  D: 2,
  E: 1,
  F: 4,
  G: 3,
  H: 4,
  I: 1,
  J: 8,
  K: 3,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 4,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 8,
  Z: 4,
  '?': 0,
};

export type PremiumLabel = 'TL' | 'DL' | 'TW' | 'DW' | '★';

type Premium = {
  label: PremiumLabel;
  letterMultiplier?: number;
  wordMultiplier?: number;
};

const PREMIUM_COORDINATES: Record<Exclude<PremiumLabel, '★'>, string[]> = {
  TW: [
    '0:0', '0:4', '0:10', '0:14',
    '4:0', '4:14',
    '10:0', '10:14',
    '14:0', '14:4', '14:10', '14:14',
  ],
  DW: [
    '2:2', '2:12',
    '3:7',
    '4:4', '4:10',
    '7:3', '7:11',
    '10:4', '10:10',
    '11:7',
    '12:2', '12:12',
  ],
  TL: [
    '1:5', '1:9',
    '3:3', '3:11',
    '5:1', '5:5', '5:9', '5:13',
    '9:1', '9:5', '9:9', '9:13',
    '11:3', '11:11',
    '13:5', '13:9',
  ],
  DL: [
    '0:7',
    '1:1', '1:13',
    '2:6', '2:8',
    '4:6', '4:8',
    '6:2', '6:4', '6:10', '6:12',
    '7:0', '7:14',
    '8:2', '8:4', '8:10', '8:12',
    '10:6', '10:8',
    '12:6', '12:8',
    '13:1', '13:13',
    '14:7',
  ],
};

const PREMIUM_VALUES: Record<Exclude<PremiumLabel, '★'>, Premium> = {
  TW: { label: 'TW', wordMultiplier: 3 },
  DW: { label: 'DW', wordMultiplier: 2 },
  TL: { label: 'TL', letterMultiplier: 3 },
  DL: { label: 'DL', letterMultiplier: 2 },
};

const PREMIUMS: Record<string, Premium> = {
  '7:7': { label: '★', wordMultiplier: 2 },
};

for (const [label, coordinates] of Object.entries(PREMIUM_COORDINATES) as [
  Exclude<PremiumLabel, '★'>,
  string[],
][]) {
  for (const coordinate of coordinates) {
    PREMIUMS[coordinate] = PREMIUM_VALUES[label];
  }
}

export function getPremiumLabel(row: number, col: number): PremiumLabel | '' {
  return PREMIUMS[`${row}:${col}`]?.label ?? '';
}

// A compact Dutch starter list keeps the first build fully offline. The
// dictionary is intentionally isolated so a complete licensed list can be
// swapped in without changing the solver or UI.
const STARTER_DUTCH_WORDS = [
  'AAI',
  'AAN',
  'AARD',
  'ACHT',
  'ACHTER',
  'ACT',
  'ADAM',
  'AF',
  'ALLE',
  'ANDER',
  'APPEL',
  'ARM',
  'ART',
  'AS',
  'AT',
  'BAK',
  'BAL',
  'BED',
  'BEER',
  'BEIDE',
  'BEN',
  'BEST',
  'BIJ',
  'BLAUW',
  'BOEK',
  'BOOM',
  'BORD',
  'BRAND',
  'BRIL',
  'BROOD',
  'BRUG',
  'BUUR',
  'DAAR',
  'DAG',
  'DANS',
  'DE',
  'DEEL',
  'DEUR',
  'DIER',
  'DING',
  'DOEN',
  'DOL',
  'DORP',
  'DRIE',
  'DROP',
  'EDDY',
  'EEN',
  'EER',
  'EIGEN',
  'EIND',
  'ELF',
  'EN',
  'ER',
  'ERIN',
  'EROP',
  'ETEN',
  'FLES',
  'FUDGE',
  'GA',
  'GAT',
  'GEEL',
  'GEEN',
  'GEIT',
  'GELD',
  'GOED',
  'GROOT',
  'HAAR',
  'HAL',
  'HAND',
  'HART',
  'HEB',
  'HEEFT',
  'HEK',
  'HEM',
  'HET',
  'HIER',
  'HOE',
  'HOND',
  'HUIS',
  'IK',
  'IN',
  'JA',
  'JAS',
  'KAMER',
  'KAN',
  'KANT',
  'KAT',
  'KIND',
  'KIP',
  'KLAAR',
  'KLEIN',
  'KLIK',
  'KNIE',
  'KOEK',
  'KOEL',
  'KOM',
  'KONING',
  'KOP',
  'KRAAN',
  'KRAK',
  'KUNNEN',
  'LAAT',
  'LAND',
  'LANG',
  'LAMP',
  'LEUK',
  'LEVEN',
  'LIJN',
  'LOOP',
  'MAAK',
  'MAAR',
  'MAAN',
  'MAN',
  'MEER',
  'MET',
  'MIJN',
  'MOEDER',
  'MOOI',
  'NA',
  'NAAR',
  'NACHT',
  'NAM',
  'NEE',
  'NEGEN',
  'NIET',
  'NIEUW',
  'NOG',
  'NOORD',
  'OCHTEND',
  'OF',
  'OM',
  'ONDER',
  'ONS',
  'OOK',
  'OOR',
  'OPEN',
  'OVER',
  'PAK',
  'PEN',
  'PLANT',
  'RECHT',
  'REGEN',
  'REIS',
  'RIJD',
  'RING',
  'ROOD',
  'ROOS',
  'RUG',
  'RUST',
  'SCHOOL',
  'SEIZOEN',
  'SLIM',
  'SLUIT',
  'SPEL',
  'STAAN',
  'STAD',
  'STER',
  'STOEL',
  'STOP',
  'STUK',
  'TAAL',
  'TAART',
  'TAK',
  'TANK',
  'TAS',
  'TEAM',
  'TEEN',
  'TEGEN',
  'TEL',
  'TIJD',
  'TOCH',
  'TOEN',
  'TREIN',
  'TRIP',
  'TWEE',
  'UIT',
  'VAN',
  'VEEL',
  'VER',
  'VIER',
  'VIS',
  'VLIEG',
  'VOGEL',
  'VOL',
  'VOOR',
  'VRIEND',
  'VROUW',
  'WACHT',
  'WAND',
  'WATER',
  'WEER',
  'WEL',
  'WERK',
  'WIE',
  'WIJN',
  'WIL',
  'WIT',
  'WOORD',
  'ZAL',
  'ZEE',
  'ZELF',
  'ZES',
  'ZIEN',
  'ZIT',
  'ZOEK',
  'ZON',
  'ZONDER',
  'ZUID',
  'ZWART',
].filter((word) => word.length >= 2);

export const DUTCH_DICTIONARY_SOURCE = {
  name: 'CrossLex Nederlandse Wordfeud-woordenlijst',
  version: DUTCH_DICTIONARY_METADATA.version,
  wordCount: DUTCH_DICTIONARY_METADATA.wordCount,
  sourceUrls: DUTCH_DICTIONARY_METADATA.sources,
} as const;

const REQUIRED_DUTCH_WORDS = [
  'AARDAPPEL',
  'FIETS',
  'GEZELLIG',
  'KONIJN',
  'MUZIEK',
  'PYJAMA',
  'QUICHE',
  'XYLOFOON',
  'ZWAARD',
] as const;
const REJECTED_PROPER_NAMES = ['AALTER', 'AMSTERDAM', 'ROTTERDAM'] as const;

export type DutchDictionaryStatus =
  | { ready: true; wordCount: number; source: typeof DUTCH_DICTIONARY_SOURCE }
  | { ready: false; error: string; source: typeof DUTCH_DICTIONARY_SOURCE };

export class DictionaryLoadError extends Error {
  constructor(message: string) {
    super(`Dutch dictionary unavailable: ${message}`);
    this.name = 'DictionaryLoadError';
  }
}

let dictionaryStatus: DutchDictionaryStatus | null = null;
let packagedDictionarySet: Set<string> | null = null;

function sha256WordSequence(words: readonly string[]) {
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
    0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
    0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
    0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
    0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2,
  ];
  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const block = new Uint8Array(64);
  const schedule = new Uint32Array(64);
  let blockLength = 0;
  let byteLength = 0;
  const rotateRight = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));
  const compress = () => {
    for (let index = 0; index < 16; index += 1) {
      const offset = index * 4;
      schedule[index] =
        (block[offset] << 24) | (block[offset + 1] << 16) | (block[offset + 2] << 8) | block[offset + 3];
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rotateRight(schedule[index - 15], 7) ^
        rotateRight(schedule[index - 15], 18) ^
        (schedule[index - 15] >>> 3);
      const s1 =
        rotateRight(schedule[index - 2], 17) ^
        rotateRight(schedule[index - 2], 19) ^
        (schedule[index - 2] >>> 10);
      schedule[index] =
        (schedule[index - 16] + s0 + schedule[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + constants[index] + schedule[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;
    blockLength = 0;
  };
  const pushByte = (byte: number) => {
    block[blockLength++] = byte;
    byteLength += 1;
    if (blockLength === 64) compress();
  };
  words.forEach((word, wordIndex) => {
    if (wordIndex > 0) pushByte(10);
    for (let index = 0; index < word.length; index += 1) pushByte(word.charCodeAt(index));
  });
  const bitLength = byteLength * 8;
  block[blockLength++] = 0x80;
  if (blockLength > 56) {
    block.fill(0, blockLength);
    compress();
  }
  block.fill(0, blockLength, 56);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let index = 0; index < 4; index += 1) {
    block[56 + index] = (high >>> (24 - index * 8)) & 0xff;
    block[60 + index] = (low >>> (24 - index * 8)) & 0xff;
  }
  compress();
  return hash.map((part) => part.toString(16).padStart(8, '0')).join('');
}

export function validateDutchDictionaryWords(words: readonly string[]): DutchDictionaryStatus {
  const actualWordCount = words.length;
  const expectedWordCount: number = DUTCH_DICTIONARY_SOURCE.wordCount;
  if (actualWordCount !== expectedWordCount) {
    return {
      ready: false,
      error: `expected ${expectedWordCount.toLocaleString()} words, found ${actualWordCount.toLocaleString()}`,
      source: DUTCH_DICTIONARY_SOURCE,
    };
  }
  let previous = '';
  for (const word of words) {
    if (!/^[A-Z]{2,15}$/.test(word)) {
      return { ready: false, error: `invalid playable entry "${word}"`, source: DUTCH_DICTIONARY_SOURCE };
    }
    if (word <= previous) {
      return {
        ready: false,
        error: `word pack is not strictly sorted or contains a duplicate near "${word}"`,
        source: DUTCH_DICTIONARY_SOURCE,
      };
    }
    previous = word;
  }
  const wordSet = new Set(words);
  packagedDictionarySet = wordSet;
  const missingWord = REQUIRED_DUTCH_WORDS.find((word) => !wordSet.has(word));
  if (missingWord) {
    return {
      ready: false,
      error: `required representative word "${missingWord}" is missing`,
      source: DUTCH_DICTIONARY_SOURCE,
    };
  }
  const invalidName = REJECTED_PROPER_NAMES.find((word) => wordSet.has(word));
  if (invalidName) {
    return {
      ready: false,
      error: `rejected proper name "${invalidName}" is present`,
      source: DUTCH_DICTIONARY_SOURCE,
    };
  }
  const actualHash = sha256WordSequence(words);
  if (actualHash !== DUTCH_DICTIONARY_METADATA.dictionarySha256) {
    return {
      ready: false,
      error: `dictionary integrity check failed (${actualHash.slice(0, 12)})`,
      source: DUTCH_DICTIONARY_SOURCE,
    };
  }
  return { ready: true, wordCount: actualWordCount, source: DUTCH_DICTIONARY_SOURCE };
}

function validateDutchDictionary(): DutchDictionaryStatus {
  return validateDutchDictionaryWords(PACKAGED_DUTCH_WORDS);
}

export function getDutchDictionaryStatus(): DutchDictionaryStatus {
  dictionaryStatus ??= validateDutchDictionary();
  return dictionaryStatus;
}

export function getDutchWords(): readonly string[] {
  const status = getDutchDictionaryStatus();
  if (!status.ready) throw new DictionaryLoadError(status.error);
  return PACKAGED_DUTCH_WORDS;
}

export const DUTCH_WORDS = PACKAGED_DUTCH_WORDS;

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<string>(BOARD_SIZE).fill(''),
  );
}

export function createSampleBoard(): Board {
  const board = createEmptyBoard();
  board[7][6] = 'T';
  board[7][7] = 'A';
  board[7][8] = 'K';
  board[5][7] = 'B';
  board[6][7] = 'O';
  return board;
}

function isInside(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getCell(board: Board, row: number, col: number) {
  return isInside(row, col) ? board[row][col] : '';
}

function hasLetters(board: Board) {
  return board.some((row) => row.some(Boolean));
}

function hasAdjacentLetter(board: Board, row: number, col: number) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ].some(([nextRow, nextCol]) => Boolean(getCell(board, nextRow, nextCol)));
}

function readLine(board: Board, row: number, col: number, direction: Direction) {
  const rowStep = direction === 'V' ? 1 : 0;
  const colStep = direction === 'H' ? 1 : 0;
  let startRow = row;
  let startCol = col;

  while (
    isInside(startRow - rowStep, startCol - colStep) &&
    getCell(board, startRow - rowStep, startCol - colStep)
  ) {
    startRow -= rowStep;
    startCol -= colStep;
  }

  let word = '';
  let currentRow = startRow;
  let currentCol = startCol;
  while (isInside(currentRow, currentCol) && getCell(board, currentRow, currentCol)) {
    word += getCell(board, currentRow, currentCol);
    currentRow += rowStep;
    currentCol += colStep;
  }
  return word;
}

function getCrossWord(
  board: Board,
  row: number,
  col: number,
  direction: Direction,
  placedLetter: string,
) {
  const crossDirection: Direction = direction === 'H' ? 'V' : 'H';
  const rowStep = crossDirection === 'V' ? 1 : 0;
  const colStep = crossDirection === 'H' ? 1 : 0;
  let startRow = row - rowStep;
  let startCol = col - colStep;
  let prefix = '';
  while (getCell(board, startRow, startCol)) {
    prefix = getCell(board, startRow, startCol) + prefix;
    startRow -= rowStep;
    startCol -= colStep;
  }
  let suffix = '';
  let scanRow = row + rowStep;
  let scanCol = col + colStep;
  while (getCell(board, scanRow, scanCol)) {
    suffix += getCell(board, scanRow, scanCol);
    scanRow += rowStep;
    scanCol += colStep;
  }
  return prefix + placedLetter + suffix;
}

function scoreMove(
  board: Board,
  word: string,
  row: number,
  col: number,
  direction: Direction,
  blankIndexes: number[],
) {
  const newTiles: Array<{ row: number; col: number; letter: string; letterIndex: number }> = [];
  let mainScore = 0;
  let mainWordMultiplier = 1;
  let currentRow = row;
  let currentCol = col;

  for (const [letterIndex, letter] of [...word].entries()) {
    if (!getCell(board, currentRow, currentCol)) {
      const premium = PREMIUMS[`${currentRow}:${currentCol}`];
      const value = blankIndexes.includes(letterIndex) ? 0 : LETTER_VALUES[letter] ?? 0;
      mainScore += value * (premium?.letterMultiplier ?? 1);
      mainWordMultiplier *= premium?.wordMultiplier ?? 1;
      newTiles.push({ row: currentRow, col: currentCol, letter, letterIndex });
    } else {
      mainScore += LETTER_VALUES[letter] ?? 0;
    }
    currentRow += direction === 'V' ? 1 : 0;
    currentCol += direction === 'H' ? 1 : 0;
  }

  let crossScore = 0;
  const crossDirection: Direction = direction === 'H' ? 'V' : 'H';
  const rowStep = crossDirection === 'V' ? 1 : 0;
  const colStep = crossDirection === 'H' ? 1 : 0;

  for (const tile of newTiles) {
    const premium = PREMIUMS[`${tile.row}:${tile.col}`];
    const tileValue = blankIndexes.includes(tile.letterIndex) ? 0 : LETTER_VALUES[tile.letter] ?? 0;
    let wordScore = tileValue * (premium?.letterMultiplier ?? 1);
    const wordMultiplier = premium?.wordMultiplier ?? 1;
    let wordLength = 1;
    let scanRow = tile.row - rowStep;
    let scanCol = tile.col - colStep;
    while (getCell(board, scanRow, scanCol)) {
      wordScore += LETTER_VALUES[getCell(board, scanRow, scanCol)] ?? 0;
      wordLength += 1;
      scanRow -= rowStep;
      scanCol -= colStep;
    }
    scanRow = tile.row + rowStep;
    scanCol = tile.col + colStep;
    while (getCell(board, scanRow, scanCol)) {
      wordScore += LETTER_VALUES[getCell(board, scanRow, scanCol)] ?? 0;
      wordLength += 1;
      scanRow += rowStep;
      scanCol += colStep;
    }

    if (wordLength > 1) crossScore += wordScore * wordMultiplier;
  }

  const rackBonus = newTiles.length === RACK_SIZE ? 40 : 0;
  return mainScore * mainWordMultiplier + crossScore + rackBonus;
}

function canUseRack(
  board: Board,
  rackCounts: Map<string, number>,
  word: string,
  row: number,
  col: number,
  direction: Direction,
) {
  let currentRow = row;
  let currentCol = col;
  let newTiles = 0;
  const blankIndexes: number[] = [];
  const remaining = new Map(rackCounts);
  for (const [letterIndex, letter] of [...word].entries()) {
    if (!isInside(currentRow, currentCol)) return { valid: false, newTiles: 0 };
    const existing = getCell(board, currentRow, currentCol);
    if (existing && existing !== letter) return { valid: false, newTiles: 0 };
    if (!existing) {
      const available = remaining.get(letter) ?? 0;
      const blanks = remaining.get('?') ?? 0;
      if (available > 0) {
        remaining.set(letter, available - 1);
      } else if (blanks > 0) {
        remaining.set('?', blanks - 1);
        blankIndexes.push(letterIndex);
      } else {
        return { valid: false, newTiles: 0 };
      }
      newTiles += 1;
    }
    currentRow += direction === 'V' ? 1 : 0;
    currentCol += direction === 'H' ? 1 : 0;
  }
  return { valid: newTiles > 0, newTiles, blankIndexes };
}

function consumeRackForWord(rackCounts: Map<string, number>, word: string) {
  const remaining = new Map(rackCounts);
  const blankIndexes: number[] = [];
  for (const [letterIndex, letter] of [...word].entries()) {
    const available = remaining.get(letter) ?? 0;
    const blanks = remaining.get('?') ?? 0;
    if (available > 0) {
      remaining.set(letter, available - 1);
    } else if (blanks > 0) {
      remaining.set('?', blanks - 1);
      blankIndexes.push(letterIndex);
    } else {
      return null;
    }
  }
  return blankIndexes;
}

function scoreEmptyBoardMove(
  word: string,
  row: number,
  col: number,
  direction: Direction,
  blankIndexes: number[],
) {
  let score = 0;
  let wordMultiplier = 1;
  for (const [letterIndex, letter] of [...word].entries()) {
    const tileRow = row + (direction === 'V' ? letterIndex : 0);
    const tileCol = col + (direction === 'H' ? letterIndex : 0);
    const premium = PREMIUMS[`${tileRow}:${tileCol}`];
    const value = blankIndexes.includes(letterIndex) ? 0 : LETTER_VALUES[letter] ?? 0;
    score += value * (premium?.letterMultiplier ?? 1);
    wordMultiplier *= premium?.wordMultiplier ?? 1;
  }
  return score * wordMultiplier + (word.length === RACK_SIZE ? 40 : 0);
}

function createLetterCounts(letters: Iterable<string>) {
  const counts = new Uint8Array(26);
  for (const letter of letters) {
    const index = letter.charCodeAt(0) - 65;
    if (index >= 0 && index < counts.length) counts[index] += 1;
  }
  return counts;
}

function canSupplyWord(
  wordCounts: Uint8Array,
  rackCounts: Uint8Array,
  boardCounts: Uint8Array,
  blankCount: number,
) {
  let blanksNeeded = 0;
  for (let index = 0; index < wordCounts.length; index += 1) {
    blanksNeeded += Math.max(0, wordCounts[index] - rackCounts[index] - boardCounts[index]);
    if (blanksNeeded > blankCount) return false;
  }
  return true;
}

function getBoardLetterCounts(board: Board) {
  const all = createLetterCounts(board.flat());
  const rows = board.map((row) => createLetterCounts(row));
  const columns = Array.from({ length: BOARD_SIZE }, (_, col) =>
    createLetterCounts(board.map((row) => row[col])),
  );
  return { all, rows, columns };
}

function getBoardAnchors(board: Board) {
  const horizontal = Array.from({ length: BOARD_SIZE }, () => [] as number[]);
  const vertical = Array.from({ length: BOARD_SIZE }, () => [] as number[]);
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] || board[row - 1]?.[col] || board[row + 1]?.[col]) {
        horizontal[row].push(col);
      }
      if (board[row][col] || board[row]?.[col - 1] || board[row]?.[col + 1]) {
        vertical[col].push(row);
      }
    }
  }
  return { horizontal, vertical };
}

function isLegalPlacement(
  board: Board,
  word: string,
  row: number,
  col: number,
  direction: Direction,
  dictionary: Set<string>,
) {
  const hasBoard = hasLetters(board);
  let currentRow = row;
  let currentCol = col;
  let intersects = false;
  let touches = false;
  const crossWords: string[] = [];

  const beforeRow = row - (direction === 'V' ? 1 : 0);
  const beforeCol = col - (direction === 'H' ? 1 : 0);
  const afterRow =
    row + (direction === 'V' ? word.length : 0);
  const afterCol =
    col + (direction === 'H' ? word.length : 0);
  if (getCell(board, beforeRow, beforeCol) || getCell(board, afterRow, afterCol)) {
    return null;
  }

  for (const letter of word) {
    const existing = getCell(board, currentRow, currentCol);
    if (existing) intersects = true;
    if (hasAdjacentLetter(board, currentRow, currentCol)) touches = true;

    if (!existing) {
      const cross = getCrossWord(board, currentRow, currentCol, direction, letter);
      if (cross.length > 1) {
        crossWords.push(cross);
        if (!dictionary.has(cross)) return null;
      }
    }
    currentRow += direction === 'V' ? 1 : 0;
    currentCol += direction === 'H' ? 1 : 0;
  }

  if (hasBoard && !intersects && !touches) return null;
  if (!hasBoard) {
    const centerRow = 7;
    const centerCol = 7;
    const endRow = row + (direction === 'V' ? word.length - 1 : 0);
    const endCol = col + (direction === 'H' ? word.length - 1 : 0);
    if (
      centerRow < row ||
      centerRow > endRow ||
      centerCol < col ||
      centerCol > endCol
    ) {
      return null;
    }
  }

  return [...new Set(crossWords)];
}

export function findBestMoves(
  board: Board,
  rack: string,
  words: readonly string[] = getDutchWords(),
  limit = 8,
): Move[] {
  const dictionary =
    words === PACKAGED_DUTCH_WORDS
      ? (packagedDictionarySet ??= new Set(getDutchWords()))
      : new Set(words.map((word) => word.toUpperCase()));
  const rackCounts = new Map<string, number>();
  const normalizedRack = rack.toUpperCase().replace(/[^A-Z?]/g, '');
  if (normalizedRack.length > RACK_SIZE) {
    throw new Error(`Rack contains ${normalizedRack.length} tiles; Wordfeud allows at most ${RACK_SIZE}.`);
  }
  const suppliedBlankCount = [...normalizedRack].filter((letter) => letter === '?').length;
  if (suppliedBlankCount > 2) {
    throw new Error(`Rack contains ${suppliedBlankCount} blanks; a Wordfeud set contains only 2.`);
  }
  for (const letter of normalizedRack) {
    rackCounts.set(letter, (rackCounts.get(letter) ?? 0) + 1);
  }
  const rackLetterCounts = createLetterCounts(normalizedRack);
  const blankCount = rackCounts.get('?') ?? 0;
  const boardLetterCounts = getBoardLetterCounts(board);
  const boardHasLetters = hasLetters(board);
  const boardAnchors = getBoardAnchors(board);

  const moves: Move[] = [];
  for (const word of dictionary) {
    if (word.length > BOARD_SIZE || word.length < 2) continue;
    const wordCounts = createLetterCounts(word);
    if (!canSupplyWord(wordCounts, rackLetterCounts, boardLetterCounts.all, blankCount)) continue;
    if (!boardHasLetters) {
      const blankIndexes = consumeRackForWord(rackCounts, word);
      if (!blankIndexes) continue;
      for (const direction of ['H', 'V'] as Direction[]) {
        const line = Math.floor(BOARD_SIZE / 2);
        const firstStart = Math.max(0, line - word.length + 1);
        const lastStart = Math.min(line, BOARD_SIZE - word.length);
        for (let start = firstStart; start <= lastStart; start += 1) {
          const row = direction === 'H' ? line : start;
          const col = direction === 'H' ? start : line;
          moves.push({
            word,
            score: scoreEmptyBoardMove(word, row, col, direction, blankIndexes),
            direction,
            row,
            col,
            crossWords: [],
            tilesUsed: word.length,
          });
        }
      }
      continue;
    }
    for (const direction of ['H', 'V'] as Direction[]) {
      const lineCounts = direction === 'H' ? boardLetterCounts.rows : boardLetterCounts.columns;
      const lineAnchors = direction === 'H' ? boardAnchors.horizontal : boardAnchors.vertical;
      for (let line = 0; line < BOARD_SIZE; line += 1) {
        if (lineAnchors[line].length === 0) continue;
        if (!canSupplyWord(wordCounts, rackLetterCounts, lineCounts[line], blankCount)) continue;
        const possibleStarts = new Uint8Array(BOARD_SIZE);
        for (const anchor of lineAnchors[line]) {
          const firstStart = Math.max(0, anchor - word.length + 1);
          const lastStart = Math.min(anchor, BOARD_SIZE - word.length);
          for (let start = firstStart; start <= lastStart; start += 1) possibleStarts[start] = 1;
        }
        for (let start = 0; start <= BOARD_SIZE - word.length; start += 1) {
          if (!possibleStarts[start]) continue;
          const row = direction === 'H' ? line : start;
          const col = direction === 'H' ? start : line;
          const rackResult = canUseRack(
            board,
            rackCounts,
            word,
            row,
            col,
            direction,
          );
          if (!rackResult.valid) continue;
          const crossWords = isLegalPlacement(
            board,
            word,
            row,
            col,
            direction,
            dictionary,
          );
          if (!crossWords) continue;
          moves.push({
            word,
            score: scoreMove(
              board,
              word,
              row,
              col,
              direction,
              rackResult.blankIndexes ?? [],
            ),
            direction,
            row,
            col,
            crossWords,
            tilesUsed: rackResult.newTiles,
          });
        }
      }
    }
  }

  const seenMoves = new Set<string>();
  return moves
    .sort((a, b) => b.score - a.score || b.word.length - a.word.length)
    .filter((move) => {
      const key = `${move.word}:${move.row}:${move.col}:${move.direction}`;
      if (seenMoves.has(key)) return false;
      seenMoves.add(key);
      return true;
    })
    .slice(0, limit);
}
