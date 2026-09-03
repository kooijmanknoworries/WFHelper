import {
  DUTCH_WORDS,
  applyMove,
  createEmptyBoard,
  createSampleBoard,
  findBestMoves,
  getDutchDictionaryStatus,
  getPremiumLabel,
  validateDutchDictionaryWords,
  type Board,
  type Direction,
} from '../lib/solver.ts';
import {
  DUTCH_SITE_DICTIONARY_META,
  DUTCH_SITE_WORDS,
} from '../data/dutch-site-wordlist.ts';
import { DUTCH_OPEN_WORDS_TEXT } from '../../api-server/src/data/dutch-open-wordlist.ts';

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
  dictionaryStatus.wordCount === 3942 && DUTCH_SITE_DICTIONARY_META.sourcePages.length === 26,
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
  'AZE',
]) {
  assert(dictionaryWords.has(word), `The published dictionary is missing ${word}.`);
}
assert(
  validateDutchDictionaryWords(DUTCH_SITE_WORDS.slice(1))?.includes('count mismatch'),
  'An incomplete dictionary pack must fail explicitly.',
);
const corruptedDictionary: string[] = [...DUTCH_SITE_WORDS];
corruptedDictionary[0] = 'AB';
assert(
  validateDutchDictionaryWords(corruptedDictionary)?.includes('checksum mismatch'),
  'A same-count corrupted dictionary pack must fail explicitly.',
);

const openDutchWords = DUTCH_OPEN_WORDS_TEXT.split('\n');
assert(
  openDutchWords.length > 290_000,
  'The licensed OpenTaal pack must contain its full filtered base.',
);
for (const word of ['AMEN', 'AZE', 'ES', 'ZES']) {
  assert(openDutchWords.includes(word), `The downloadable dictionary is missing ${word}.`);
}
assert(
  !openDutchWords.includes('ON'),
  'The downloadable dictionary must exclude TaalTik-rejected ON.',
);

