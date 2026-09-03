import {
  createEmptyBoard,
  createSampleBoard,
  DUTCH_DICTIONARY_SOURCE,
  findBestMoves,
  getDutchDictionaryStatus,
  getDutchWords,
  validateDutchDictionaryWords,
  type Board,
  type Direction,
} from '../lib/solver.ts';

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

const dictionaryStatus = getDutchDictionaryStatus();
assert(dictionaryStatus.ready, 'The packaged Dutch dictionary must load successfully.');
assert(
  dictionaryStatus.wordCount === DUTCH_DICTIONARY_SOURCE.wordCount,
  'The packaged Dutch dictionary count must match its source metadata.',
);
const dutchWords = new Set(getDutchWords());
for (const word of ['AARDAPPEL', 'GEZELLIG', 'KONIJN', 'MUZIEK', 'PYJAMA', 'QUICHE', 'XYLOFOON']) {
  assert(dutchWords.has(word), `The Dutch dictionary should contain ${word}.`);
}
for (const word of ['AALTER', 'AMSTERDAM', 'ROTTERDAM']) {
  assert(!dutchWords.has(word), `The proper name ${word} must not be playable.`);
}
const tamperedWords = [...getDutchWords()];
let tamperIndex = -1;
for (let index = 1; index < tamperedWords.length; index += 1) {
  const replacement = `${tamperedWords[index - 1]}A`;
  if (replacement.length <= 15 && replacement < tamperedWords[index]) {
    tamperIndex = index;
    tamperedWords[index] = replacement;
    break;
  }
}
assert(tamperIndex > 0, 'The tamper fixture must find a sorted replacement.');
const tamperedStatus = validateDutchDictionaryWords(tamperedWords);
assert(
  !tamperedStatus.ready && tamperedStatus.error.includes('integrity check failed'),
  'A sorted, same-count tampered dictionary must fail its checksum.',
);
let impossibleRackFailed = false;
try {
  findBestMoves(createEmptyBoard(), '???????');
} catch (error) {
  impossibleRackFailed =
    error instanceof Error && error.message.includes('Wordfeud set contains only 2');
}
assert(
  impossibleRackFailed,
  'A physically impossible seven-blank rack must fail explicitly instead of blocking the UI.',
);
const twoBlankStart = performance.now();
const twoBlankMoves = findBestMoves(createSampleBoard(), 'AARTE??', undefined, 8);
const twoBlankDuration = performance.now() - twoBlankStart;
assert(twoBlankMoves.length > 0, 'A valid two-blank rack should produce moves on the sample board.');
assert(
  twoBlankDuration < 2000,
  `A valid two-blank solve must stay responsive (took ${Math.round(twoBlankDuration)} ms).`,
);

const strictMoves = findBestMoves(referenceBoard, 'YDFUDEG', ['EDDY', 'FUDGE'], 100);
assert(
  !containsMove(strictMoves, invalidEddy),
  'EDDY was accepted even though its final Y creates the invalid crossing NY.',
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