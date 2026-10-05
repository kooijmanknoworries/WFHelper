import sharp from "sharp";

type Bounds = { left: number; top: number; size: number };
export class ScanGridError extends Error {}
const SAMPLE_WIDTH = 480;
// Locate the square by its repeated horizontal cell boundaries, not by bonus
// colours. Wordfeud boards can have randomized premium-square layouts.
function locateGrid(data: Buffer, width: number, height: number): Bounds {
  let best: Bounds = { left: 0, top: 0, size: width };
  let bestScore = -Infinity;
  for (const fraction of [1, 0.99, 0.975, 0.95, 0.925, 0.9, 0.85]) {
    const size = Math.round(width * fraction);
    for (const delta of [-2, 0, 2]) {
      const left = Math.round((width - size) / 2) + delta;
      if (left < 0 || left + size > width) continue;
      const step = size / 15;
      const sampleXs = Array.from({ length: 15 }, (_, col) =>
        [0.2, 0.5, 0.8].map(fraction =>
          Math.round(left + (col + fraction) * step),
        ),
      ).flat();
      const edgeScores = new Float32Array(height);
      for (let y = 1; y < height - 1; y++) {
        let contrast = 0;
        for (const x of sampleXs) {
          const above = (y - 1) * width + x;
          const below = (y + 1) * width + x;
          contrast += Math.abs(data[above * 3] - data[below * 3]);
          contrast += Math.abs(data[above * 3 + 1] - data[below * 3 + 1]);
          contrast += Math.abs(data[above * 3 + 2] - data[below * 3 + 2]);
        }
        edgeScores[y] = contrast / (sampleXs.length * 3);
      }
      for (let top = 1; top + size < height - 1; top++) {
        let score = 0;
        let visibleRows = 0;
        for (let line = 0; line <= 15; line++) {
          const y = Math.round(top + line * step);
          const contrast = Math.max(edgeScores[y - 1], edgeScores[y], edgeScores[y + 1]);
          score += contrast;
          if (contrast >= 2) visibleRows++;
        }
        score /= 16;
        if (score > bestScore && visibleRows >= 12 &&
          hasColumnBoundaries(data, width, left, top, step)) {
          bestScore = score;
          best = { left, top, size };
        }
      }
    }
  }
  if (bestScore < 2) {
    throw new ScanGridError("The 15×15 board grid could not be found reliably. Please upload a full screenshot showing the game board.");
  }
  return best;
}

function hasColumnBoundaries(
  data: Buffer, width: number, left: number, top: number, step: number,
): boolean {
  let visibleColumns = 0;
  for (let line = 1; line < 15; line++) {
    let bestContrast = 0;
    for (const delta of [-1, 0, 1]) {
      const x = Math.round(left + line * step) + delta;
      let contrast = 0;
      for (let row = 0; row < 15; row++) {
        for (const fraction of [0.2, 0.5, 0.8]) {
          const y = Math.round(top + (row + fraction) * step);
          const before = (y * width + x - 1) * 3;
          const after = (y * width + x + 1) * 3;
          for (let channel = 0; channel < 3; channel++) {
            contrast += Math.abs(data[before + channel] - data[after + channel]);
          }
        }
      }
      bestContrast = Math.max(bestContrast, contrast / (45 * 3));
    }
    if (bestContrast >= 2) visibleColumns++;
  }
  return visibleColumns >= 12;
}

export async function prepareNumberedBoard(image: Buffer) {
  const oriented = sharp(image, { limitInputPixels: 20_000_000 }).rotate();
  const original = await oriented.png().toBuffer({ resolveWithObject: true });
  const sample = await sharp(original.data).resize({ width: SAMPLE_WIDTH })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // An explicitly cropped square needs no screenshot-region detection.
  const bounds = Math.abs(original.info.width - original.info.height) <= original.info.width * 0.02
    ? { left: 0, top: 0, size: Math.min(sample.info.width, sample.info.height) }
    : locateGrid(sample.data, sample.info.width, sample.info.height);
  const scale = original.info.width / sample.info.width;
  const left = Math.round(bounds.left * scale);
  const top = Math.round(bounds.top * scale);
  const size = Math.min(Math.round(bounds.size * scale),
    original.info.width - left, original.info.height - top);
  const cropped = await sharp(original.data).extract({ left, top, width: size, height: size })
    .resize(900, 900).png().toBuffer();
  const labels = Array.from({ length: 15 }, (_, i) => {
    const center = 80 + i * 60;
    return `<text x="${center}" y="33">${i + 1}</text><text x="26" y="${center + 8}">${i + 1}</text>`;
  }).join("");
  const legend = Buffer.from(`<svg width="1000" height="1000"><g font-family="sans-serif" font-size="23" fill="white" text-anchor="middle">${labels}</g></svg>`);
  const numbered = await sharp({ create: { width: 1000, height: 1000, channels: 3, background: "#111a2e" } })
    .composite([{ input: cropped, left: 50, top: 50 }, { input: legend, left: 0, top: 0 }])
    .png().toBuffer();
  return { image: numbered, bounds: { left, top, size } };
}