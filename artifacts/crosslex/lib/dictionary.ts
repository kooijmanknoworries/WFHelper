import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DUTCH_SITE_DICTIONARY_META,
  DUTCH_SITE_WORDS,
} from '../data/dutch-site-wordlist.ts';
import { sha256Ascii } from './sha256.ts';

const DICTIONARY_CACHE_KEY = '@crosslex/dutch-dictionary-cache';
const BUNDLED_DICTIONARY_VERSION = DUTCH_SITE_DICTIONARY_META.version;
const UPDATE_TIMEOUT_MS = 12_000;

export type DutchDictionaryManifest = {
  version: string;
  source: string;
  sourceUrl?: string;
  wordCount: number;
  minLength: number;
  maxLength: number;
  dictionarySha256: string;
  packUrl: string;
};

export type DutchDictionaryPack = {
  manifest: DutchDictionaryManifest;
  words: string[];
};

export type DutchDictionaryUpdateState =
  | 'bundled'
  | 'cached'
  | 'checking'
  | 'downloading'
  | 'up-to-date'
  | 'updated'
  | 'fallback'
  | 'not-configured';

export type DutchDictionaryStatus = {
  ready: boolean;
  wordCount: number;
  version: string;
  source: string;
  sourceUrl?: string;
  updateState: DutchDictionaryUpdateState;
  lastCheckedAt: string | null;
  error?: string;
};

export const DUTCH_WORDS = [...DUTCH_SITE_WORDS];

export const BUNDLED_DUTCH_DICTIONARY_MANIFEST: DutchDictionaryManifest = {
  version: BUNDLED_DICTIONARY_VERSION,
  source: DUTCH_SITE_DICTIONARY_META.sourceName,
  sourceUrl: DUTCH_SITE_DICTIONARY_META.sourceBaseUrl,
  wordCount: DUTCH_SITE_DICTIONARY_META.wordCount,
  minLength: DUTCH_SITE_DICTIONARY_META.minLength,
  maxLength: DUTCH_SITE_DICTIONARY_META.maxLength,
  dictionarySha256: DUTCH_SITE_DICTIONARY_META.dictionarySha256,
  packUrl: '',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHttpsUrl(value: string) {
  return value.startsWith('https://');
}

function validateManifest(value: unknown, requirePackUrl: boolean): string | null {
  if (!isRecord(value)) return 'Dictionary manifest must be an object.';
  if (
    typeof value.version !== 'string' ||
    !/^[0-9]+(?:\.[0-9]+){1,3}$/.test(value.version)
  ) {
    return 'Dictionary manifest has an invalid version.';
  }
  if (typeof value.source !== 'string' || value.source.trim().length === 0) {
    return 'Dictionary manifest is missing its source.';
  }
  if (
    value.sourceUrl !== undefined &&
    (typeof value.sourceUrl !== 'string' || !isHttpsUrl(value.sourceUrl))
  ) {
    return 'Dictionary manifest has an invalid source URL.';
  }
  if (
    typeof value.wordCount !== 'number' ||
    !Number.isInteger(value.wordCount) ||
    value.wordCount < 1
  ) {
    return 'Dictionary manifest has an invalid word count.';
  }
  if (
    typeof value.minLength !== 'number' ||
    !Number.isInteger(value.minLength) ||
    typeof value.maxLength !== 'number' ||
    !Number.isInteger(value.maxLength) ||
    value.minLength < 2 ||
    value.maxLength > 15 ||
    value.minLength > value.maxLength
  ) {
    return 'Dictionary manifest has invalid word length limits.';
  }
  if (
    typeof value.dictionarySha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.dictionarySha256)
  ) {
    return 'Dictionary manifest has an invalid checksum.';
  }
  if (
    requirePackUrl &&
    (typeof value.packUrl !== 'string' || value.packUrl.trim().length === 0)
  ) {
    return 'Dictionary manifest is missing its pack URL.';
  }
  if (value.packUrl !== undefined && typeof value.packUrl !== 'string') {
    return 'Dictionary manifest has an invalid pack URL.';
  }
  return null;
}

