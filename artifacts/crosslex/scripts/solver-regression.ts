import {
  DUTCH_WORDS,
  createEmptyBoard,
  findBestMoves,
  getDutchDictionaryStatus,
  getPremiumLabel,
  validateDutchDictionaryWords,
  type Board,
  type Direction,
} from '../lib/solver.ts';
import { DUTCH_SITE_DICTIONARY_META } from '../data/dutch-site-wordlist.ts';

type ExpectedMove = {
  word: string;
  row: number;
  col: number;
  direction: Direction;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function containsMove(moves: ReturnType<typeof findBestMoves>, expected: ExpectedMove) {
  return moves.some(
    (move) =>
      move.word === expected.word &&
      move.row === expected.row &&
      move.col === expected.col &&
      move.direction === expected.direction,
  );
}

const expectedPremiums: Record<string, string> = {};
for (const [label, coordinates] of Object.entries({
  '3W': ['0:4', '0:10', '4:0', '4:14', '10:0', '10:14', '14:4', '14:10'],
  '2W': ['2:2', '2:12', '4:4', '4:10', '7:3', '7:11', '10:4', '10:10', '12:2', '12:12'],
  '3L': [
    '0:0', '0:14', '1:5', '1:9', '3:3', '3:11', '5:1', '5:5', '5:9', '5:13',
    '9:1', '9:5', '9:9', '9:13', '11:3', '11:11', '13:5', '13:9', '14:0', '14:14',
  ],
  '2L': [
    '0:7', '1:1', '1:13', '2:6', '2:8', '4:6', '4:8', '6:2', '6:4', '6:10',
    '6:12', '7:0', '7:14', '8:2', '8:4', '8:10', '8:12', '10:6', '10:8',
    '12:6', '12:8', '13:1', '13:13', '14:7',
  ],
  '★': ['7:7'],
} as const)) {
  for (const coordinate of coordinates) expectedPremiums[coordinate] = label;
}
for (let row = 0; row < 15; row += 1) {
  for (let col = 0; col < 15; col += 1) {
    assert(
      getPremiumLabel(row, col) === (expectedPremiums[`${row}:${col}`] ?? ''),
      `Premium mismatch at ${row}:${col}.`,
    );
  }
}

const dictionaryStatus = getDutchDictionaryStatus();
const expectedDictionarySha256 = '3fc5d5fcffc2cf18bf26e9f429b2d9c98c21564d70aaf7a0e926fda2a216a038';
const expectedPageCounts = [
  170, 124, 161, 162, 167, 161, 161, 166, 167, 162, 162, 162, 164,
  163, 168, 164, 124, 163, 162, 163, 165, 161, 161, 34, 62, 162,
];
assert(dictionaryStatus.ready, 'The published A-Z dictionary must load successfully.');
assert(
  dictionaryStatus.wordCount === 3941 && DUTCH_SITE_DICTIONARY_META.sourcePages.length === 26,
  'The generated dictionary must include all 26 published A-Z pages.',
);
assert(
  DUTCH_SITE_DICTIONARY_META.dictionarySha256 === expectedDictionarySha256,
  'The generated dictionary must match the reviewed published snapshot.',
);
assert(
  DUTCH_SITE_DICTIONARY_META.sourcePages.every(
    (page, index) => page.wordCount === expectedPageCounts[index],
  ),
  'Every source page must match the reviewed unique-word count.',
);
const dictionaryWords = new Set<string>(DUTCH_WORDS);
for (const word of [
  'AF',
  'ACH',
  'ACCU',
  'ACRYL',
  'ACQUIT',
  'ACQUITS',
  'ATYPISCH',
  'ACRYLBLOK',
  'ACRYLVEZEL',
  'AMFIBRACHYS',
  'ANTICYCLISCH',
]) {
  assert(dictionaryWords.has(word), `The published dictionary is missing ${word}.`);
}
assert(
  validateDutchDictionaryWords(DUTCH_WORDS.slice(1))?.includes('count mismatch'),
  'An incomplete dictionary pack must fail explicitly.',
);
const corruptedDictionary: string[] = [...DUTCH_WORDS];
corruptedDictionary[0] = 'AB';
assert(
  validateDutchDictionaryWords(corruptedDictionary)?.includes('checksum mismatch'),
  'A same-count corrupted dictionary pack must fail explicitly.',
);

function createReferenceBoard(): Board {
  const board = createEmptyBoard();
  const occupied: Array<[number, number, string]> = [
    [5, 12, 'N'],
    [6, 12, 'E'],
    [6, 14, 'S'],
    [7, 7, 'V'],
    [7, 8, 'E'],
    [7, 9, 'R'],
    [7, 10, 'Z'],
    [7, 11, 'E'],
    [7, 12, 'T'],
    [7, 13, 'T'],
    [7, 14, 'E'],
    [8, 10, 'I'],
    [8, 12, 'E'],
    [8, 14, 'K'],
    [9, 8, 'K'],
    [9, 9, 'E'],
    [9, 10, 'T'],
    [9, 11, 'E'],
    [9, 12, 'N'],
    [9, 14, 'S'],
    [10, 10, 'J'],
    [10, 14, 'E'],
    [11, 7, 'V'],
    [11, 8, 'O'],
    [11, 9, 'Z'],
    [11, 10, 'E'],
    [11, 11, 'R'],
    [12, 8, 'P'],
  ];
  for (const [row, col, letter] of occupied) board[row][col] = letter;
  return board;
}

const referenceBoard = createReferenceBoard();
const invalidEddy = { word: 'EDDY', row: 2, col: 13, direction: 'V' as const };

const strictMoves = findBestMoves(referenceBoard, 'YDFUDEG', ['EDDY', 'FUDGE'], 100);
assert(
  !containsMove(strictMoves, invalidEddy),
  'EDDY was accepted even though its final Y creates the invalid crossing NY.',
);
const defaultDictionaryMoves = findBestMoves(referenceBoard, 'YDFUDEG', undefined, 100);
assert(
  !containsMove(defaultDictionaryMoves, invalidEddy),
  'The published dictionary accepted EDDY even though it creates the unpublished NY crossing.',
);

const fixtureCheck = findBestMoves(referenceBoard, 'YDFUDEG', ['EDDY', 'NY'], 100);
assert(
  containsMove(fixtureCheck, invalidEddy),
  'The reference fixture no longer exercises the NY crossing.',
);

const fudgeMoves = findBestMoves(createEmptyBoard(), 'YDFUDEG', ['FUDGE'], 20);
assert(fudgeMoves.some((move) => move.word === 'FUDGE'), 'FUDGE should be playable.');

const scoringBoard = createEmptyBoard();
scoringBoard[7][7] = 'A';
scoringBoard[6][8] = 'A';
const scoredCrossing = findBestMoves(scoringBoard, 'T', ['AT'], 20).find(
  (move) => move.word === 'AT' && move.row === 7 && move.col === 7 && move.direction === 'H',
);
assert(scoredCrossing?.score === 4, 'The score must include both the main word and AT crossing.');

console.log('Solver regression checks passed.');