import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(here, "..");
const fixtureRoot = resolve(apiRoot, "../../attached_assets/scan-fixtures");
const metadata = JSON.parse(
  await readFile(resolve(fixtureRoot, "scan-fixtures.json"), "utf8"),
);

const emptyBoard = () =>
  Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => ""));

function expectedBoard(fixture) {
  const board = emptyBoard();
  for (const cell of fixture.expected.board) {
    board[cell.row][cell.col] = cell.letter;
  }
  return board;
}

function modelResponse(fixture, index) {
  const board = expectedBoard(fixture);
  if (index === 1) {
    board[2][3] = " s ";
    board[3][3] = "c";
  }
  if (index === 2) {
    board[0][0] = "not-a-tile";
  }
  return {
    board,
    rack: index === 1 ? ` ${fixture.expected.rack} / ignored` : fixture.expected.rack,
    confidence: fixture.expected.minConfidence + 0.05,
    warnings: [],
  };
}

const fixtureBodies = new Map();
const responses = new Map();
for (const [index, fixture] of metadata.fixtures.entries()) {
  const body = await readFile(resolve(fixtureRoot, fixture.file));
  const encoded = body.toString("base64");
  fixtureBodies.set(encoded, fixture);
  responses.set(encoded, modelResponse(fixture, index));
}

const mockVision = createServer(async (request, response) => {
  if (
    request.method !== "POST" ||
    !["/chat/completions", "/v1/chat/completions"].includes(request.url)
  ) {
    response.writeHead(404).end();
    return;
  }

  let raw = "";
  for await (const chunk of request) raw += chunk;
  const payload = JSON.parse(raw);
  const imageUrl = payload.messages?.[1]?.content?.find(
    (part) => part.type === "image_url",
  )?.image_url?.url;
  const encoded = imageUrl?.split(";base64,")[1];
  assert.ok(encoded && fixtureBodies.has(encoded), "unknown fixture sent to mock vision API");

  response.writeHead(200, { "content-type": "application/json" });
  response.end(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(responses.get(encoded)) } }],
    }),
  );
});

await new Promise((resolveServer) => mockVision.listen(0, "127.0.0.1", resolveServer));
const visionPort = mockVision.address().port;
const apiPort = await findFreePort();
const api = spawn("node", ["--enable-source-maps", "./dist/index.mjs"], {
  cwd: apiRoot,
  env: {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(apiPort),
    AI_INTEGRATIONS_OPENAI_API_KEY: "fixture-test-key",
    AI_INTEGRATIONS_OPENAI_BASE_URL: `http://127.0.0.1:${visionPort}/v1`,
    SCAN_RATE_LIMIT_PER_DEVICE: "20",
    SCAN_RATE_LIMIT_PER_IP: "20",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let apiOutput = "";
api.stdout.on("data", (chunk) => {
  apiOutput += chunk;
});
api.stderr.on("data", (chunk) => {
  apiOutput += chunk;
});

try {
  await waitForApi(apiPort);
  for (const fixture of metadata.fixtures) {
    const body = await readFile(resolve(fixtureRoot, fixture.file));
    const result = await fetch(`http://127.0.0.1:${apiPort}/api/scan-board`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crosslex-device-id": "00000000-0000-4000-8000-000000000002",
      },
      body: JSON.stringify({
        imageBase64: body.toString("base64"),
        mimeType: fixture.mimeType,
      }),
    });

    assert.equal(result.status, 200, `${fixture.id}: expected HTTP 200`);
    const scan = await result.json();
    assert.equal(scan.board.length, 15, `${fixture.id}: board row count`);
    assert.ok(
      scan.board.every((row) => Array.isArray(row) && row.length === 15),
      `${fixture.id}: board must be exactly 15x15`,
    );
    assert.match(scan.rack, /^[A-Z?]{0,7}$/, `${fixture.id}: rack format`);
    assert.ok(
      scan.rack.length <= 7,
      `${fixture.id}: rack must contain at most seven letters`,
    );
    assert.ok(
      scan.confidence >= fixture.expected.minConfidence,
      `${fixture.id}: confidence below fixture threshold`,
    );
    assert.deepEqual(
      occupiedCells(scan.board),
      [...fixture.expected.board].sort(compareCells),
      `${fixture.id}: recognized letters differ from expected fixture`,
    );
  }
  console.log(`scan fixtures passed (${metadata.fixtures.length} fixtures)`);
} finally {
  api.kill("SIGTERM");
  mockVision.close();
  if (api.exitCode === null) {
    await new Promise((resolveExit) => api.once("exit", resolveExit));
  }
  if (apiOutput && api.exitCode !== 0) {
    console.error(apiOutput);
  }
}

function occupiedCells(board) {
  const cells = [];
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      if (board[row][col] !== "") {
        cells.push({ row, col, letter: board[row][col] });
      }
    }
  }
  return cells;
}

function compareCells(left, right) {
  return left.row - right.row || left.col - right.col;
}

async function findFreePort() {
  const server = createServer();
  await new Promise((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
  const port = server.address().port;
  await new Promise((resolveServer) => server.close(resolveServer));
  return port;
}

async function waitForApi(port) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
      if (response.ok) return;
    } catch {
      // The child process may need a moment to bind its port.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`API server did not start.\n${apiOutput}`);
}