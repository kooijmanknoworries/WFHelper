import { sha256Ascii } from '../../../crosslex/lib/sha256.ts';
import {
  DUTCH_OPEN_DICTIONARY_META as sourceMetadata,
  DUTCH_OPEN_WORDS_TEXT as sourceWordsText,
} from '../data/dutch-open-wordlist.ts';
import {
  DUTCH_WORDFEUD_RULES_REVISION,
  isAllowedDutchWordfeudWord,
} from '../../../../lib/wordfeud-dutch-rules.ts';

// Preserve the licensed snapshot while correcting the served pack. Keep its
// count, checksum and version aligned so existing devices download the change.
const words = sourceWordsText.split('\n').filter(isAllowedDutchWordfeudWord);
const versionParts = sourceMetadata.version.split('.');
versionParts[versionParts.length - 1] = String(
  Number(versionParts.at(-1)) + DUTCH_WORDFEUD_RULES_REVISION,
);
export const DUTCH_OPEN_WORDS_TEXT = words.join('\n');
export const DUTCH_OPEN_DICTIONARY_META = {
  ...sourceMetadata,
  version: versionParts.join('.'),
  wordCount: words.length,
  dictionarySha256: sha256Ascii(DUTCH_OPEN_WORDS_TEXT),
};
