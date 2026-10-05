import sharp from 'sharp';
import { createClassicLayout, type PremiumLabel, type PremiumLayout } from '../../../../lib/wordfeud-layout.ts';

function colorLabel(r: number, g: number, b: number): PremiumLabel | '' {
  if (Math.max(r, g, b) - Math.min(r, g, b) < 35) return '';
  if (r > g * 1.8 && r > b * 1.6) return '3W';
  if (r > g * 1.12 && g > b * 1.15) return '2W';
  if (b > r * 1.2 && g > r * 1.12) return '3L';
  if (g > r * 1.08 && g > b * 1.04) return '2L';
  return '';
}

/** Read the background colours away from printed premium labels and tile glyphs. */
export async function readPremiumLayout(numberedImage: Buffer, board: string[][]) {
  const { data, info } = await sharp(numberedImage).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const classic = createClassicLayout();
  const premiums: PremiumLayout = Array.from({ length: 15 }, () => Array(15).fill(''));
  let classicMatches = true;
  for (let row = 0; row < 15; row++) for (let col = 0; col < 15; col++) {
    // Covered bonuses are already consumed; never mistake highlighted tiles for bonuses.
    if (board[row][col]) continue;
    const votes = new Map<PremiumLabel | '', number>();
    for (const dx of [0.18, 0.82]) for (const dy of [0.18, 0.82]) {
      const x = Math.round(50 + (col + dx) * 60);
      const y = Math.round(50 + (row + dy) * 60);
      const offset = (y * info.width + x) * 3;
      const label = colorLabel(data[offset], data[offset + 1], data[offset + 2]);
      votes.set(label, (votes.get(label) ?? 0) + 1);
    }
    const winner = [...votes].sort((a, b) => b[1] - a[1])[0];
    const label = winner[1] >= 3 ? winner[0] : '';
    premiums[row][col] = label || (row === 7 && col === 7 ? '★' : '');
    if (premiums[row][col] !== classic[row][col]) classicMatches = false;
  }
  // Classic boards retain known covered bonuses. Random covered bonuses cannot
  // be inferred, but are never applied to existing tiles by the scorer.
  return { premiums: classicMatches ? classic : premiums,
    layoutMode: classicMatches ? 'classic' as const : 'random' as const };
}
