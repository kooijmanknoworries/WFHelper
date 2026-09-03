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
import { useColors } from '@/hooks/useColors';
import {
  BOARD_SIZE,
  Board,
  createEmptyBoard,
  createSampleBoard,
  findBestMoves,
  Move,
} from '@/lib/solver';

const STORAGE_KEY = '@crosslex/position';

function LogoMark({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.logoRow}>
      <View style={[styles.logoTile, { backgroundColor: colors.primary }]}>
        <View style={[styles.logoTileLine, { backgroundColor: colors.primaryForeground }]} />
      </View>
      <View style={[styles.logoTile, styles.logoTileOffset, { backgroundColor: colors.accent }]}>
        <View style={[styles.logoTileLine, { backgroundColor: colors.accentForeground }]} />
      </View>
      <Text style={[styles.logoText, { color: colors.foreground }]}>crosslex</Text>
    </View>
  );
}

function BoardPreview({
  board,
  selectedCell,
  editing,
  onSelect,
  colors,
}: {
  board: Board;
  selectedCell: { row: number; col: number } | null;
  editing: boolean;
  onSelect: (row: number, col: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.board, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
      {board.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.boardRow}>
          {row.map((letter, colIndex) => {
            const isSelected =
              selectedCell?.row === rowIndex && selectedCell.col === colIndex;
            const premium =
              rowIndex === 7 && colIndex === 7
                ? '★'
                : rowIndex === colIndex || rowIndex + colIndex === 14
                  ? '2'
                  : '';
            return (
              <Pressable
                key={`cell-${rowIndex}-${colIndex}`}
                testID={`board-cell-${rowIndex}-${colIndex}`}
                onPress={() => editing && onSelect(rowIndex, colIndex)}
                style={({ pressed }) => [
                  styles.boardCell,
                  {
                    backgroundColor: letter
                      ? colors.card
                      : premium === '★'
                        ? colors.accent
                        : colors.muted,
                    borderColor: colors.border,
                    opacity: pressed && editing ? 0.7 : 1,
                  },
                  isSelected && { borderColor: colors.primary, borderWidth: 2 },
                ]}
              >
                {letter ? (
                  <Text style={[styles.boardLetter, { color: colors.foreground }]}>
                    {letter}
                  </Text>
                ) : (
                  <Text style={[styles.premiumText, { color: colors.mutedForeground }]}>
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
}: {
  move: Move;
  rank: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.moveRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.rankBubble, { backgroundColor: rank === 1 ? colors.primary : colors.secondary }]}>
        <Text style={[styles.rankText, { color: rank === 1 ? colors.primaryForeground : colors.foreground }]}>
          {rank}
        </Text>
      </View>
      <View style={styles.moveBody}>
        <View style={styles.moveTitleRow}>
          <Text style={[styles.moveWord, { color: colors.foreground }]}>{move.word}</Text>
          <Text style={[styles.moveScore, { color: colors.primary }]}>+{move.score}</Text>
        </View>
        <Text style={[styles.moveMeta, { color: colors.mutedForeground }]}>
          {move.direction === 'H' ? 'Horizontal' : 'Vertical'} · row {move.row + 1}, col {move.col + 1} · {move.tilesUsed} new {move.tilesUsed === 1 ? 'tile' : 'tiles'}
        </Text>
        {move.crossWords.length > 0 && (
          <View style={styles.crossRow}>
            <Text style={[styles.crossLabel, { color: colors.mutedForeground }]}>CROSS</Text>
            {move.crossWords.slice(0, 3).map((crossWord) => (
              <View key={crossWord} style={[styles.crossChip, { backgroundColor: colors.accent }]}>
                <Text style={[styles.crossChipText, { color: colors.accentForeground }]}>{crossWord}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [board, setBoard] = useState<Board>(createSampleBoard);
  const [rack, setRack] = useState('AARTE?');
  const [editingBoard, setEditingBoard] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [results, setResults] = useState<Move[]>([]);
  const [isSolving, setIsSolving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);

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
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled) {
        setScreenshotUri(result.assets[0]?.uri ?? null);
        setEditingBoard(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleSolve = async () => {
    setIsSolving(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise((resolve) => setTimeout(resolve, 180));
    const nextResults = findBestMoves(board, rack);
    setResults(nextResults);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ board, rack }));
    setIsSolving(false);
  };

  const loadDemo = () => {
    setBoard(createSampleBoard());
    setRack('AARTE?');
    setScreenshotUri(null);
    setResults([]);
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
          <Text style={[styles.eyebrow, { color: colors.primary }]}>DUTCH WORD ENGINE · BETA</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Play the best{'\n'}move.</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Read every crossing word before you place a tile.
          </Text>
        </View>

        <View style={[styles.languageRow, { backgroundColor: colors.secondary }]}>
          <View style={styles.languageLeft}>
            <View style={[styles.languageDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.languageText, { color: colors.foreground }]}>Nederlands</Text>
            <Text style={[styles.activeText, { color: colors.mutedForeground }]}>active</Text>
          </View>
          <View style={[styles.soonPill, { backgroundColor: colors.card }]}>
            <Ionicons name="globe-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.soonText, { color: colors.mutedForeground }]}>more languages soon</Text>
          </View>
        </View>

        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <View>
            <Text style={[styles.sectionKicker, { color: colors.mutedForeground }]}>POSITION</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your board</Text>
          </View>
          <Pressable
            testID="demo-position-button"
            onPress={loadDemo}
            style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={[styles.textButtonLabel, { color: colors.primary }]}>demo position</Text>
          </Pressable>
        </View>

        <View style={[styles.boardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.boardCardTop}>
            <View style={styles.boardStatus}>
              <Ionicons name="grid-outline" size={16} color={colors.primary} />
              <Text style={[styles.boardStatusText, { color: colors.foreground }]}>
                {lettersOnBoard} tiles on board
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
                {editingBoard ? 'done' : 'edit'}
              </Text>
            </Pressable>
          </View>

          <BoardPreview
            board={board}
            selectedCell={selectedCell}
            editing={editingBoard}
            onSelect={(row, col) => setSelectedCell({ row, col })}
            colors={colors}
          />

          {editingBoard && (
            <View style={[styles.editorRow, { backgroundColor: colors.secondary }]}>
              <View style={styles.editorCopy}>
                <Text style={[styles.editorLabel, { color: colors.foreground }]}>Tap a square, then enter its tile</Text>
                <Text style={[styles.editorHint, { color: colors.mutedForeground }]}>Leave it empty to clear the square.</Text>
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
                <Text style={[styles.screenshotTitle, { color: colors.foreground }]}>Screenshot imported</Text>
                <Text style={[styles.screenshotHint, { color: colors.mutedForeground }]}>Check the board above and correct any tiles.</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </View>
          )}
        </View>

        <Pressable
          testID="import-screenshot-button"
          onPress={handleImport}
          disabled={isImporting}
          style={({ pressed }) => [styles.importButton, { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed || isImporting ? 0.65 : 1 }]}
        >
          {isImporting ? <ActivityIndicator color={colors.primary} size="small" /> : <Ionicons name="image-outline" size={18} color={colors.primary} />}
          <Text style={[styles.importButtonText, { color: colors.foreground }]}>
            {isImporting ? 'Opening photos…' : 'Import a board screenshot'}
          </Text>
          <Ionicons name="arrow-forward" size={17} color={colors.mutedForeground} />
        </Pressable>

        <View style={[styles.rackCard, { backgroundColor: colors.foreground }]}>
          <View style={styles.rackHeader}>
            <View>
              <Text style={[styles.rackKicker, { color: colors.accent }]}>YOUR RACK</Text>
              <Text style={[styles.rackTitle, { color: colors.card }]}>What tiles do you have?</Text>
            </View>
            <View style={[styles.rackCount, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.rackCountText, { color: colors.foreground }]}>{rack.replace(/[^A-Z?]/gi, '').length}/7</Text>
            </View>
          </View>
          <TextInput
            testID="rack-input"
            value={rack}
            onChangeText={(value) => setRack(value.toUpperCase().replace(/[^A-Z?]/g, '').slice(0, 7))}
            placeholder="e.g. AARTE?"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            style={[styles.rackInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          />
          <Text style={[styles.rackHint, { color: '#b7c3c1' }]}>Use ? for a blank tile.</Text>
        </View>

        <Pressable
          testID="solve-button"
          onPress={handleSolve}
          disabled={isSolving || rack.length < 2}
          style={({ pressed }) => [styles.solveButton, { backgroundColor: colors.primary, opacity: pressed || isSolving || rack.length < 2 ? 0.7 : 1 }]}
        >
          {isSolving ? <ActivityIndicator color={colors.primaryForeground} /> : <Ionicons name="sparkles-outline" size={19} color={colors.primaryForeground} />}
          <Text style={[styles.solveButtonText, { color: colors.primaryForeground }]}>
            {isSolving ? 'Finding legal moves…' : 'Find best moves'}
          </Text>
          {!isSolving && <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />}
        </Pressable>

        <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.sectionKicker, { color: colors.mutedForeground }]}>RESULTS</Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {results.length > 0 ? 'Best legal moves' : 'Ready when you are'}
            </Text>
          </View>
          {results.length > 0 && (
            <View style={[styles.resultCount, { backgroundColor: colors.accent }]}>
              <Text style={[styles.resultCountText, { color: colors.accentForeground }]}>{results.length} found</Text>
            </View>
          )}
        </View>

        {results.length > 0 ? (
          <View style={[styles.resultsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {results.map((move, index) => (
              <MoveRow key={`${move.word}-${move.row}-${move.col}-${move.direction}`} move={move} rank={index + 1} colors={colors} />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyResults, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Ionicons name="trophy-outline" size={21} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Cross-check every word</Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>
              CrossLex will only show moves whose side words also exist in the Dutch list.
            </Text>
          </View>
        )}

        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Your positions stay on this device in this preview.</Text>
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
  logoTile: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  logoTileOffset: { marginLeft: -7, transform: [{ rotate: '12deg' }] },
  logoTileLine: { width: 10, height: 2, borderRadius: 2, transform: [{ rotate: '-45deg' }] },
  logoText: { fontSize: 19, fontFamily: 'Inter_700Bold', letterSpacing: -0.8, marginLeft: 8 },
  iconButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 38, marginBottom: 22 },
  eyebrow: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.6, marginBottom: 12 },
  title: { fontSize: 42, lineHeight: 44, fontFamily: 'Inter_700Bold', letterSpacing: -2 },
  subtitle: { fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular', marginTop: 14, maxWidth: 285 },
  languageRow: { borderRadius: 14, minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  languageLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  languageDot: { width: 8, height: 8, borderRadius: 4 },
  languageText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  activeText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  soonPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
  soonText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  sectionKicker: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  sectionTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.6, marginTop: 4 },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: 2 },
  textButtonLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  boardCard: { borderRadius: 22, borderWidth: 1, padding: 14 },
  boardCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  boardStatus: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  boardStatusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  editButton: { borderRadius: 9, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  editButtonText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  board: { borderWidth: 1, borderRadius: 9, overflow: 'hidden', aspectRatio: 1 },
  boardRow: { flex: 1, flexDirection: 'row' },
  boardCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  boardLetter: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  premiumText: { fontSize: 7, fontFamily: 'Inter_600SemiBold' },
  editorRow: { marginTop: 12, borderRadius: 13, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorCopy: { flex: 1, paddingRight: 10 },
  editorLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  editorHint: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 3 },
  cellInput: { width: 37, height: 37, borderRadius: 9, borderWidth: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Inter_700Bold' },
  screenshotRow: { borderTopWidth: 1, marginTop: 14, paddingTop: 14, flexDirection: 'row', alignItems: 'center' },
  screenshotThumb: { width: 39, height: 54, borderRadius: 7, backgroundColor: '#e5edef' },
  screenshotCopy: { flex: 1, marginHorizontal: 10 },
  screenshotTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  screenshotHint: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 3, lineHeight: 14 },
  importButton: { minHeight: 52, borderRadius: 15, borderWidth: 1, marginTop: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  importButtonText: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
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
  resultsHeader: { paddingTop: 34, paddingBottom: 13, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderBottomWidth: 1 },
  resultCount: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  resultCountText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  resultsCard: { borderRadius: 18, borderWidth: 1, marginTop: 12, paddingHorizontal: 13 },
  moveRow: { minHeight: 86, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  moveRowLast: { borderBottomWidth: 0 },
  rankBubble: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  rankText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  moveBody: { flex: 1 },
  moveTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moveWord: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  moveScore: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  moveMeta: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
  crossRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  crossLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  crossChip: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3 },
  crossChipText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  emptyResults: { borderRadius: 18, borderWidth: 1, padding: 22, marginTop: 12, alignItems: 'center' },
  emptyIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptyCopy: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 6, maxWidth: 260 },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 21 },
  footerText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
});