function asManifest(value: unknown, requirePackUrl: boolean): DutchDictionaryManifest {
  const error = validateManifest(value, requirePackUrl);
  if (error) throw new Error(error);
  return value as DutchDictionaryManifest;
}

function validateWordsAgainstManifest(
  words: readonly string[],
  manifest: DutchDictionaryManifest,
) {
  if (words.length !== manifest.wordCount) {
    return `Dictionary count mismatch: expected ${manifest.wordCount}, received ${words.length}.`;
  }
  const seen = new Set<string>();
  for (const word of words) {
    if (
      typeof word !== 'string' ||
      !new RegExp(`^[A-Z]{${manifest.minLength},${manifest.maxLength}}$`).test(word)
    ) {
      return `Dictionary contains an invalid entry: ${word}.`;
    }
    if (seen.has(word)) return `Dictionary contains a duplicate entry: ${word}.`;
    seen.add(word);
  }
  const checksum = sha256Ascii(words.join('\n'));
  if (checksum !== manifest.dictionarySha256) {
    return `Dictionary checksum mismatch: expected ${manifest.dictionarySha256}, received ${checksum}.`;
  }
  return null;
}

export function validateDutchDictionaryWords(words: readonly string[]) {
  const sourceWordCount = DUTCH_SITE_DICTIONARY_META.sourcePages.reduce(
    (total, page) => total + page.wordCount,
    0,
  );
  if (DUTCH_SITE_DICTIONARY_META.sourcePages.length !== 26) {
    return 'Dictionary source metadata does not contain all 26 A-Z pages.';
  }
  if (sourceWordCount !== words.length) {
    return `Dictionary source count mismatch: pages contain ${sourceWordCount}, pack contains ${words.length}.`;
  }
  return validateWordsAgainstManifest(words, BUNDLED_DUTCH_DICTIONARY_MANIFEST);
}

const DUTCH_DICTIONARY_ERROR = validateDutchDictionaryWords(DUTCH_WORDS);

let activeWords: string[] = DUTCH_WORDS;
let activeManifest = BUNDLED_DUTCH_DICTIONARY_MANIFEST;
let status: DutchDictionaryStatus = {
  ready: !DUTCH_DICTIONARY_ERROR,
  wordCount: DUTCH_WORDS.length,
  version: BUNDLED_DICTIONARY_VERSION,
  source: BUNDLED_DUTCH_DICTIONARY_MANIFEST.source,
  sourceUrl: BUNDLED_DUTCH_DICTIONARY_MANIFEST.sourceUrl,
  updateState: 'bundled',
  lastCheckedAt: null,
  error: DUTCH_DICTIONARY_ERROR ?? undefined,
};
const listeners = new Set<(nextStatus: DutchDictionaryStatus) => void>();
let initializationPromise: Promise<void> | null = null;
let updatePromise: Promise<DutchDictionaryStatus> | null = null;

function publish(next: DutchDictionaryStatus) {
  status = next;
  for (const listener of listeners) listener(status);
}

function statusForManifest(
  manifest: DutchDictionaryManifest,
  updateState: DutchDictionaryUpdateState,
  lastCheckedAt = status.lastCheckedAt,
  error?: string,
): DutchDictionaryStatus {
  return {
    ready: true,
    wordCount: manifest.wordCount,
    version: manifest.version,
    source: manifest.source,
    sourceUrl: manifest.sourceUrl,
    updateState,
    lastCheckedAt,
    error,
  };
}

function compareVersions(left: string, right: string) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function getManifestUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_DICTIONARY_MANIFEST_URL;
  if (configuredUrl) return configuredUrl;
  const apiDomain = process.env.EXPO_PUBLIC_DOMAIN;
  return apiDomain ? `https://${apiDomain}/api/dictionary/manifest` : null;
}

