import sharp from "sharp";

type Bounds = { left: number; top: number; size: number };
export class ScanGridError extends Error {}
const SAMPLE_WIDTH = 480;
// Classic Wordfeud premium colours locate the square without interpreting letters.
const PREMIUM_GROUPS = [
  ["0:4", "0:10", "4:0", "4:14", "10:0", "10:14", "14:4", "14:10",
    "2:2", "2:12", "4:4", "4:10", "7:3", "7:11", "10:4", "10:10", "12:2", "12:12"],
  ["0:0", "0:14", "1:5", "1:9", "3:3", "3:11", "5:1", "5:5", "5:9", "5:13",
    "9:1", "9:5", "9:9", "9:13", "11:3", "11:11", "13:5", "13:9", "14:0", "14:14"],
  ["0:7", "1:1", "1:13", "2:6", "2:8", "4:6", "4:8", "6:2", "6:4", "6:10", "6:12",
    "7:0", "7:14", "8:2", "8:4", "8:10", "8:12", "10:6", "10:8", "12:6", "12:8",
    "13:1", "13:13", "14:7"],
];
const MARKERS = PREMIUM_GROUPS.flatMap((group, color) =>
  group.map(position => {
    const [row, col] = position.split(":").map(Number);
    return { row, col, color: color + 1 };
  }),
);

function locateGrid(data: Buffer, width: number, height: number): Bounds {
  const rgb = (x: number, y: number) => {
    const offset = (Math.max(0, Math.min(height - 1, Math.round(y))) * width +
      Math.max(0, Math.min(width - 1, Math.round(x)))) * 3;
    return [data[offset], data[offset + 1], data[offset + 2]];
  };
  const colorAt = (x: number, y: number) => {
    const [r, g, b] = rgb(x, y);
    if (Math.max(r, g, b) - Math.min(r, g, b) < 40) return 0;
    if (r > g * 1.12 && g > b * 1.15) return 1;
    if (b > r * 1.2 && g > r * 1.12) return 2;
    if (g > r * 1.08 && g > b * 1.04) return 3;
    return 0;
  };
  let best: Bounds = { left: 0, top: 0, size: width };
  let bestScore = -Infinity;
  const markerScore = (left: number, top: number, size: number) => {
    let score = 0;
    const step = size / 15;
    for (const marker of MARKERS) {
      // Bottom-right interior avoids the centred premium-label text.
      const color = colorAt(left + (marker.col + 0.8) * step,
        top + (marker.row + 0.8) * step);
      if (color === marker.color) score += 1;
      else if (color !== 0) score -= 1.5;
    }
    return score;
  };
  for (const fraction of [1, 0.99, 0.975, 0.95, 0.925, 0.9, 0.85]) {
    const size = Math.round(width * fraction);
    for (const delta of [-2, 0, 2]) {
      const left = Math.round((width - size) / 2) + delta;
      if (left < 0 || left + size > width) continue;
      for (let top = 0; top + size <= height; top += 2) {
        const score = markerScore(left, top, size);
        if (score > bestScore) {
          bestScore = score;
          best = { left, top, size };
        }
      }
    }
  }
  if (bestScore < 18) {
    throw new ScanGridError("The 15×15 grid could not be located reliably. Crop the image to the square game board and enter your rack separately.");
  }

  // Premium colours identify the region; uniform grid separators refine its edges.
  const corners: number[][] = [[], [], []];
  for (let row = 0; row < 15; row++) for (let col = 0; col < 15; col++) {
    rgb(best.left + col * best.size / 15, best.top + row * best.size / 15)
      .forEach((value, channel) => corners[channel].push(value));
  }
  const border = corners.map(values => values.sort((a, b) => a - b)[112]);
  const distance = (x: number, y: number) =>
    rgb(x, y).reduce((sum, value, channel) => sum + Math.abs(value - border[channel]), 0);
  let refined = best;
  let minCost = Infinity;
  for (let size = best.size - 3; size <= Math.min(width, best.size + 3); size++) {
    const step = size / 15;
    for (let left = Math.max(0, best.left - 2); left <= Math.min(width - size, best.left + 2); left++) {
      for (let top = Math.max(0, best.top - Math.ceil(step));
        top <= Math.min(height - size, best.top + Math.ceil(step)); top++) {
        if (markerScore(left, top, size) < bestScore - 4) continue;
        let cost = 0;
        for (let row = 0; row < 15; row++) for (let col = 0; col < 15; col++) {
          cost += distance(left + (col + 0.5) * step, top + row * step);
          cost += distance(left + col * step, top + (row + 0.5) * step);
        }
        if (cost < minCost) { minCost = cost; refined = { left, top, size }; }
      }
    }
  }
  return refined;
}

export async function prepareNumberedBoard(image: Buffer) {
  const oriented = sharp(image, { limitInputPixels: 20_000_000 }).rotate();
  const original = await oriented.png().toBuffer({ resolveWithObject: true });
  const sample = await sharp(original.data).resize({ width: SAMPLE_WIDTH })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // An explicitly cropped square needs no premium-based detection.
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