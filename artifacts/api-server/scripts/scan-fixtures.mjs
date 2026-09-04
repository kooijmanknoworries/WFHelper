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

validateManifest(metadata);

const configuredBaseUrl = process.env.SCAN_FIXTURE_BASE_URL?.replace(/\/$/, "");
const apiPort = configuredBaseUrl ? null : await findFreePort();
const baseUrl = configuredBaseUrl ?? `http://127.0.0.1:${apiPort}`;
const api = configuredBaseUrl
  ? null
  : spawn("node", ["--enable-source-maps", "./dist/index.mjs"], {
      cwd: apiRoot,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(apiPort),
        SCAN_RATE_LIMIT_PER_DEVICE: "100",
        SCAN_RATE_LIMIT_PER_IP: "100",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

let apiOutput = "";
api?.stdout.on("data", (chunk) => {
  apiOutput += chunk;
});
api?.stderr.on("data", (chunk) => {
  apiOutput += chunk;
});

let reviewedFailures = 0;
const { initialSamples, tieBreakerSamples } = metadata.evaluation;

try {
  if (apiPort) await waitForApi(apiPort);

  for (const [fixtureIndex, fixture] of metadata.fixtures.entries()) {
    const image = await readFile(resolve(fixtureRoot, fixture.file));
    const scans = [];
    let requestFailed = false;

    for (let sample = 0; sample < initialSamples; sample += 1) {
      try {
        const scan = await requestScan(fixture, fixtureIndex, image);
        scans.push(scan);
        logSample(fixture, scan, sample + 1, initialSamples);
      } catch (error) {
        console.error(
          `${fixture.id} sample ${sample + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
        requestFailed = true;
        break;
      }
    }

    if (requestFailed || scans.length !== initialSamples) {
      if (fixture.reviewed) reviewedFailures += 1;
      continue;
    }

    let requiredVotes = strictMajority(scans.length);
    let consensus = consensusScan(scans, requiredVotes);
    let mismatches = compareFixture(fixture, consensus);

    if (
      mismatches.length > 0 &&
      scans.some((scan) => compareFixture(fixture, scan).length === 0)
    ) {
      console.log(
        `  initial consensus differed; collecting ${tieBreakerSamples} tie-breaker samples`,
      );
      for (let tieBreaker = 0; tieBreaker < tieBreakerSamples; tieBreaker += 1) {
        try {
          const scan = await requestScan(fixture, fixtureIndex, image);
          scans.push(scan);
          logSample(
            fixture,
            scan,
            scans.length,
            initialSamples + tieBreakerSamples,
          );
        } catch (error) {
          console.error(
            `${fixture.id} tie-breaker ${tieBreaker + 1}: ${error instanceof Error ? error.message : String(error)}`,
          );
          requestFailed = true;
          break;
        }
      }
      if (requestFailed) {
        if (fixture.reviewed) reviewedFailures += 1;
        continue;
      }
      requiredVotes = strictMajority(scans.length);
      consensus = consensusScan(scans, requiredVotes);
      mismatches = compareFixture(fixture, consensus);
    }

    const label = fixture.reviewed ? "reviewed" : "candidate";

    if (mismatches.length === 0) {
      console.log(
        `PASS ${fixture.id} (${label}, ${requiredVotes}-of-${scans.length} consensus, confidence ${formatConfidence(consensus.confidence)})`,
      );
      continue;
    }

    console.error(
      `FAIL ${fixture.id} (${label}, ${requiredVotes}-of-${scans.length} consensus, ${mismatches.length} mismatch${mismatches.length === 1 ? "" : "es"})`,
    );
    for (const mismatch of mismatches) console.error(`  - ${mismatch}`);
    if (fixture.reviewed) reviewedFailures += 1;
  }

  if (reviewedFailures > 0) {
    console.error(
      `Scan fixture evaluation failed: ${reviewedFailures} reviewed fixture${reviewedFailures === 1 ? "" : "s"} regressed.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Scan fixture evaluation passed (${metadata.fixtures.length} fixtures).`,
    );
  }
} finally {
  if (api) {
    api.kill("SIGTERM");
    if (api.exitCode === null) {
      await new Promise((resolveExit) => api.once("exit", resolveExit));
    }
    if (apiOutput && api.exitCode !== 0 && process.exitCode !== 1) {
      console.error(apiOutput);
    }
  }
}

function compareFixture(fixture, scan) {
  const mismatches = [];
  const actualBoard = Array.isArray(scan.board) ? scan.board : [];

  for (let row = 0; row < 15; row += 1) {
    for (let col = 0; col < 15; col += 1) {
      const expected = decodeCell(fixture.expected.board[row][col]);
      const actual =
        Array.isArray(actualBoard[row]) && typeof actualBoard[row][col] === "string"
          ? actualBoard[row][col]
          : "";
      if (actual !== expected) {
        mismatches.push(
          `board R${row + 1}C${col + 1}: expected ${showLetter(expected)}, received ${showLetter(actual)}${itLabel(expected, actual)}`,
        );
      }
    }
  }

  const actualRack = typeof scan.rack === "string" ? scan.rack : "";
  for (let position = 0; position < 7; position += 1) {
    const expected = fixture.expected.rack[position] ?? "";
    const actual = actualRack[position] ?? "";
    if (actual !== expected) {
      mismatches.push(
        `rack ${position + 1}: expected ${showLetter(expected)}, received ${showLetter(actual)}${itLabel(expected, actual)}`,
      );
    }
  }

  if (
    typeof scan.confidence !== "number" ||
    scan.confidence < fixture.expected.minConfidence
  ) {
    mismatches.push(
      `confidence: expected >= ${fixture.expected.minConfidence}, received ${formatConfidence(scan.confidence)}`,
    );
  }

  return mismatches;
}

async function requestScan(fixture, fixtureIndex, image) {
  const response = await fetch(`${baseUrl}/api/scan-board`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-crosslex-device-id": fixtureDeviceId(fixtureIndex),
    },
    body: JSON.stringify({
      imageBase64: image.toString("base64"),
      mimeType: fixture.mimeType,
    }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function logSample(fixture, scan, sample, total) {
  const mismatches = compareFixture(fixture, scan);
  console.log(
    `  sample ${sample}/${total}: ${mismatches.length === 0 ? "exact match" : `${mismatches.length} raw mismatch${mismatches.length === 1 ? "" : "es"}`}`,
  );
}

function strictMajority(sampleCount) {
  return Math.floor(sampleCount / 2) + 1;
}

function consensusScan(scans, requiredVotes) {
  const board = Array.from({ length: 15 }, (_, row) =>
    Array.from({ length: 15 }, (_, col) =>
      majorityValue(
        scans.map((scan) =>
          Array.isArray(scan.board?.[row]) && typeof scan.board[row][col] === "string"
            ? scan.board[row][col]
            : "",
        ),
        requiredVotes,
      ),
    ),
  );
  const rack = Array.from({ length: 7 }, (_, position) =>
    majorityValue(
      scans.map((scan) =>
        typeof scan.rack === "string" ? (scan.rack[position] ?? "") : "",
      ),
      requiredVotes,
    ),
  ).join("");
  const confidences = scans
    .map((scan) => scan.confidence)
    .filter((value) => typeof value === "number" && Number.isFinite(value))
    .sort((left, right) => left - right);

  return {
    board,
    rack,
    confidence: confidences[Math.floor(confidences.length / 2)] ?? 0,
  };
}

function majorityValue(values, requiredVotes) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const winner = [...counts.entries()].sort(
    ([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || leftValue.localeCompare(rightValue),
  )[0];
  return winner && winner[1] >= requiredVotes ? winner[0] : "!";
}

function validateManifest(manifest) {
  if (!Array.isArray(manifest.fixtures) || manifest.fixtures.length === 0) {
    throw new Error("scan fixture manifest must contain fixtures");
  }
  if (
    !Number.isInteger(manifest.evaluation?.initialSamples) ||
    manifest.evaluation.initialSamples < 3 ||
    manifest.evaluation.initialSamples % 2 === 0 ||
    !Number.isInteger(manifest.evaluation?.tieBreakerSamples) ||
    manifest.evaluation.tieBreakerSamples < 0 ||
    manifest.evaluation.tieBreakerSamples % 2 !== 0
  ) {
    throw new Error(
      "scan evaluation must use odd initial samples and even tie-breaker samples",
    );
  }

  const ids = new Set();
  for (const fixture of manifest.fixtures) {
    if (typeof fixture.id !== "string" || ids.has(fixture.id)) {
      throw new Error(`fixture id must be a unique string: ${fixture.id}`);
    }
    ids.add(fixture.id);
    if (fixture.source !== "anonymized-original") {
      throw new Error(`${fixture.id}: fixture must be an anonymized original`);
    }
    if (
      !Array.isArray(fixture.expected?.board) ||
      fixture.expected.board.length !== 15 ||
      fixture.expected.board.some(
        (row) => typeof row !== "string" || row.length !== 15 || /[^A-Z.]/.test(row),
      )
    ) {
      throw new Error(`${fixture.id}: expected board must be 15 rows of 15 A-Z/. cells`);
    }
    if (!/^[A-Z?]{7}$/.test(fixture.expected?.rack ?? "")) {
      throw new Error(`${fixture.id}: expected rack must contain exactly seven tiles`);
    }
  }
}

function decodeCell(cell) {
  return cell === "." ? "" : cell;
}

function showLetter(letter) {
  return letter === "" ? "empty" : JSON.stringify(letter);
}

function itLabel(expected, actual) {
  return (expected === "I" && actual === "T") || (expected === "T" && actual === "I")
    ? " [I/T]"
    : "";
}

function formatConfidence(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(2)
    : "invalid";
}

function fixtureDeviceId(index) {
  return `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}

async function findFreePort() {
  const server = createServer();
  await new Promise((resolveServer) =>
    server.listen(0, "127.0.0.1", resolveServer),
  );
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