import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBoardTiles } from "../src/lib/scan-board-layout.ts";
import { prepareNumberedBoard, ScanGridError } from "../src/lib/scan-board-image.ts";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

test("GE and right-edge LIJ preserve their separate columns and empty gaps", () => {
  const tiles = [
    { row: 10, col: 12, letter: "G" },
    { row: 10, col: 13, letter: "E" },
    { row: 11, col: 13, letter: "L" },
    { row: 11, col: 14, letter: "I" },
    { row: 11, col: 15, letter: "J" },
    { row: 12, col: 13, letter: "K" },
    { row: 13, col: 13, letter: "E" },
  ];
  for (const entries of [tiles, [...tiles].reverse()]) {
    const board = parseBoardTiles(entries);
    assert.equal(board.length, 15);
    assert.ok(board.every(row => row.length === 15));
    assert.equal(board[9][11], "G");
    assert.equal(board[9][12], "E");
    assert.equal(board[10][11], "", "the cell under G remains empty");
    assert.equal(board[10].slice(12).join(""), "LIJ");
    assert.equal(board[11][12], "K");
    assert.equal(board[12][12], "E");
  }
});

test("empty board coordinates produce a full empty matrix", () => {
  assert.ok(parseBoardTiles([]).every(row => row.every(cell => cell === "")));
});

test("malformed, duplicate, and out-of-range coordinates fail explicitly", () => {
  for (const input of [
    undefined,
    {},
    [["A"]],
    [null],
    [{ row: 0, col: 1, letter: "A" }],
    [{ row: 16, col: 1, letter: "A" }],
    [{ row: 1, col: 16, letter: "A" }],
    [{ row: 1.5, col: 1, letter: "A" }],
    [{ row: "1", col: 1, letter: "A" }],
    [{ row: 1, col: 1, letter: "LIJ" }],
    [{ row: 1, col: 1, letter: "" }],
    [{ row: 1, col: 1, letter: "A" }, { row: 1, col: 1, letter: "B" }],
  ]) assert.throws(() => parseBoardTiles(input));
});

test("grid numbering uses all 15 rows, including screenshots cropped near the top", async () => {
  const cases = [
    ["android-dark-board-rack.png", 0, 246, 472],
    ["android-light-board-rack.jpg", 0, 632, 1080],
    ["android-wordfeud-i-rack.jpg", 0, 43, 1080],
    ["android-right-edge-lij-layout.jpg", 0, 632, 1080],
  ];
  for (const [file, left, top, size] of cases) {
    const image = await readFile(new URL(`../../../attached_assets/scan-fixtures/${file}`, import.meta.url));
    const result = await prepareNumberedBoard(image);
    for (const [key, expected] of Object.entries({ left, top, size })) {
      assert.ok(Math.abs(result.bounds[key] - expected) <= 4,
        `${file}: ${key} must follow the original grid, not shift a row`);
    }
    const metadata = await sharp(result.image).metadata();
    assert.equal(metadata.width, 1000);
    assert.equal(metadata.height, 1000);
  }
});

test("unknown portrait geometry fails instead of guessing a board crop", async () => {
  const image = await sharp({ create: {
    width: 400, height: 800, channels: 3, background: "#333333",
  } }).png().toBuffer();
  await assert.rejects(() => prepareNumberedBoard(image), ScanGridError);
});