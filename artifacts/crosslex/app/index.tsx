import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import { useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AccessibilityInfo,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkWordfeudWord,
  scanWordfeudBoard,
  ScanBoardInputMimeType,
  type ScanBoardInputMimeType as ScanBoardMimeType,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useLanguage, type Translator } from '@/context/LanguageContext';
import { useFeedbackSettings } from '@/context/FeedbackSettingsContext';
import {
  BOARD_SIZE,
  applyMove,
  Board,
  checkDutchDictionaryForUpdates,
  createEmptyBoard,
  createSampleBoard,
  findBestMoves,
  getPremiumLabel,
  Move,
} from '@/lib/solver';

const STORAGE_KEY = '@crosslex/position';
const DEVICE_ID_STORAGE_KEY = '@crosslex/device-id';
const WORDFEUD_HANDOFF_STORAGE_KEY = '@crosslex/wordfeud-handoff';
const WORDFEUD_ANDROID_PACKAGE = 'com.hbwares.wordfeud.free';
const DEVICE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let deviceIdPromise: Promise<string> | null = null;

type ScanInfo = {
  confidence: number;
  detectedBoardTiles: number;
  detectedRackTiles: number;
  warnings: string[];
  needsRackReview: boolean;
};

type TaalTikWordVerdict = {
  word: string;
  status: 'allowed' | 'rejected' | 'error';
};

type TaalTikCheckState = {
  moveKey: string;
  checking: boolean;
  verdicts: TaalTikWordVerdict[];
};

type SuggestionSession = {
  board: Board;
  rack: string;
};

type RewardMoment = {
  id: number;
  move: Move;
  isNewBest: boolean;
};

const REWARD_PARTICLES = [
  { left: 9, top: 12, size: 8, rotate: '-18deg' },
  { left: 19, top: 22, size: 6, rotate: '31deg' },
  { left: 31, top: 9, size: 9, rotate: '12deg' },
  { left: 43, top: 18, size: 7, rotate: '-37deg' },
  { left: 56, top: 8, size: 8, rotate: '24deg' },
  { left: 67, top: 21, size: 6, rotate: '-13deg' },
  { left: 79, top: 11, size: 9, rotate: '42deg' },
  { left: 89, top: 24, size: 7, rotate: '-29deg' },
  { left: 14, top: 39, size: 7, rotate: '18deg' },
  { left: 84, top: 43, size: 8, rotate: '-21deg' },
  { left: 26, top: 55, size: 6, rotate: '38deg' },
  { left: 73, top: 58, size: 7, rotate: '-34deg' },
] as const;

function getRewardTier(score: number) {
  if (score >= 70) return 6;
  if (score >= 50) return 5;
  if (score >= 40) return 4;
  if (score >= 30) return 3;
  if (score >= 20) return 2;
  if (score >= 10) return 1;
  return 0;
}

function getRewardLabel(score: number, t: Translator) {
  if (score >= 70) return t('rewardLegendary');
  if (score >= 50) return t('rewardHuge');
  if (score >= 40) return t('rewardAmazing');
  if (score >= 30) return t('rewardExcellent');
  if (score >= 20) return t('rewardGreat');
  return t('rewardNice');
}

