import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const FEEDBACK_STORAGE_KEY = '@crosslex/feedback-settings';

export type FeedbackSettings = {
  visualEffects: boolean;
  soundEffects: boolean;
  hapticFeedback: boolean;
  personalBest: number;
};

type FeedbackSettingsContextValue = {
  settings: FeedbackSettings;
  isReady: boolean;
  setEnabled: (key: 'visualEffects' | 'soundEffects' | 'hapticFeedback', enabled: boolean) => Promise<void>;
  recordScore: (score: number) => Promise<boolean>;
};

const DEFAULT_SETTINGS: FeedbackSettings = {
  visualEffects: true,
  soundEffects: true,
  hapticFeedback: true,
  personalBest: 0,
};

const FeedbackSettingsContext = createContext<FeedbackSettingsContextValue | null>(null);

export function FeedbackSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<FeedbackSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(FEEDBACK_STORAGE_KEY)
      .then((stored) => {
        if (cancelled || !stored) return;
        const saved = JSON.parse(stored) as Partial<FeedbackSettings>;
        const hydrated = {
          ...DEFAULT_SETTINGS,
          visualEffects: saved.visualEffects !== false,
          soundEffects: saved.soundEffects !== false,
          hapticFeedback: saved.hapticFeedback !== false,
          personalBest:
            typeof saved.personalBest === 'number' && Number.isFinite(saved.personalBest)
              ? Math.max(0, saved.personalBest)
              : 0,
        };
        settingsRef.current = hydrated;
        setSettings(hydrated);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: FeedbackSettings) => {
    writeQueueRef.current = writeQueueRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(next)))
      .catch(() => undefined);
    return writeQueueRef.current;
  }, []);

  const setEnabled = useCallback(
    async (key: 'visualEffects' | 'soundEffects' | 'hapticFeedback', enabled: boolean) => {
      if (!isReady) return;
      const next = { ...settingsRef.current, [key]: enabled };
      settingsRef.current = next;
      setSettings(next);
      await persist(next);
    },
    [isReady, persist],
  );

  const recordScore = useCallback(
    async (score: number) => {
      if (!isReady || !Number.isFinite(score) || score <= settingsRef.current.personalBest) return false;
      const next = { ...settingsRef.current, personalBest: score };
      settingsRef.current = next;
      setSettings(next);
      void persist(next);
      return true;
    },
    [isReady, persist],
  );

  const value = useMemo(
    () => ({ settings, isReady, setEnabled, recordScore }),
    [isReady, recordScore, setEnabled, settings],
  );

  return <FeedbackSettingsContext.Provider value={value}>{children}</FeedbackSettingsContext.Provider>;
}

export function useFeedbackSettings() {
  const context = useContext(FeedbackSettingsContext);
  if (!context) throw new Error('useFeedbackSettings must be used inside FeedbackSettingsProvider');
  return context;
}