function resolvePackUrl(manifestUrl: string, packUrl: string) {
  const manifestOrigin = new URL(manifestUrl).origin;
  const resolved = new URL(packUrl, manifestUrl);
  if (resolved.protocol !== 'https:') throw new Error('Dictionary pack URL must use HTTPS.');
  if (resolved.origin !== manifestOrigin) {
    throw new Error('Dictionary pack must use the trusted manifest origin.');
  }
  return resolved.toString();
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error(`Dictionary update request failed (${response.status}).`);
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

function activatePack(pack: DutchDictionaryPack) {
  activeWords = pack.words;
  activeManifest = pack.manifest;
}

async function readCachedPack() {
  const stored = await AsyncStorage.getItem(DICTIONARY_CACHE_KEY);
  if (!stored) return null;
  const value: unknown = JSON.parse(stored);
  if (!isRecord(value) || !Array.isArray(value.words)) {
    throw new Error('Cached dictionary pack has an invalid shape.');
  }
  const manifest = asManifest(value.manifest, false);
  const error = validateWordsAgainstManifest(value.words, manifest);
  if (error) throw new Error(error);
  return { manifest, words: value.words as string[] };
}

export async function initializeDutchDictionary() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        const cachedPack = await readCachedPack();
        if (
          cachedPack &&
          compareVersions(cachedPack.manifest.version, BUNDLED_DICTIONARY_VERSION) > 0
        ) {
          activatePack(cachedPack);
          publish(statusForManifest(cachedPack.manifest, 'cached'));
        } else if (cachedPack) {
          await AsyncStorage.removeItem(DICTIONARY_CACHE_KEY);
        }
      } catch (error) {
        await AsyncStorage.removeItem(DICTIONARY_CACHE_KEY).catch(() => undefined);
        publish({
          ...status,
          updateState: 'fallback',
          error: error instanceof Error ? error.message : 'Cached dictionary was ignored.',
        });
      }
    })();
  }
  return initializationPromise;
}

export async function checkDutchDictionaryForUpdates() {
  if (updatePromise) return updatePromise;
  updatePromise = (async () => {
    await initializeDutchDictionary();
    const manifestUrl = getManifestUrl();
    const checkedAt = new Date().toISOString();
    if (!manifestUrl) {
      publish({ ...status, updateState: 'not-configured', lastCheckedAt: checkedAt, error: undefined });
      return status;
    }

    publish({ ...status, updateState: 'checking', lastCheckedAt: checkedAt, error: undefined });
    try {
      if (new URL(manifestUrl).protocol !== 'https:') {
        throw new Error('Dictionary manifest URL must use HTTPS.');
      }
      const manifest = asManifest(await fetchJson(manifestUrl), true);
      const comparison = compareVersions(manifest.version, activeManifest.version);
      if (comparison <= 0) {
        publish(statusForManifest(activeManifest, 'up-to-date', checkedAt));
        return status;
      }

      publish({ ...status, updateState: 'downloading', lastCheckedAt: checkedAt, error: undefined });
      const packUrl = resolvePackUrl(manifestUrl, manifest.packUrl);
      const packValue = await fetchJson(packUrl);
      const wordsValue =
        Array.isArray(packValue) ? packValue : isRecord(packValue) ? packValue.words : undefined;
      if (!Array.isArray(wordsValue)) throw new Error('Dictionary pack has an invalid shape.');
      const validationError = validateWordsAgainstManifest(wordsValue, manifest);
      if (validationError) throw new Error(validationError);

      const pack: DutchDictionaryPack = { manifest, words: wordsValue as string[] };
      await AsyncStorage.setItem(DICTIONARY_CACHE_KEY, JSON.stringify(pack));
      activatePack(pack);
      publish(statusForManifest(manifest, 'updated', checkedAt));
    } catch (error) {
      publish({
        ...status,
        updateState: 'fallback',
        lastCheckedAt: checkedAt,
        error: error instanceof Error ? error.message : 'Dictionary update failed.',
      });
    }
    return status;
  })();
  try {
    return await updatePromise;
  } finally {
    updatePromise = null;
  }
}

export function getActiveDutchWords() {
  return activeWords;
}

export function getDutchDictionaryStatus() {
  return status;
}

export function subscribeToDutchDictionary(
  listener: (nextStatus: DutchDictionaryStatus) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}