function RewardCelebration({
  moment,
  enabled,
  colors,
  t,
}: {
  moment: RewardMoment | null;
  enabled: boolean;
  colors: ReturnType<typeof useColors>;
  t: Translator;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.78)).current;
  const translateY = useRef(new Animated.Value(22)).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (!moment || !enabled) return;
    opacity.setValue(0);
    scale.setValue(0.78);
    translateY.setValue(22);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver }),
        Animated.delay(1450),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver }),
      ]),
      Animated.spring(scale, { toValue: 1, damping: 11, stiffness: 180, useNativeDriver }),
      Animated.spring(translateY, { toValue: 0, damping: 13, stiffness: 150, useNativeDriver }),
    ]).start();
  }, [enabled, moment, opacity, scale, translateY, useNativeDriver]);

  if (!moment || !enabled) return null;

  const tier = getRewardTier(moment.move.score);
  const particleCount = tier === 0 ? 0 : Math.min(REWARD_PARTICLES.length, 4 + tier * 2);
  const particleColors = [
    colors.accent,
    colors.rewardGold,
    colors.rewardPink,
    colors.rewardCyan,
    colors.suggestion,
  ];

  return (
    <Animated.View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.rewardOverlay, { opacity, pointerEvents: 'none' }]}
    >
      {REWARD_PARTICLES.slice(0, particleCount).map((particle, index) => (
        <View
          key={`${moment.id}-particle-${index}`}
          style={[
            styles.rewardParticle,
            {
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: particle.size,
              height: particle.size * 1.8,
              backgroundColor: particleColors[index % particleColors.length],
              transform: [{ rotate: particle.rotate }],
            },
          ]}
        />
      ))}
      <Animated.View
        style={[
          styles.rewardCard,
          {
            backgroundColor: tier >= 4 ? colors.accent : colors.card,
            borderColor: tier >= 4 ? colors.rewardGold : colors.primary,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <View
          style={[
            styles.rewardBadge,
            {
              backgroundColor: tier >= 4 ? colors.rewardGold : colors.primary,
              borderColor: colors.background,
            },
          ]}
        >
          <Ionicons
            name={tier >= 4 ? 'trophy' : tier >= 2 ? 'sparkles' : 'star'}
            size={18}
            color={tier >= 4 ? colors.accentForeground : colors.primaryForeground}
          />
        </View>
        <Text
          style={[
            styles.rewardLabel,
            { color: tier >= 4 ? colors.accentForeground : colors.mutedForeground },
          ]}
        >
          {getRewardLabel(moment.move.score, t)}
        </Text>
        <Text
          style={[
            styles.rewardWord,
            { color: tier >= 4 ? colors.accentForeground : colors.foreground },
          ]}
        >
          {moment.move.word}
        </Text>
        <Text
          style={[
            styles.rewardScore,
            { color: tier >= 4 ? colors.accentForeground : colors.rewardGold },
          ]}
        >
          {moment.move.score} {t('points')}
        </Text>
        {moment.isNewBest && (
          <View style={[styles.newBestPill, { backgroundColor: colors.rewardGold }]}>
            <Ionicons name="ribbon" size={13} color={colors.accentForeground} />
            <Text style={[styles.newBestText, { color: colors.accentForeground }]}>
              {t('newPersonalBest')}
            </Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

function createDeviceId(): string {
  const cryptoApi = (
    globalThis as typeof globalThis & {
      crypto?: { randomUUID?: () => string };
    }
  ).crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getScanMimeType(value: string | null | undefined): ScanBoardMimeType {
  if (value === ScanBoardInputMimeType['image/png']) return value;
  if (value === ScanBoardInputMimeType['image/webp']) return value;
  return ScanBoardInputMimeType['image/jpeg'];
}

function needsRackReview(warnings: string[]): boolean {
  return warnings.some(
    (warning) =>
      /\b(rack|rek)\b/i.test(warning) &&
      /\b(uncertain|unclear|verify|check|ambigu|onzeker|controleer|twijfel)\w*/i.test(warning),
  );
}

async function getDeviceId(): Promise<string> {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      try {
        const stored = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
        if (stored && DEVICE_ID_PATTERN.test(stored)) return stored;

        const generated = createDeviceId();
        await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
        return generated;
      } catch {
        return createDeviceId();
      }
    })();
  }
  return deviceIdPromise;
}

function getScanErrorMessage(error: unknown, t: Translator): string {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    error.status === 429 &&
    'data' in error
  ) {
    const data = error.data;
    const retryAfterSeconds =
      data && typeof data === 'object' && 'retryAfterSeconds' in data
        ? data.retryAfterSeconds
        : undefined;
    if (typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)) {
      const minutes = Math.ceil(retryAfterSeconds / 60);
      return t('scanLimitWithTime', minutes, minutes === 1 ? t('minute') : t('minutes'));
    }
    return t('scanLimitTryAgain');
  }

  return error instanceof Error
    ? error.message
    : t('scanFallbackError');
}

function LogoMark({ colors }: { colors: ReturnType<typeof useColors> }) {
  const tiles = [
    { letter: 'W', score: 5 },
    { letter: 'H', score: 4 },
  ];

  return (
    <View style={styles.logoRow}>
      {tiles.map((tile) => (
        <View
          key={tile.letter}
          style={[styles.logoTile, { backgroundColor: colors.tile }]}
        >
          <Text style={[styles.logoTileLetter, { color: colors.tileForeground }]}>
            {tile.letter}
          </Text>
          <Text style={[styles.logoTileScore, { color: colors.tileForeground }]}>
            {tile.score}
          </Text>
        </View>
      ))}
      <Text style={[styles.logoText, { color: colors.foreground }]}>Wordfeud Helper</Text>
    </View>
  );
}

function BoardPreview({
  board,
  highlightedMove,
  highlightBaseBoard,
  selectedCell,
  editing,
  onSelect,
  colors,
}: {
  board: Board;
  highlightedMove: Move | null;
  highlightBaseBoard: Board | null;
  selectedCell: { row: number; col: number } | null;
  editing: boolean;
  onSelect: (row: number, col: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.board, { borderColor: colors.boardBorder, backgroundColor: colors.board }]}>
      {board.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.boardRow}>
          {row.map((letter, colIndex) => {
            const moveOffset =
              highlightedMove?.direction === 'H' && highlightedMove.row === rowIndex
                ? colIndex - highlightedMove.col
                : highlightedMove?.direction === 'V' && highlightedMove.col === colIndex
                  ? rowIndex - highlightedMove.row
                  : -1;
            const isHighlightedPlacement =
              !editing &&
              Boolean(
                highlightedMove &&
                  highlightBaseBoard?.[rowIndex]?.[colIndex] === '' &&
                  moveOffset >= 0 &&
                  moveOffset < highlightedMove.word.length &&
                  letter,
              );
            const isSelected =
              selectedCell?.row === rowIndex && selectedCell.col === colIndex;
            const premium = getPremiumLabel(rowIndex, colIndex);
            const premiumBackground =
              premium === '★'
                ? colors.center
                : premium === '3W'
                  ? colors.tripleWord
                  : premium === '2W'
                    ? colors.doubleWord
                    : premium === '3L'
                      ? colors.tripleLetter
                      : premium === '2L'
                        ? colors.doubleLetter
                        : '';
            return (
              <Pressable
                key={`cell-${rowIndex}-${colIndex}`}
                testID={`board-cell-${rowIndex}-${colIndex}`}
                onPress={() => editing && onSelect(rowIndex, colIndex)}
                style={({ pressed }) => [
                  styles.boardCell,
                  {
                    backgroundColor: isHighlightedPlacement
                      ? colors.accent
                      : letter
                        ? colors.tile
                      : premiumBackground || colors.boardCell,
                    borderColor: colors.boardBorder,
                    opacity: pressed && editing ? 0.7 : 1,
                  },
                  isSelected && { borderColor: colors.primary, borderWidth: 2 },
                ]}
              >
                {letter ? (
                    <Text style={[styles.boardLetter, { color: colors.tileForeground }]}>
                    {letter}
                  </Text>
                ) : (
                    <Text style={[styles.premiumText, { color: colors.premiumForeground }]}>
                    {premium}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function MoveRow({
  move,
  rank,
  colors,
  t,
  selected,
  onPress,
  taalTikCheck,
  onCheckMove,
}: {
  move: Move;
  rank: number;
  colors: ReturnType<typeof useColors>;
  t: Translator;
  selected: boolean;
  onPress: () => void;
  taalTikCheck: TaalTikCheckState | null;
  onCheckMove: () => void;
}) {
  const moveKey = `${move.word}-${move.row}-${move.col}-${move.direction}`;
  const currentCheck = taalTikCheck?.moveKey === moveKey ? taalTikCheck : null;
  const isChecking = currentCheck?.checking === true;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.moveRow,
        {
          borderBottomColor: colors.border,
          backgroundColor: selected ? colors.primary : 'transparent',
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={styles.rankColumn}>
        <Text style={[styles.rankText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
          {rank}
        </Text>
      </View>
      <View style={styles.moveBody}>
        <View style={styles.moveTitleRow}>
          <Text style={[styles.moveWord, { color: selected ? colors.primaryForeground : colors.foreground }]}>
            {move.word}
          </Text>
          <View style={styles.moveScoreGroup}>
            <Text style={[styles.moveScore, { color: colors.suggestion }]}>{move.score}</Text>
            <Text style={[styles.movePoints, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
              {t('points')}
            </Text>
          </View>
        </View>
        <Text style={[styles.moveMeta, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
          {t(
            'placementMeta',
            move.direction === 'H' ? t('horizontal') : t('vertical'),
            move.row + 1,
            move.col + 1,
            move.tilesUsed,
            move.tilesUsed === 1 ? t('newTile') : t('newTiles'),
          )}
        </Text>
        {selected && (
          <>
            <Text style={[styles.crossSummary, { color: colors.primaryForeground }]}>
              {move.crossWords.length > 0
                ? t('validCrossings', move.crossWords.join(', '))
                : t('noCrossings')}
            </Text>
            <Pressable
              testID={`check-taaltik-${move.word}`}
              onPress={(event) => {
                event.stopPropagation();
                onCheckMove();
              }}
              disabled={isChecking}
              style={({ pressed }) => [
                styles.taalTikAction,
                {
                  borderColor: colors.primaryForeground,
                  opacity: pressed || isChecking ? 0.72 : 1,
                },
              ]}
            >
              {isChecking ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Ionicons name="search-outline" size={14} color={colors.primaryForeground} />
              )}
              <Text style={[styles.taalTikActionText, { color: colors.primaryForeground }]}>
                {isChecking ? t('checkingTaalTik') : t('checkWithTaalTik')}
              </Text>
            </Pressable>
            {currentCheck?.verdicts.map((verdict) => (
              <View
                key={verdict.word}
                style={[
                  styles.taalTikStatus,
                  {
                    backgroundColor:
                      verdict.status === 'allowed' ? colors.secondary : colors.destructive,
                  },
                ]}
              >
                <Ionicons
                  name={
                    verdict.status === 'allowed'
                      ? 'checkmark-circle'
                      : verdict.status === 'rejected'
                        ? 'close-circle'
                        : 'alert-circle'
                  }
                  size={14}
                  color={
                    verdict.status === 'allowed' ? colors.primary : colors.destructiveForeground
                  }
                />
                <Text
                  style={[
                    styles.taalTikStatusText,
                    {
                      color:
                        verdict.status === 'allowed'
                          ? colors.foreground
                          : colors.destructiveForeground,
                    },
                  ]}
                >
                  {verdict.status === 'allowed'
                    ? t('taalTikAllowed', verdict.word)
                    : verdict.status === 'rejected'
                      ? t('taalTikRejected', verdict.word)
                      : `${verdict.word}: ${t('taalTikCheckError')}`}
                </Text>
              </View>
            ))}
            {currentCheck && !currentCheck.checking && currentCheck.verdicts.length > 0 && (
              <Text style={[styles.taalTikSource, { color: colors.primaryForeground }]}>
                {t('taalTikSource')}
              </Text>
            )}
          </>
        )}
      </View>
      <Ionicons
        name={move.direction === 'H' ? 'arrow-forward' : 'arrow-down'}
        size={17}
        color={selected ? colors.primaryForeground : colors.mutedForeground}
      />
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const {
    settings: feedbackSettings,
    isReady: feedbackSettingsReady,
    recordScore,
  } = useFeedbackSettings();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const rewardPlayer = useAudioPlayer(require('../assets/reward-pop.wav'));
  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [rack, setRack] = useState('AARTE?');
  const [editingBoard, setEditingBoard] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [results, setResults] = useState<Move[]>([]);
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [placedMove, setPlacedMove] = useState<Move | null>(null);
  const [suggestionSession, setSuggestionSession] = useState<SuggestionSession | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<ScanInfo | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [taalTikCheck, setTaalTikCheck] = useState<TaalTikCheckState | null>(null);
  const [rewardMoment, setRewardMoment] = useState<RewardMoment | null>(null);
  const taalTikRequestRef = useRef(0);
  const rewardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const saved = JSON.parse(stored) as { board?: Board; rack?: string };
        if (saved.board) setBoard(saved.board);
        if (saved.rack) setRack(saved.rack);
      })
      .catch(() => undefined);
  }, []);

  useEffect(
    () => () => {
      if (rewardTimerRef.current) clearTimeout(rewardTimerRef.current);
    },
    [],
  );

  const lettersOnBoard = useMemo(
    () => board.reduce((total, row) => total + row.filter(Boolean).length, 0),
    [board],
  );

  const celebrateMove = async (move: Move) => {
    if (!feedbackSettingsReady) return;
    const isNewBest = await recordScore(move.score);
    const announcement = [
      getRewardLabel(move.score, t),
      move.word,
      `${move.score} ${t('points')}`,
      isNewBest ? t('newPersonalBest') : null,
    ]
      .filter(Boolean)
      .join('. ');
    AccessibilityInfo.announceForAccessibility(announcement);

    if (feedbackSettings.soundEffects) {
      try {
        rewardPlayer.volume = Math.min(0.8, 0.35 + getRewardTier(move.score) * 0.08);
        await rewardPlayer.seekTo(0);
        rewardPlayer.play();
      } catch {
        // Reward feedback remains useful if audio is unavailable on this device.
      }
    }

    if (feedbackSettings.hapticFeedback) {
      const impact =
        move.score >= 50
          ? Haptics.ImpactFeedbackStyle.Heavy
          : move.score >= 20
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light;
      await Haptics.impactAsync(impact);
    }

    if (feedbackSettings.visualEffects) {
      if (rewardTimerRef.current) clearTimeout(rewardTimerRef.current);
      setRewardMoment({ id: Date.now(), move, isNewBest });
      rewardTimerRef.current = setTimeout(() => setRewardMoment(null), 2100);
    }
  };

  const openWordfeud = async (move: Move) => {
    const direction = move.direction === 'H' ? t('horizontal') : t('vertical');
    const handoff = {
      word: move.word,
      direction,
      row: move.row + 1,
      column: move.col + 1,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(WORDFEUD_HANDOFF_STORAGE_KEY, JSON.stringify(handoff)).catch(
      () => undefined,
    );

    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.openApplication(WORDFEUD_ANDROID_PACKAGE);
        return;
      } catch {
        Alert.alert(t('wordfeudNotInstalledTitle'), t('wordfeudNotInstalledMessage'));
        return;
      }
    }

    Alert.alert(
      t('wordfeudManualSwitchTitle'),
      t('wordfeudManualSwitchMessage', move.word, direction, move.row + 1, move.col + 1),
    );
  };

  const updateBoardCell = (value: string) => {
    if (!selectedCell) return;
    const nextBoard = board.map((row) => [...row]);
    nextBoard[selectedCell.row][selectedCell.col] = value.slice(-1).toUpperCase().replace(/[^A-Z]/g, '');
    setBoard(nextBoard);
    setResults([]);
    setSelectedMove(null);
    setPlacedMove(null);
    setSuggestionSession(null);
  };

  const beginSuggestionSession = (sourceBoard: Board, sourceRack: string, nextResults: Move[]) => {
    setSuggestionSession({ board: sourceBoard, rack: sourceRack });
    setResults(nextResults);
    setEditingBoard(false);
    setSelectedCell(null);

    const bestMove = nextResults[0] ?? null;
    if (!bestMove) {
      setBoard(sourceBoard);
      setRack(sourceRack);
      setSelectedMove(null);
      setPlacedMove(null);
      return { board: sourceBoard, rack: sourceRack };
    }

    const preview = applyMove(sourceBoard, sourceRack, bestMove);
    setBoard(preview.board);
    setRack(preview.rack);
    setSelectedMove(bestMove);
    setPlacedMove(bestMove);
    return preview;
  };

  const handleImport = async () => {
    setIsImporting(true);
    setScanError(null);
    setScanInfo(null);
    setResults([]);
    setSelectedMove(null);
    setPlacedMove(null);
    setSuggestionSession(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setScanError(t('photoPermission'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        base64: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.base64) {
        throw new Error(t('screenshotPreparationError'));
      }

      setScreenshotUri(asset.uri);
      const deviceId = await getDeviceId();
      const scan = await scanWordfeudBoard(
        {
          imageBase64: asset.base64,
          mimeType: getScanMimeType(asset.mimeType),
        },
        { headers: { 'X-CrossLex-Device-ID': deviceId } },
      );
      const scannedBoard = scan.board as Board;
      const scannedRack = scan.rack;
      const detectedBoardTiles = scannedBoard.reduce(
        (total, row) => total + row.filter(Boolean).length,
        0,
      );
      const rackNeedsReview = needsRackReview(scan.warnings);

      setScanInfo({
        confidence: scan.confidence,
        detectedBoardTiles,
        detectedRackTiles: scannedRack.length,
        warnings: scan.warnings,
        needsRackReview: rackNeedsReview,
      });
      setBoard(scannedBoard);
      setRack(scannedRack);
      setSuggestionSession({ board: scannedBoard, rack: scannedRack });
      setEditingBoard(false);
      setSelectedCell(null);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ board: scannedBoard, rack: scannedRack }),
      );
      setIsImporting(false);

      if (scannedRack.length < 2 || rackNeedsReview) {
        if (feedbackSettings.hapticFeedback) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return;
      }

      setIsSolving(true);
      try {
        await checkDutchDictionaryForUpdates();
        const scannedResults = findBestMoves(scannedBoard, scannedRack);
        const preview = beginSuggestionSession(scannedBoard, scannedRack, scannedResults);
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ board: preview.board, rack: preview.rack }),
        );
        if (scannedResults[0]) {
          await celebrateMove(scannedResults[0]);
        } else if (feedbackSettings.hapticFeedback) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        setScanError(t('solverError'));
        if (feedbackSettings.hapticFeedback) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } finally {
        setIsSolving(false);
      }
    } catch (error) {
      setScanError(getScanErrorMessage(error, t));
      if (feedbackSettings.hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleSolve = async () => {
    setIsSolving(true);
    setScanError(null);
    try {
      if (feedbackSettings.hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await new Promise((resolve) => setTimeout(resolve, 180));
      await checkDutchDictionaryForUpdates();
      const sourceBoard = suggestionSession?.board ?? board;
      const sourceRack = suggestionSession?.rack ?? rack;
      const nextResults = findBestMoves(sourceBoard, sourceRack);
      const preview = beginSuggestionSession(sourceBoard, sourceRack, nextResults);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ board: preview.board, rack: preview.rack }),
      );
      if (nextResults[0]) await celebrateMove(nextResults[0]);
    } catch {
      setScanError(t('solverError'));
      if (feedbackSettings.hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSolving(false);
    }
  };

  const handleApplyMove = async (move: Move) => {
    taalTikRequestRef.current += 1;
    setTaalTikCheck(null);
    setScanError(null);
    try {
      const sourceBoard = suggestionSession?.board ?? board;
      const sourceRack = suggestionSession?.rack ?? rack;
      const { board: nextBoard, rack: nextRack } = applyMove(sourceBoard, sourceRack, move);

      setBoard(nextBoard);
      setRack(nextRack);
      setSelectedMove(move);
      setPlacedMove(move);
      setEditingBoard(false);
      setSelectedCell(null);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ board: nextBoard, rack: nextRack }));
      await celebrateMove(move);
    } catch {
      setScanError(t('solverError'));
      if (feedbackSettings.hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleCheckMove = async (move: Move) => {
    const requestId = taalTikRequestRef.current + 1;
    taalTikRequestRef.current = requestId;
    const moveKey = `${move.word}-${move.row}-${move.col}-${move.direction}`;
    const words = [...new Set([move.word, ...move.crossWords])];
    setTaalTikCheck({ moveKey, checking: true, verdicts: [] });

    const verdicts = await Promise.all(
      words.map(async (word): Promise<TaalTikWordVerdict> => {
        try {
          const result = await checkWordfeudWord({ word });
          return { word, status: result.allowed ? 'allowed' : 'rejected' };
        } catch {
          return { word, status: 'error' };
        }
      }),
    );
    if (requestId !== taalTikRequestRef.current) return;

    setTaalTikCheck({ moveKey, checking: false, verdicts });
    const feedbackType = verdicts.some((verdict) => verdict.status === 'error')
      ? Haptics.NotificationFeedbackType.Error
      : verdicts.some((verdict) => verdict.status === 'rejected')
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success;
    if (feedbackSettings.hapticFeedback) {
      await Haptics.notificationAsync(feedbackType);
    }
  };

  const loadDemo = () => {
    setBoard(createSampleBoard());
    setRack('AARTE?');
    setScreenshotUri(null);
    setScanInfo(null);
    setScanError(null);
    setResults([]);
    setSelectedMove(null);
    setPlacedMove(null);
    setSuggestionSession(null);
    setRewardMoment(null);
    setEditingBoard(false);
    setSelectedCell(null);
  };

  const clearScreen = async () => {
    taalTikRequestRef.current += 1;
    setBoard(createEmptyBoard());
    setRack('');
    setEditingBoard(false);
    setSelectedCell(null);
    setResults([]);
    setSelectedMove(null);
    setPlacedMove(null);
    setSuggestionSession(null);
    setScreenshotUri(null);
    setScanInfo(null);
    setScanError(null);
    setTaalTikCheck(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Clearing the visible screen is still successful if storage is unavailable.
    }
    if (feedbackSettings.hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const confirmClearScreen = () => {
    if (Platform.OS === 'web') {
      void clearScreen();
      return;
    }

    Alert.alert(t('clearScreenTitle'), t('clearScreenMessage'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('clearScreenConfirm'), style: 'destructive', onPress: () => void clearScreen() },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top + 18,
            paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LogoMark colors={colors} />
          <Pressable
            testID="settings-button"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="options-outline" size={19} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{t('heroEyebrow')}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('heroTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t('heroSubtitle')}
          </Text>
        </View>

        <View style={[styles.languageRow, { backgroundColor: colors.secondary }]}>
          <View style={styles.languageLeft}>
            <View style={[styles.languageDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.languageText, { color: colors.foreground }]}>{t('dutch')}</Text>
            <Text style={[styles.activeText, { color: colors.mutedForeground }]}>{t('active')}</Text>
          </View>
          <View style={[styles.soonPill, { backgroundColor: colors.card }]}>
            <Ionicons name="globe-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.soonText, { color: colors.mutedForeground }]}>{t('moreLanguagesSoon')}</Text>
          </View>
        </View>

        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <View>
            <Text style={[styles.sectionKicker, { color: colors.mutedForeground }]}>{t('position')}</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('yourBoard')}</Text>
          </View>
          <View style={styles.positionActions}>
            <Pressable
              testID="demo-position-button"
              onPress={loadDemo}
              style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.primary} />
              <Text style={[styles.textButtonLabel, { color: colors.primary }]}>{t('demoPosition')}</Text>
            </Pressable>
            <Pressable
              testID="clear-screen-button"
              onPress={confirmClearScreen}
              style={({ pressed }) => [
                styles.clearButton,
                { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.destructive} />
              <Text style={[styles.clearButtonText, { color: colors.destructive }]}>{t('clearScreen')}</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          testID="import-screenshot-button"
          onPress={handleImport}
          disabled={isImporting || isSolving}
          style={({ pressed }) => [
            styles.scanButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || isImporting || isSolving ? 0.7 : 1,
            },
          ]}
        >
          {isImporting || isSolving ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Ionicons name="scan-outline" size={20} color={colors.primaryForeground} />
          )}
          <View style={styles.scanButtonCopy}>
            <Text style={[styles.scanButtonTitle, { color: colors.primaryForeground }]}>
              {isImporting ? t('readingBoard') : isSolving ? t('findingMoves') : t('scanScreenshot')}
            </Text>
            <Text style={[styles.scanButtonHint, { color: colors.primaryForeground }]}>
              {t('scanHint')}
            </Text>
          </View>
          {!isImporting && !isSolving && (
            <Ionicons name="image-outline" size={18} color={colors.primaryForeground} />
          )}
        </Pressable>

        {scanError && (
          <View style={[styles.scanError, { backgroundColor: colors.muted, borderColor: colors.destructive }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
            <Text style={[styles.scanErrorText, { color: colors.foreground }]}>{scanError}</Text>
          </View>
        )}

        <View style={[styles.boardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.boardCardTop}>
            <View style={styles.boardStatus}>
              <Ionicons name="grid-outline" size={16} color={colors.primary} />
              <Text style={[styles.boardStatusText, { color: colors.foreground }]}>
                {lettersOnBoard} {t('tilesOnBoard')}
              </Text>
            </View>
            <Pressable
              testID="edit-board-button"
              onPress={() => {
                setEditingBoard((value) => !value);
                setSelectedCell(null);
              }}
              style={({ pressed }) => [styles.editButton, { borderColor: editingBoard ? colors.primary : colors.border, backgroundColor: editingBoard ? colors.primary : colors.background, opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name={editingBoard ? 'checkmark' : 'create-outline'} size={14} color={editingBoard ? colors.primaryForeground : colors.foreground} />
              <Text style={[styles.editButtonText, { color: editingBoard ? colors.primaryForeground : colors.foreground }]}>
                {editingBoard ? t('done') : t('edit')}
              </Text>
            </Pressable>
          </View>

          <BoardPreview
            board={board}
              highlightedMove={editingBoard ? null : placedMove}
              highlightBaseBoard={suggestionSession?.board ?? null}
            selectedCell={selectedCell}
            editing={editingBoard}
            onSelect={(row, col) => setSelectedCell({ row, col })}
            colors={colors}
          />

          {editingBoard && (
            <View style={[styles.editorRow, { backgroundColor: colors.secondary }]}>
              <View style={styles.editorCopy}>
                <Text style={[styles.editorLabel, { color: colors.foreground }]}>{t('tapSquare')}</Text>
                <Text style={[styles.editorHint, { color: colors.mutedForeground }]}>{t('leaveEmpty')}</Text>
              </View>
              <TextInput
                testID="selected-letter-input"
                value={selectedCell ? board[selectedCell.row][selectedCell.col] : ''}
                onChangeText={updateBoardCell}
                placeholder="—"
                placeholderTextColor={colors.mutedForeground}
                maxLength={1}
                autoCapitalize="characters"
                style={[styles.cellInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </View>
          )}

          {screenshotUri && (
            <View style={[styles.screenshotRow, { borderTopColor: colors.border }]}>
              <Image source={{ uri: screenshotUri }} style={styles.screenshotThumb} />
              <View style={styles.screenshotCopy}>
                <Text style={[styles.screenshotTitle, { color: colors.foreground }]}>
                  {scanInfo
                    ? t('scanComplete', scanInfo.confidence)
                    : t('screenshotSelected')}
                </Text>
                <Text style={[styles.screenshotHint, { color: colors.mutedForeground }]}>
                  {scanInfo
                    ? scanInfo.needsRackReview
                      ? t('rackReviewRequired')
                      : scanInfo.warnings[0] ??
                      t('recognizedSummary', scanInfo.detectedBoardTiles, scanInfo.detectedRackTiles)
                    : t('screenshotReady')}
                </Text>
              </View>
              <Ionicons
                name={scanInfo ? 'checkmark-circle' : 'image-outline'}
                size={20}
                color={scanInfo ? colors.primary : colors.mutedForeground}
              />
            </View>
          )}
        </View>

        <View style={[styles.rackCard, { backgroundColor: colors.foreground }]}>
          <View style={styles.rackHeader}>
            <View>
                <Text style={[styles.rackKicker, { color: colors.accent }]}>{t('yourRack')}</Text>
                <Text style={[styles.rackTitle, { color: colors.card }]}>{t('rackQuestion')}</Text>
            </View>
            <View style={[styles.rackCount, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.rackCountText, { color: colors.foreground }]}>{rack.replace(/[^A-Z?]/gi, '').length}/7</Text>
            </View>
          </View>
          <TextInput
            testID="rack-input"
            value={rack}
            onChangeText={(value) => {
              setRack(value.toUpperCase().replace(/[^A-Z?]/g, '').slice(0, 7));
              setResults([]);
              setSelectedMove(null);
              setPlacedMove(null);
               setSuggestionSession(null);
            }}
            placeholder={t('rackPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            style={[styles.rackInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          />
              <Text style={[styles.rackHint, { color: colors.mutedForeground }]}>{t('blankTileHint')}</Text>
        </View>

        <Pressable
          testID="solve-button"
          onPress={handleSolve}
          disabled={isSolving || rack.length < 2}
          style={({ pressed }) => [styles.solveButton, { backgroundColor: colors.primary, opacity: pressed || isSolving || rack.length < 2 ? 0.7 : 1 }]}
        >
          {isSolving ? <ActivityIndicator color={colors.primaryForeground} /> : <Ionicons name="sparkles-outline" size={19} color={colors.primaryForeground} />}
          <Text style={[styles.solveButtonText, { color: colors.primaryForeground }]}>
            {isSolving ? t('findingMoves') : t('findBestMoves')}
          </Text>
          {!isSolving && <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />}
        </Pressable>

        <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.resultsTitleColumn}>
            <Text style={[styles.sectionKicker, { color: colors.mutedForeground }]}>{t('results')}</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {results.length > 0 ? t('bestLegalMoves') : t('readyWhenYouAre')}
            </Text>
          </View>
          {results.length > 0 && (
            <View style={[styles.resultCount, { backgroundColor: colors.accent }]}>
              <Text style={[styles.resultCountText, { color: colors.accentForeground }]}>{t('found', results.length)}</Text>
            </View>
          )}
        </View>

        {placedMove && (
          <View style={[styles.placedBanner, { backgroundColor: colors.secondary }]}>
            <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
            <Text style={[styles.placedBannerText, { color: colors.foreground }]}>
              {t('movePlaced', placedMove.word)}
            </Text>
          </View>
        )}

        {placedMove && (
          <View
            style={[
              styles.wordfeudHandoff,
              { backgroundColor: colors.foreground, borderColor: colors.border },
            ]}
          >
            <View style={styles.wordfeudHandoffHeader}>
              <View style={[styles.wordfeudHandoffIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="phone-portrait-outline" size={20} color={colors.accentForeground} />
              </View>
              <View style={styles.wordfeudHandoffCopy}>
                <Text style={[styles.wordfeudHandoffKicker, { color: colors.accent }]}>
                  {t('rememberPosition')}
                </Text>
                <Text style={[styles.wordfeudHandoffPosition, { color: colors.card }]}>
                  {t(
                    'wordfeudHandoffPosition',
                    placedMove.word,
                    placedMove.direction === 'H' ? t('horizontal') : t('vertical'),
                    placedMove.row + 1,
                    placedMove.col + 1,
                  )}
                </Text>
                <Text style={[styles.wordfeudHandoffHint, { color: colors.mutedForeground }]}>
                  {t('wordfeudHandoffHint')}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void openWordfeud(placedMove)}
              style={({ pressed }) => [
                styles.openWordfeudButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.76 : 1 },
              ]}
            >
              <Ionicons name="open-outline" size={18} color={colors.primaryForeground} />
              <Text style={[styles.openWordfeudButtonText, { color: colors.primaryForeground }]}>
                {t('openWordfeud', placedMove.word)}
              </Text>
            </Pressable>
          </View>
        )}

        {results.length > 0 ? (
          <View style={[styles.resultsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {results.map((move, index) => (
              <MoveRow
                key={`${move.word}-${move.row}-${move.col}-${move.direction}`}
                move={move}
                rank={index + 1}
                colors={colors}
                t={t}
                selected={selectedMove === move}
                onPress={() => void handleApplyMove(move)}
                taalTikCheck={taalTikCheck}
                onCheckMove={() => void handleCheckMove(move)}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyResults, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Ionicons name="trophy-outline" size={21} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('crossCheckTitle')}</Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>
              {t('crossCheckCopy')}
            </Text>
          </View>
        )}

        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{t('positionsStayLocal')}</Text>
        </View>
      </ScrollView>
      <RewardCelebration
        moment={rewardMoment}
        enabled={feedbackSettings.visualEffects}
        colors={colors}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center', height: 34 },
  logoTile: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  logoTileLetter: { fontSize: 18, lineHeight: 21, fontFamily: 'Inter_700Bold' },
  logoTileScore: { position: 'absolute', top: 3, right: 4, fontSize: 8, lineHeight: 9, fontFamily: 'Inter_700Bold' },
  logoText: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginLeft: 8 },
  iconButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 24, marginBottom: 14 },
  eyebrow: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.4, marginBottom: 7 },
  title: { fontSize: 28, lineHeight: 33, fontFamily: 'Inter_700Bold', letterSpacing: -1.2 },
  subtitle: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', marginTop: 7, maxWidth: 330 },
  languageRow: { borderRadius: 12, minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  languageLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  languageDot: { width: 8, height: 8, borderRadius: 4 },
  languageText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  activeText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  soonPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
  soonText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  positionActions: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1, marginLeft: 10 },
  sectionKicker: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  sectionTitle: { fontSize: 22, lineHeight: 27, fontFamily: 'Inter_700Bold', letterSpacing: -0.6, marginTop: 4, flexShrink: 1 },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: 2 },
  textButtonLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  clearButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
  clearButtonText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  scanButton: { minHeight: 66, borderRadius: 16, marginBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  scanButtonCopy: { flex: 1 },
  scanButtonTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  scanButtonHint: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 3, opacity: 0.82 },
  scanError: { borderRadius: 13, borderWidth: 1, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  scanErrorText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  boardCard: { borderRadius: 18, borderWidth: 1, padding: 10 },
  boardCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  boardStatus: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  boardStatusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  editButton: { borderRadius: 9, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  editButtonText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  board: { borderWidth: 1, borderRadius: 9, overflow: 'hidden', aspectRatio: 1 },
  boardRow: { flex: 1, flexDirection: 'row' },
  boardCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  boardLetter: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  premiumText: { fontSize: 6.5, fontFamily: 'Inter_700Bold' },
  editorRow: { marginTop: 12, borderRadius: 13, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorCopy: { flex: 1, paddingRight: 10 },
  editorLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  editorHint: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 3 },
  cellInput: { width: 37, height: 37, borderRadius: 9, borderWidth: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Inter_700Bold' },
  screenshotRow: { borderTopWidth: 1, marginTop: 14, paddingTop: 14, flexDirection: 'row', alignItems: 'center' },
  screenshotThumb: { width: 39, height: 54, borderRadius: 7 },
  screenshotCopy: { flex: 1, marginHorizontal: 10 },
  screenshotTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  screenshotHint: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 3, lineHeight: 14 },
  rackCard: { borderRadius: 22, padding: 17, marginTop: 26 },
  rackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  rackKicker: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.6 },
  rackTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: -0.4, marginTop: 5 },
  rackCount: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  rackCountText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  rackInput: { height: 56, borderRadius: 13, borderWidth: 1, paddingHorizontal: 15, fontSize: 25, fontFamily: 'Inter_700Bold', letterSpacing: 7 },
  rackHint: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 9 },
  solveButton: { minHeight: 56, borderRadius: 16, marginTop: 12, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 10 },
  solveButtonText: { flex: 1, fontSize: 14, fontFamily: 'Inter_700Bold' },
  resultsHeader: { paddingTop: 34, paddingBottom: 13, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', borderBottomWidth: 1 },
  resultsTitleColumn: { flex: 1, minWidth: 0, paddingRight: 12 },
  placedBanner: { borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  placedBannerText: { flex: 1, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  wordfeudHandoff: { borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 10, gap: 13 },
  wordfeudHandoffHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  wordfeudHandoffIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wordfeudHandoffCopy: { flex: 1, minWidth: 0 },
  wordfeudHandoffKicker: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.25 },
  wordfeudHandoffPosition: { fontSize: 15, lineHeight: 21, fontFamily: 'Inter_700Bold', marginTop: 4 },
  wordfeudHandoffHint: { fontSize: 10, lineHeight: 14, fontFamily: 'Inter_400Regular', marginTop: 3 },
  openWordfeudButton: { minHeight: 48, borderRadius: 13, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  openWordfeudButtonText: { flexShrink: 1, textAlign: 'center', fontSize: 12, lineHeight: 16, fontFamily: 'Inter_700Bold' },
  resultCount: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  resultCountText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  resultsCard: { borderRadius: 16, borderWidth: 1, marginTop: 12, overflow: 'hidden' },
  moveRow: { minHeight: 58, paddingVertical: 9, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  moveRowLast: { borderBottomWidth: 0 },
  rankColumn: { width: 24, alignItems: 'flex-start' },
  rankText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  moveBody: { flex: 1 },
  moveTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moveWord: { fontSize: 19, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  moveScoreGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginRight: 7 },
  moveScore: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  movePoints: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  moveMeta: { fontSize: 9, fontFamily: 'Inter_500Medium', marginTop: 3, opacity: 0.85 },
  crossSummary: { fontSize: 9, fontFamily: 'Inter_500Medium', marginTop: 3, opacity: 0.85 },
  taalTikAction: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  taalTikActionText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  taalTikStatus: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  taalTikStatusText: { flex: 1, fontSize: 10, lineHeight: 14, fontFamily: 'Inter_600SemiBold' },
  taalTikSource: { fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 5, opacity: 0.75 },
  emptyResults: { borderRadius: 18, borderWidth: 1, padding: 22, marginTop: 12, alignItems: 'center' },
  emptyIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptyCopy: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 6, maxWidth: 260 },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 21 },
  footerText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  rewardOverlay: { ...StyleSheet.absoluteFill, zIndex: 30, alignItems: 'center' },
  rewardParticle: { position: 'absolute', borderRadius: 3 },
  rewardCard: { position: 'absolute', top: '17%', minWidth: 238, maxWidth: 310, borderRadius: 24, borderWidth: 2, paddingHorizontal: 24, paddingTop: 31, paddingBottom: 20, alignItems: 'center' },
  rewardBadge: { position: 'absolute', top: -22, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 4 },
  rewardLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.3, textTransform: 'uppercase' },
  rewardWord: { fontSize: 31, lineHeight: 36, fontFamily: 'Inter_700Bold', letterSpacing: 1.2, marginTop: 4 },
  rewardScore: { fontSize: 17, fontFamily: 'Inter_700Bold', marginTop: 3 },
  newBestPill: { marginTop: 12, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  newBestText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
});