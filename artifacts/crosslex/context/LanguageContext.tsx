import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'nl' | 'en';

const LANGUAGE_STORAGE_KEY = '@crosslex/app-language';

const translations = {
  nl: {
    backToSolver: 'Terug naar solver',
    settings: 'Instellingen',
    settingsSubtitle: 'Stel de helper in terwijl er meer talen en spelmodi bijkomen.',
    appLanguage: 'Apptaal',
    appLanguageSubtitle: 'Kies de taal voor Wordfeud Helper',
    dutch: 'Nederlands',
    english: 'Engels',
    dictionary: 'Woordenboek',
    starterList: 'Nederlands · A-Z-lijst + aanvullingen',
    words: 'woorden',
    dictionaryDisclaimer:
      'Samengestelde deellijst van 2–12 letters. Dit is niet het volledige Wordfeud-woordenboek; geldige woorden buiten deze lijst kunnen ontbreken.',
    scoringRules: 'Score regels',
    wordfeudMultipliers: 'Wordfeud-bordvermenigvuldigers',
    scanInfo:
      'Wordfeud Helper leest screenshots om het bord en rekken te herkennen en controleert daarna elk woord dat door een zet ontstaat.',
    heroEyebrow: 'NEDERLANDSE WOORDENGINE · BÈTA',
    heroTitle: 'Speel de beste zet.',
    heroSubtitle: 'Importeer een Wordfeud-screenshot om het bord, je rek en alle kruiswoorden te lezen.',
    active: 'actief',
    moreLanguagesSoon: 'meer talen binnenkort',
    position: 'POSITIE',
    yourBoard: 'Jouw bord',
    demoPosition: 'demo-positie',
    scanScreenshot: 'Scan Wordfeud-screenshot',
    scanHint: 'Importeer een screenshot en krijg zetadvies',
    readingBoard: 'Bord en rek worden gelezen…',
    photoPermission: 'Toegang tot foto’s is nodig om een Wordfeud-screenshot te kiezen.',
    screenshotPreparationError: 'De gekozen screenshot kon niet worden voorbereid voor herkenning.',
    scanFallbackError: 'De screenshot kon niet worden gelezen. Probeer het opnieuw.',
    scanLimitReached: 'Scanlimiet bereikt. Probeer het later opnieuw.',
    scanLimitTryAgain: 'Scanlimiet bereikt. Probeer het later opnieuw.',
    scanLimitWithTime: (minutes: number, unit: string) =>
      `Scanlimiet bereikt. Probeer het over ongeveer ${minutes} ${unit} opnieuw.`,
    minute: 'minuut',
    minutes: 'minuten',
    tilesOnBoard: 'tegels op het bord',
    edit: 'bewerken',
    done: 'klaar',
    tapSquare: 'Tik op een vakje en voer de tegel in',
    leaveEmpty: 'Laat het leeg om het vakje te wissen.',
    screenshotSelected: 'Screenshot geselecteerd',
    screenshotReady: 'De screenshot is klaar om te scannen.',
    scanComplete: (confidence: number) => `Scan klaar · ${Math.round(confidence * 100)}% zekerheid`,
    recognizedSummary: (boardTiles: number, rackTiles: number) =>
      `${boardTiles} bordtegels en ${rackTiles} rektegels herkend. Controleer en corrigeer fouten.`,
    yourRack: 'JOUW REK',
    rackQuestion: 'Welke tegels heb je?',
    blankTileHint: 'Gebruik ? voor een blanco tegel.',
    rackPlaceholder: 'bijv. AARTE?',
    findingMoves: 'Legale zetten zoeken…',
    findBestMoves: 'Beste zetten vinden',
    results: 'RESULTATEN',
    bestLegalMoves: 'Beste zetten uit de actieve woordenlijst',
    readyWhenYouAre: 'Klaar wanneer jij dat bent',
    found: (count: number) => `${count} gevonden`,
    movePlaced: (word: string) => `Zet ${word} geplaatst.`,
    placementMeta: (direction: string, row: number, column: number, tiles: number, unit: string) =>
      `${direction} · rij ${row}, kolom ${column} · ${tiles} ${unit}`,
    horizontal: 'Horizontaal',
    vertical: 'Verticaal',
    row: 'rij',
    column: 'kolom',
    newTile: 'nieuwe tegel',
    newTiles: 'nieuwe tegels',
    points: 'punten',
    validCrossings: (words: string) => `Geldige kruiswoorden: ${words}`,
    noCrossings: 'Geen kruiswoorden gevormd',
    crossCheckTitle: 'Controleer elk woord',
    crossCheckCopy:
      'Alle getoonde hoofd- en kruiswoorden staan in de actieve Nederlandse deellijst. Woorden buiten deze lijst kunnen ontbreken.',
    solverError: 'De woordenlijst kon niet veilig worden geladen. Probeer het later opnieuw.',
    positionsStayLocal: 'Je posities blijven in deze preview op dit apparaat.',
  },
  en: {
    backToSolver: 'Back to solver',
    settings: 'Settings',
    settingsSubtitle: 'Fine-tune the helper as more languages and game modes arrive.',
    appLanguage: 'App language',
    appLanguageSubtitle: 'Choose the language for Wordfeud Helper',
    dutch: 'Dutch',
    english: 'English',
    dictionary: 'Dictionary',
    starterList: 'Dutch · A-Z list + additions',
    words: 'words',
    dictionaryDisclaimer:
      'Curated 2–12-letter subset. This is not the complete Wordfeud dictionary; valid words outside this list may be missing.',
    scoringRules: 'Scoring rules',
    wordfeudMultipliers: 'Wordfeud board multipliers',
    scanInfo:
      'Wordfeud Helper scans screenshots to recognize the board and rack, then validates every word created by the suggested move.',
    heroEyebrow: 'DUTCH WORD ENGINE · BETA',
    heroTitle: 'Play the best move.',
    heroSubtitle: 'Import a Wordfeud screenshot to read the board, rack, and every crossing word.',
    active: 'active',
    moreLanguagesSoon: 'more languages soon',
    position: 'POSITION',
    yourBoard: 'Your board',
    demoPosition: 'demo position',
    scanScreenshot: 'Scan Wordfeud screenshot',
    scanHint: 'Import a screenshot and get move advice',
    readingBoard: 'Reading board and rack…',
    photoPermission: 'Photo access is needed to select a Wordfeud screenshot.',
    screenshotPreparationError: 'The selected screenshot could not be prepared for scanning.',
    scanFallbackError: 'The screenshot could not be scanned. Please try again.',
    scanLimitReached: 'Scan limit reached. Please try again later.',
    scanLimitTryAgain: 'Scan limit reached. Please try again later.',
    scanLimitWithTime: (minutes: number, unit: string) =>
      `Scan limit reached. Please try again in about ${minutes} ${unit}.`,
    minute: 'minute',
    minutes: 'minutes',
    tilesOnBoard: 'tiles on board',
    edit: 'edit',
    done: 'done',
    tapSquare: 'Tap a square, then enter its tile',
    leaveEmpty: 'Leave it empty to clear the square.',
    screenshotSelected: 'Screenshot selected',
    screenshotReady: 'The screenshot is ready to scan.',
    scanComplete: (confidence: number) => `Scan complete · ${Math.round(confidence * 100)}% confidence`,
    recognizedSummary: (boardTiles: number, rackTiles: number) =>
      `${boardTiles} board tiles and ${rackTiles} rack tiles recognized. Check and correct any errors.`,
    yourRack: 'YOUR RACK',
    rackQuestion: 'What tiles do you have?',
    blankTileHint: 'Use ? for a blank tile.',
    rackPlaceholder: 'e.g. AARTE?',
    findingMoves: 'Finding legal moves…',
    findBestMoves: 'Find best moves',
    results: 'RESULTS',
    bestLegalMoves: 'Best moves from the active dictionary',
    readyWhenYouAre: 'Ready when you are',
    found: (count: number) => `${count} found`,
    movePlaced: (word: string) => `Move ${word} placed.`,
    placementMeta: (direction: string, row: number, column: number, tiles: number, unit: string) =>
      `${direction} · row ${row}, col ${column} · ${tiles} ${unit}`,
    horizontal: 'Horizontal',
    vertical: 'Vertical',
    row: 'row',
    column: 'col',
    newTile: 'new tile',
    newTiles: 'new tiles',
    points: 'points',
    validCrossings: (words: string) => `Valid crossings: ${words}`,
    noCrossings: 'No crossing words formed',
    crossCheckTitle: 'Cross-check every word',
    crossCheckCopy:
      'Every shown main and crossing word appears in the active Dutch subset. Words outside this list may be missing.',
    solverError: 'The dictionary could not be loaded safely. Please try again later.',
    positionsStayLocal: 'Your positions stay on this device in this preview.',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
export type Translator = {
  (key: TranslationKey): string;
  (key: 'scanComplete', confidence: number): string;
  (key: 'recognizedSummary', boardTiles: number, rackTiles: number): string;
  (key: 'found', count: number): string;
  (key: 'movePlaced', word: string): string;
  (key: 'placementMeta', direction: string, row: number, column: number, tiles: number, unit: string): string;
  (key: 'validCrossings', words: string): string;
  (key: 'scanLimitWithTime', minutes: number, unit: string): string;
};

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: Translator;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('nl');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'nl' || stored === 'en') setLanguageState(stored);
      })
      .catch(() => undefined);
  }, []);

  const setLanguage = async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: ((key: TranslationKey, ...args: unknown[]) => {
        const entry = translations[language][key];
        return typeof entry === 'function'
          ? (entry as (...values: unknown[]) => string)(...args)
          : entry;
      }) as Translator,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}