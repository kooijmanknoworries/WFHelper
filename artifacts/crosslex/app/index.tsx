import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  scanWordfeudBoard,
  ScanBoardInputMimeType,
  type ScanBoardInputMimeType as ScanBoardMimeType,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useLanguage, type Translator } from '@/context/LanguageContext';
import {
  BOARD_SIZE,
  applyMove,
  Board,
  createEmptyBoard,
  createSampleBoard,
  findBestMoves,
  getPremiumLabel,
  Move,
} from '@/lib/solver';

const STORAGE_KEY = '@crosslex/position';
const DEVICE_ID_STORAGE_KEY = '@crosslex/device-id';
const DEVICE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let deviceIdPromise: Promise<string> | null = null;

type ScanInfo = {
  confidence: number;
  detectedBoardTiles: number;
  detectedRackTiles: number;
  warnings: string[];
};

type SuggestionSession = {
  board: Board;
  rack: string;
};

function getScanMimeType(value: string | null | undefined): ScanBoardMimeType {
  if (value === ScanBoardInputMimeType['image/png']) return value;
  if (value === ScanBoardInputMimeType['image/webp']) return value;
  return ScanBoardInputMimeType['image/jpeg'];
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
}: {
  move: Move;
  rank: number;
  colors: ReturnType<typeof useColors>;
  t: Translator;
  selected: boolean;
  onPress: () => void;
}) {
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
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

  const lettersOnBoard = useMemo(
    () => board.reduce((total, row) => total + row.filter(Boolean).length, 0),
    [board],
  );

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
        quality: 0.9,
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

      setScanInfo({
        confidence: scan.confidence,
        detectedBoardTiles,
        detectedRackTiles: scannedRack.length,
        warnings: scan.warnings,
      });
      const scannedResults =
        scannedRack.length >= 2 ? findBestMoves(scannedBoard, scannedRack) : [];
      const preview = beginSuggestionSession(scannedBoard, scannedRack, scannedResults);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ board: preview.board, rack: preview.rack }),
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setScanError(getScanErrorMessage(error, t));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSolve = async () => {
    setIsSolving(true);
    setScanError(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await new Promise((resolve) => setTimeout(resolve, 180));
      const sourceBoard = suggestionSession?.board ?? board;
      const sourceRack = suggestionSession?.rack ?? rack;
      const nextResults = findBestMoves(sourceBoard, sourceRack);
      const preview = beginSuggestionSession(sourceBoard, sourceRack, nextResults);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ board: preview.board, rack: preview.rack }),
      );
    } catch {
      setScanError(t('solverError'));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSolving(false);
    }
  };

  const handleApplyMove = async (move: Move) => {
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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      setScanError(t('solverError'));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    setEditingBoard(false);
    setSelectedCell(null);
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
          <Pressable
            testID="demo-position-button"
            onPress={loadDemo}
            style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={[styles.textButtonLabel, { color: colors.primary }]}>{t('demoPosition')}</Text>
          </Pressable>
        </View>

        <Pressable
          testID="import-screenshot-button"
          onPress={handleImport}
          disabled={isImporting}
          style={({ pressed }) => [
            styles.scanButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || isImporting ? 0.7 : 1,
            },
          ]}
        >
          {isImporting ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Ionicons name="scan-outline" size={20} color={colors.primaryForeground} />
          )}
          <View style={styles.scanButtonCopy}>
            <Text style={[styles.scanButtonTitle, { color: colors.primaryForeground }]}>
              {isImporting ? t('readingBoard') : t('scanScreenshot')}
            </Text>
            <Text style={[styles.scanButtonHint, { color: colors.primaryForeground }]}>
              {t('scanHint')}
            </Text>
          </View>
          {!isImporting && (
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
                    ? scanInfo.warnings[0] ??
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
  sectionKicker: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  sectionTitle: { fontSize: 22, lineHeight: 27, fontFamily: 'Inter_700Bold', letterSpacing: -0.6, marginTop: 4, flexShrink: 1 },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: 2 },
  textButtonLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
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
  emptyResults: { borderRadius: 18, borderWidth: 1, padding: 22, marginTop: 12, alignItems: 'center' },
  emptyIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptyCopy: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 6, maxWidth: 260 },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 21 },
  footerText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
});