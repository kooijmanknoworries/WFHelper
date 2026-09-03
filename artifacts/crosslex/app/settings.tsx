import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === 'web' ? 67 : Math.max(insets.top, 16),
          paddingBottom: Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 24),
        },
      ]}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={18} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Back to solver</Text>
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>CROSSLEX</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Fine-tune the helper as more languages and game modes arrive.
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="language-outline" size={19} color={colors.primary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>Dictionary</Text>
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>Nederlands · starter list</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="calculator-outline" size={19} color={colors.primary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>Scoring rules</Text>
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>Wordfeud board multipliers</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        </View>
      </View>
      <View style={[styles.infoBox, { backgroundColor: colors.muted }]}>
        <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          CrossLex is designed around the words that touch. A future release will add full dictionary packs and camera-assisted recognition.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 36 },
  backText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  kicker: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.6 },
  title: { fontSize: 34, fontFamily: 'Inter_700Bold', letterSpacing: -1.4, marginTop: 8 },
  subtitle: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular', marginTop: 10, maxWidth: 310 },
  card: { borderRadius: 19, borderWidth: 1, paddingHorizontal: 15, marginTop: 28 },
  row: { minHeight: 78, flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, marginLeft: 12 },
  rowTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  rowSubtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
  divider: { height: 1 },
  infoBox: { borderRadius: 17, padding: 17, flexDirection: 'row', gap: 11, marginTop: 14 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
});