const onCrossBoard = createEmptyBoard();
onCrossBoard[5][7] = 'A';
onCrossBoard[6][7] = 'M';
onCrossBoard[7][7] = 'E';
onCrossBoard[8][6] = 'O';
const amenMoves = findBestMoves(onCrossBoard, 'N', openDutchWords, 100);
assert(
  !amenMoves.some((move) => move.word === 'AMEN' && move.crossWords.includes('ON')),
  'AMEN must not be suggested when its new N creates the invalid ON crossing.',
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

const performanceStartedAt = performance.now();
findBestMoves(createSampleBoard(), 'AARTE?', openDutchWords);
assert(
  performance.now() - performanceStartedAt < 5_000,
  'A full-pack solve must complete within the five-second regression budget.',
);

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
assert(scoredCrossing?.score === 6, 'The score must include both the main word and AT crossing.');

const zesReferenceRows = [
  '.......WONE....',
  '........S.SOK..',
  '........J...R..',
  '..VARENDE.B.U..',
  '..........I.ION',
  '.........FEUT..',
  '..........T....',
  '.......WEES.V..',
  '.......I....U..',
  '.......E....L..',
  '......BRAND.DOG',
  '.....CIS..A.E..',
  '........ZAGEN..',
  '..........E....',
  '......TONER....',
];
const zesReferenceBoard: Board = zesReferenceRows.map((row) =>
  [...row].map((cell) => (cell === '.' ? '' : cell)),
);
const zesMove = findBestMoves(zesReferenceBoard, 'JXVMCZS').find(
  (move) =>
    move.word === 'ZES' &&
    move.row === 11 &&
    move.col === 11 &&
    move.direction === 'V',
);
assert(zesMove, 'The screenshot position must include the legal ZES move.');
assert(
  zesMove.crossWords.join(',') === 'AZE,ES',
  'ZES must validate both AZE and ES as crossing words.',
);
assert(
  zesMove.score === 38,
  `ZES must score 38 with Dutch Wordfeud tile values, received ${zesMove.score}.`,
);

const openZesMoves = findBestMoves(zesReferenceBoard, 'JXVMCZS', openDutchWords, 20);
for (const rejectedWord of ['CM', 'CMS', 'CRM', 'CV', 'MXV', 'ON', 'VJ', 'VSV']) {
  assert(
    !openDutchWords.includes(rejectedWord),
    `The downloadable dictionary must exclude TaalTik-rejected ${rejectedWord}.`,
  );
  assert(
    !openZesMoves.some((move) => move.word === rejectedWord),
    `The ZES fixture must not suggest TaalTik-rejected ${rejectedWord}.`,
  );
}
assert(
  openZesMoves[0]?.score === 38,
  `The best downloadable-pack move in the ZES fixture must score 38, received ${openZesMoves[0]?.score}.`,
);
assert(
  openZesMoves.some(
    (move) =>
      move.word === 'ZES' &&
      move.score === 38 &&
      move.row === 11 &&
      move.col === 11 &&
      move.direction === 'V',
  ),
  'The downloadable pack must retain the reconstructed 38-point ZES move.',
);

function assertBoardCell(board: Board, row: number, col: number, expected: string) {
  assert(
    board[row]?.[col] === expected,
    `Expected board cell ${row}:${col} to contain ${expected || 'an empty value'}.`,
  );
}

const horizontalBoard = createEmptyBoard();
horizontalBoard[7][7] = 'A';
horizontalBoard[6][7] = 'N';
horizontalBoard[8][7] = 'S';
const horizontalMove = {
  word: 'ATEN',
  score: 0,
  direction: 'H' as const,
  row: 7,
  col: 7,
  crossWords: [],
  tilesUsed: 3,
};
const horizontalApplied = applyMove(horizontalBoard, 'TEN', horizontalMove);
assert(horizontalApplied.rack === '', 'Horizontal placement must consume all normal rack tiles.');
assert(horizontalApplied.placedLetters.join('') === 'TEN', 'Horizontal placement must report only newly placed letters.');
assertBoardCell(horizontalApplied.board, 7, 7, 'A');
assertBoardCell(horizontalApplied.board, 7, 8, 'T');
assertBoardCell(horizontalApplied.board, 7, 9, 'E');
assertBoardCell(horizontalApplied.board, 7, 10, 'N');
assertBoardCell(horizontalApplied.board, 6, 7, 'N');
assertBoardCell(horizontalApplied.board, 8, 7, 'S');
assertBoardCell(horizontalBoard, 7, 8, '');
assertBoardCell(horizontalBoard, 7, 9, '');
assertBoardCell(horizontalBoard, 7, 10, '');

const verticalBoard = createEmptyBoard();
verticalBoard[5][5] = 'B';
verticalBoard[5][4] = 'L';
verticalBoard[5][6] = 'R';
const verticalMove = {
  word: 'BOS',
  score: 0,
  direction: 'V' as const,
  row: 5,
  col: 5,
  crossWords: [],
  tilesUsed: 2,
};
const verticalApplied = applyMove(verticalBoard, 'O?', verticalMove);
assert(verticalApplied.rack === '', 'Vertical placement must consume normal and blank rack tiles.');
assert(verticalApplied.placedLetters.join('') === 'OS', 'Vertical placement must report newly placed letters.');
assertBoardCell(verticalApplied.board, 5, 5, 'B');
assertBoardCell(verticalApplied.board, 6, 5, 'O');
assertBoardCell(verticalApplied.board, 7, 5, 'S');
assertBoardCell(verticalApplied.board, 5, 4, 'L');
assertBoardCell(verticalApplied.board, 5, 6, 'R');
assertBoardCell(verticalBoard, 6, 5, '');
assertBoardCell(verticalBoard, 7, 5, '');

function assertSavedPositionMatchesVisibleResult(applied: ReturnType<typeof applyMove>) {
  const savedPosition = JSON.parse(
    JSON.stringify({ board: applied.board, rack: applied.rack }),
  ) as { board: Board; rack: string };
  assert(
    JSON.stringify(savedPosition) ===
      JSON.stringify({ board: applied.board, rack: applied.rack }),
    'The saved position must match the visible board and rack after applying a move.',
  );
}

assertSavedPositionMatchesVisibleResult(horizontalApplied);
assertSavedPositionMatchesVisibleResult(verticalApplied);

const alternatePosition = createEmptyBoard();
const alternateRack = 'AT';
const alternateResults = findBestMoves(
  alternatePosition,
  alternateRack,
  ['AT', 'TA'],
  20,
);
assert(
  alternateResults.length >= 2,
  'The fixed-position fixture must provide at least two alternatives.',
);

const resultSnapshot = JSON.stringify(alternateResults);
const bestPreview = applyMove(alternatePosition, alternateRack, alternateResults[0]);
assert(
  bestPreview.rack === '',
  'Starting a solve must preview the best move and consume its rack tiles.',
);
assert(
  bestPreview.placedLetters.length === alternateResults[0].tilesUsed,
  'The best preview must highlight every newly placed tile.',
);

const alternateMove = alternateResults.find((move) => {
  const sequentialPreview = applyMove(bestPreview.board, bestPreview.rack, move);
  const fixedPositionPreview = applyMove(alternatePosition, alternateRack, move);
  return (
    JSON.stringify(sequentialPreview.board) !== JSON.stringify(fixedPositionPreview.board) ||
    sequentialPreview.rack !== fixedPositionPreview.rack
  );
});
assert(
  alternateMove,
  'The fixed-position fixture must expose an alternative that differs from sequential play.',
);

const alternatePreview = applyMove(alternatePosition, alternateRack, alternateMove);
assert(
  alternatePreview.rack === '',
  'Selecting an alternative must rebuild it from the original rack.',
);
assert(
  JSON.stringify(alternateResults) === resultSnapshot,
  'Selecting an alternative must not change the result words, scores, order, or count.',
);
assert(
  JSON.stringify(alternatePreview.board) !== JSON.stringify(bestPreview.board),
  'Selecting a different alternative must replace the previous board preview.',
);

console.log('Solver regression checks passed.');
