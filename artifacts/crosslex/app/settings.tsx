import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
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
        <Text style={[styles.backText, { color: colors.foreground }]}>{t('backToSolver')}</Text>
      </Pressable>
      <Text style={[styles.kicker, { color: colors.primary }]}>WORDFEUD HELPER</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{t('settings')}</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {t('settingsSubtitle')}
      </Text>
      <View style={[styles.languageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.languageCardHeader}>
          <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="language-outline" size={19} color={colors.primary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t('appLanguage')}</Text>
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
              {t('appLanguageSubtitle')}
            </Text>
          </View>
        </View>
        <View style={[styles.languageOptions, { backgroundColor: colors.secondary }]}>
          {([
            ['nl', t('dutch')],
            ['en', t('english')],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => void setLanguage(value)}
              style={[
                styles.languageOption,
                { backgroundColor: language === value ? colors.primary : 'transparent' },
              ]}
            >
              <Text
                style={[
                  styles.languageOptionText,
                  { color: language === value ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {label}
              </Text>
              {language === value && (
                <Ionicons name="checkmark" size={15} color={colors.primaryForeground} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="language-outline" size={19} color={colors.primary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t('dictionary')}</Text>
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>{t('starterList')}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="calculator-outline" size={19} color={colors.primary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t('scoringRules')}</Text>
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>{t('wordfeudMultipliers')}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        </View>
      </View>
      <View style={[styles.infoBox, { backgroundColor: colors.muted }]}>
        <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          {t('scanInfo')}
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
  languageCard: { borderRadius: 19, borderWidth: 1, padding: 15, marginTop: 24 },
  languageCardHeader: { flexDirection: 'row', alignItems: 'center' },
  languageOptions: { borderRadius: 12, padding: 3, flexDirection: 'row', marginTop: 15, gap: 3 },
  languageOption: { flex: 1, minHeight: 40, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  languageOptionText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
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