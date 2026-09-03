import { OPENTAAL_DUTCH_WORDS } from '../data/dutch-wordlist.ts';

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

export const DUTCH_DICTIONARY_SOURCE = {
  name: 'OpenTaal Nederlandse woordenlijst',
  version: '2.20.23',
  releaseDate: '2023-03-10',
  wordCount: 337502,
  license: 'Revised BSD License and/or CC BY 3.0',
  sourceUrl: 'https://github.com/OpenTaal/opentaal-wordlist',
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

export type DutchDictionaryStatus =
  | {
      ready: true;
      wordCount: number;
      source: typeof DUTCH_DICTIONARY_SOURCE;
    }
  | {
      ready: false;
      error: string;
      source: typeof DUTCH_DICTIONARY_SOURCE;
    };

export class DictionaryLoadError extends Error {
  constructor(message: string) {
    super(`Dutch dictionary unavailable: ${message}`);
    this.name = 'DictionaryLoadError';
  }
}

let dictionaryStatus: DutchDictionaryStatus | null = null;

function validateDutchDictionary(): DutchDictionaryStatus {
  const words = OPENTAAL_DUTCH_WORDS;
  if (words.length !== DUTCH_DICTIONARY_SOURCE.wordCount) {
    return {
      ready: false,
      error: `expected ${DUTCH_DICTIONARY_SOURCE.wordCount.toLocaleString()} words, found ${words.length.toLocaleString()}`,
      source: DUTCH_DICTIONARY_SOURCE,
    };
  }

  let previous = '';
  for (const word of words) {
    if (!/^[A-Z]{2,15}$/.test(word)) {
      return {
        ready: false,
        error: `invalid playable entry "${word}"`,
        source: DUTCH_DICTIONARY_SOURCE,
      };
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
  const missingWord = REQUIRED_DUTCH_WORDS.find((word) => !wordSet.has(word));
  if (missingWord) {
    return {
      ready: false,
      error: `required representative word "${missingWord}" is missing`,
      source: DUTCH_DICTIONARY_SOURCE,
    };
  }

  return {
    ready: true,
    wordCount: words.length,
    source: DUTCH_DICTIONARY_SOURCE,
  };
}

export function getDutchDictionaryStatus(): DutchDictionaryStatus {
  dictionaryStatus ??= validateDutchDictionary();
  return dictionaryStatus;
}

export function getDutchWords(): readonly string[] {
  const status = getDutchDictionaryStatus();
  if (!status.ready) throw new DictionaryLoadError(status.error);
  return OPENTAAL_DUTCH_WORDS;
}

// Kept as a named export for callers that need the active dictionary itself.
export const DUTCH_WORDS = OPENTAAL_DUTCH_WORDS;

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
  words: readonly string[] = getDutchWords(),
  limit = 8,
): Move[] {
  const dictionary = new Set(words.map((word) => word.toUpperCase()));
  const rackCounts = new Map<string, number>();
  const normalizedRack = rack.toUpperCase().replace(/[^A-Z?]/g, '');
  for (const letter of normalizedRack) {
    rackCounts.set(letter, (rackCounts.get(letter) ?? 0) + 1);
  }
  const rackLetterCounts = createLetterCounts(normalizedRack);
  const blankCount = rackCounts.get('?') ?? 0;
  const boardLetterCounts = getBoardLetterCounts(board);

  const moves: Move[] = [];
  for (const word of dictionary) {
    if (word.length > BOARD_SIZE || word.length < 2) continue;
    const wordCounts = createLetterCounts(word);
    if (
      !canSupplyWord(
        wordCounts,
        rackLetterCounts,
        boardLetterCounts.all,
        blankCount,
      )
    ) {
      continue;
    }

    for (const direction of ['H', 'V'] as Direction[]) {
      const lineCounts =
        direction === 'H' ? boardLetterCounts.rows : boardLetterCounts.columns;
      for (let line = 0; line < BOARD_SIZE; line += 1) {
        if (!canSupplyWord(wordCounts, rackLetterCounts, lineCounts[line], blankCount)) {
          continue;
        }
        for (let start = 0; start <= BOARD_SIZE - word.length; start += 1) {
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
