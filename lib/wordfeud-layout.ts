export type PremiumLabel = '2L' | '3L' | '2W' | '3W' | '★';
export type PremiumLayout = (PremiumLabel | '')[][];

const coordinates: Record<Exclude<PremiumLabel, '★'>, string[]> = {
  '3W': ['0:4', '0:10', '4:0', '4:14', '10:0', '10:14', '14:4', '14:10'],
  '2W': ['2:2', '2:12', '3:7', '4:4', '4:10', '7:3', '7:11', '10:4', '10:10', '11:7', '12:2', '12:12'],
  '3L': ['0:0', '0:14', '1:5', '1:9', '3:3', '3:11', '5:1', '5:5', '5:9', '5:13',
    '9:1', '9:5', '9:9', '9:13', '11:3', '11:11', '13:5', '13:9', '14:0', '14:14'],
  '2L': ['0:7', '1:1', '1:13', '2:6', '2:8', '4:6', '4:8', '6:2', '6:4', '6:10', '6:12',
    '7:0', '7:14', '8:2', '8:4', '8:10', '8:12', '10:6', '10:8', '12:6', '12:8', '13:1', '13:13', '14:7'],
};

export function createClassicLayout(): PremiumLayout {
  const layout: PremiumLayout = Array.from({ length: 15 }, () => Array(15).fill(''));
  layout[7][7] = '★';
  for (const [label, cells] of Object.entries(coordinates)) {
    for (const cell of cells) {
      const [row, col] = cell.split(':').map(Number);
      layout[row][col] = label as PremiumLabel;
    }
  }
  return layout;
}

export function isPremiumLayout(value: unknown): value is PremiumLayout {
  return Array.isArray(value) && value.length === 15 &&
    value.every(row => Array.isArray(row) && row.length === 15 &&
      row.every(cell => ['', '2L', '3L', '2W', '3W', '★'].includes(cell)));
}

export function getLayoutMode(layout: PremiumLayout): 'classic' | 'random' {
  const classic = createClassicLayout();
  return layout.every((row, r) => row.every((cell, c) => cell === classic[r][c]))
    ? 'classic' : 'random';
}
