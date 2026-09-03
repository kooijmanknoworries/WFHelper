import {
  DUTCH_SITE_DICTIONARY_META,
  DUTCH_SITE_WORDS,
} from '../data/dutch-site-wordlist.ts';
import { sha256Ascii } from './sha256.ts';

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

export type PremiumLabel = '3L' | '2L' | '3W' | '2W' | '★';

type Premium = {
  label: PremiumLabel;
  letterMultiplier?: number;
  wordMultiplier?: number;
};

const PREMIUM_COORDINATES: Record<Exclude<PremiumLabel, '★'>, string[]> = {
  '3W': [
    '0:4', '0:10',
    '4:0', '4:14',
    '10:0', '10:14',
    '14:4', '14:10',
  ],
  '2W': [
    '2:2', '2:12',
    '4:4', '4:10',
    '7:3', '7:11',
    '10:4', '10:10',
    '12:2', '12:12',
  ],
  '3L': [
    '0:0', '0:14',
    '1:5', '1:9',
    '3:3', '3:11',
    '5:1', '5:5', '5:9', '5:13',
    '9:1', '9:5', '9:9', '9:13',
    '11:3', '11:11',
    '13:5', '13:9',
    '14:0', '14:14',
  ],
  '2L': [
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
  '3W': { label: '3W', wordMultiplier: 3 },
  '2W': { label: '2W', wordMultiplier: 2 },
  '3L': { label: '3L', letterMultiplier: 3 },
  '2L': { label: '2L', letterMultiplier: 2 },
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
export const LEGACY_PROTOTYPE_DUTCH_WORDS = [
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

export const DUTCH_WORDS = [...DUTCH_SITE_WORDS];

export function validateDutchDictionaryWords(words: readonly string[]) {
  if (words.length !== DUTCH_SITE_DICTIONARY_META.wordCount) {
    return `Dictionary count mismatch: expected ${DUTCH_SITE_DICTIONARY_META.wordCount}, received ${words.length}.`;
  }
  if (DUTCH_SITE_DICTIONARY_META.sourcePages.length !== 26) {
    return 'Dictionary source metadata does not contain all 26 A-Z pages.';
  }
  const sourceWordCount = DUTCH_SITE_DICTIONARY_META.sourcePages.reduce(
    (total, page) => total + page.wordCount,
    0,
  );
  if (sourceWordCount !== words.length) {
    return `Dictionary source count mismatch: pages contain ${sourceWordCount}, pack contains ${words.length}.`;
  }
  const seen = new Set<string>();
  for (const word of words) {
    if (!/^[A-Z]{2,12}$/.test(word)) return `Dictionary contains an invalid entry: ${word}.`;
    if (seen.has(word)) return `Dictionary contains a duplicate entry: ${word}.`;
    seen.add(word);
  }
  const checksum = sha256Ascii(words.join('\n'));
  if (checksum !== DUTCH_SITE_DICTIONARY_META.dictionarySha256) {
    return `Dictionary checksum mismatch: expected ${DUTCH_SITE_DICTIONARY_META.dictionarySha256}, received ${checksum}.`;
  }
  return null;
}

const DUTCH_DICTIONARY_ERROR = validateDutchDictionaryWords(DUTCH_WORDS);

export function getDutchDictionaryStatus() {
  if (DUTCH_DICTIONARY_ERROR) {
    return {
      ready: false as const,
      wordCount: 0,
      error: DUTCH_DICTIONARY_ERROR,
      source: DUTCH_SITE_DICTIONARY_META,
    };
  }
  return {
    ready: true as const,
    wordCount: DUTCH_WORDS.length,
    source: DUTCH_SITE_DICTIONARY_META,
  };
}

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

function getCrossWord(board: Board, row: number, col: number, direction: Direction) {
  return readLine(board, row, col, direction === 'H' ? 'V' : 'H');
}

function scoreMove(
  board: Board,
  word: string,
  row: number,
  col: number,
  direction: Direction,
  blankIndexes: number[],
) {
  const placementBoard = board.map((boardRow) => [...boardRow]);
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
      placementBoard[currentRow][currentCol] = letter;
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
    let startRow = tile.row;
    let startCol = tile.col;
    while (getCell(placementBoard, startRow - rowStep, startCol - colStep)) {
      startRow -= rowStep;
      startCol -= colStep;
    }

    let wordScore = 0;
    let wordMultiplier = 1;
    let wordLength = 0;
    let scanRow = startRow;
    let scanCol = startCol;
    while (isInside(scanRow, scanCol) && getCell(placementBoard, scanRow, scanCol)) {
      const letter = getCell(placementBoard, scanRow, scanCol);
      if (scanRow === tile.row && scanCol === tile.col) {
        const premium = PREMIUMS[`${scanRow}:${scanCol}`];
        const value = blankIndexes.includes(tile.letterIndex) ? 0 : LETTER_VALUES[letter] ?? 0;
        wordScore += value * (premium?.letterMultiplier ?? 1);
        wordMultiplier *= premium?.wordMultiplier ?? 1;
      } else {
        wordScore += LETTER_VALUES[letter] ?? 0;
      }
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
  const placementBoard = board.map((boardRow) => [...boardRow]);
  let placementRow = row;
  let placementCol = col;
  for (const letter of word) {
    placementBoard[placementRow][placementCol] = letter;
    placementRow += direction === 'V' ? 1 : 0;
    placementCol += direction === 'H' ? 1 : 0;
  }

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
      const cross = getCrossWord(placementBoard, currentRow, currentCol, direction);
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
  words: string[] = DUTCH_WORDS,
  limit = 8,
): Move[] {
  if (words === DUTCH_WORDS && DUTCH_DICTIONARY_ERROR) {
    throw new Error(`Dutch dictionary failed to load: ${DUTCH_DICTIONARY_ERROR}`);
  }
  const dictionary = new Set(words.map((word) => word.toUpperCase()));
  const rackCounts = new Map<string, number>();
  for (const letter of rack.toUpperCase().replace(/[^A-Z?]/g, '')) {
    rackCounts.set(letter, (rackCounts.get(letter) ?? 0) + 1);
  }

  const moves: Move[] = [];
  for (const word of dictionary) {
    if (word.length > BOARD_SIZE || word.length < 2) continue;
    for (const direction of ['H', 'V'] as Direction[]) {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
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

  return moves
    .sort((a, b) => b.score - a.score || b.word.length - a.word.length)
    .filter(
      (move, index, allMoves) =>
        allMoves.findIndex(
          (candidate) =>
            candidate.word === move.word &&
            candidate.row === move.row &&
            candidate.col === move.col &&
            candidate.direction === move.direction,
        ) === index,
    )
    .slice(0, limit);
}
