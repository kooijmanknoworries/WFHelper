const BOARD_SIZE = 15;

/** Convert explicit, one-based vision coordinates without compressing empty cells. */
export function parseBoardTiles(value: unknown): string[][] {
  if (!Array.isArray(value) || value.length > BOARD_SIZE * BOARD_SIZE) {
    throw new Error("The scan did not return a valid tile-coordinate list.");
  }

  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array<string>(BOARD_SIZE).fill(""),
  );
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      throw new Error("The scan returned an invalid board tile.");
    }
    const { row, col, letter } = entry as Record<string, unknown>;
    if (
      typeof row !== "number" ||
      typeof col !== "number" ||
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 1 || row > BOARD_SIZE ||
      col < 1 || col > BOARD_SIZE ||
      typeof letter !== "string" ||
      !/^[A-Z]$/.test(letter.trim().toUpperCase())
    ) {
      throw new Error("The scan returned an invalid board coordinate or letter.");
    }
    if (board[row - 1][col - 1] !== "") {
      throw new Error("The scan returned duplicate board coordinates.");
    }
    board[row - 1][col - 1] = letter.trim().toUpperCase();
  }
  return board;
}