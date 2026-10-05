// Gameplay-confirmed rejections take precedence over imported word lists.
export const DUTCH_WORDFEUD_REJECTED_WORDS = ['ET', 'RI'] as const;
// Bump when corrections change so downloadable packs invalidate old caches.
export const DUTCH_WORDFEUD_RULES_REVISION = 1;

const rejectedWords = new Set<string>(DUTCH_WORDFEUD_REJECTED_WORDS);

export function isAllowedDutchWordfeudWord(word: string): boolean {
  return !rejectedWords.has(word.toUpperCase());
}
