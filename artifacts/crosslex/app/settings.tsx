import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import {
  checkDutchDictionaryForUpdates,
  getDutchDictionaryStatus,
  subscribeToDutchDictionary,
  type DutchDictionaryStatus,
} from '@/lib/solver';

function getDictionaryStateLabel(
  status: DutchDictionaryStatus,
  t: ReturnType<typeof useLanguage>['t'],
) {
  switch (status.updateState) {
    case 'bundled':
      return t('dictionaryStateBundled');
    case 'cached':
      return t('dictionaryStateCached');
    case 'checking':
      return t('dictionaryStateChecking');
    case 'downloading':
      return t('dictionaryStateDownloading');
    case 'up-to-date':
      return t('dictionaryStateUpToDate');
    case 'updated':
      return t('dictionaryStateUpdated');
    case 'not-configured':
      return t('dictionaryStateNotConfigured');
    case 'fallback':
      return t('dictionaryStateFallback');
  }
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();
  const [dictionaryStatus, setDictionaryStatus] = useState(getDutchDictionaryStatus);

  useEffect(() => subscribeToDutchDictionary(setDictionaryStatus), []);

  const dictionaryStateLabel = getDictionaryStateLabel(dictionaryStatus, t);
  const isChecking =
    dictionaryStatus.updateState === 'checking' ||
    dictionaryStatus.updateState === 'downloading';
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
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
              {dictionaryStatus.ready
                ? `${t('dictionaryVersion', dictionaryStatus.version)} · ${dictionaryStatus.wordCount.toLocaleString(language)} ${t('words')}`
                : dictionaryStatus.error}
            </Text>
          </View>
          <Ionicons
            name={dictionaryStatus.ready ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color={dictionaryStatus.ready ? colors.primary : colors.destructive}
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.dictionaryDetails}>
          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
            {t('dictionarySource', dictionaryStatus.source)}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              void Linking.openURL(
                'https://github.com/OpenTaal/opentaal-wordlist/blob/master/LICENSE.txt',
              )
            }
          >
            <Text style={[styles.licenseLink, { color: colors.primary }]}>
              {language === 'nl' ? 'OpenTaal-licentie bekijken' : 'View OpenTaal license'} ↗
            </Text>
          </Pressable>
          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
            {t('dictionaryUpdateState')}: {dictionaryStateLabel}
          </Text>
          {dictionaryStatus.lastCheckedAt && (
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {t(
                'dictionaryLastChecked',
                new Date(dictionaryStatus.lastCheckedAt).toLocaleString(language),
              )}
            </Text>
          )}
          {dictionaryStatus.error && dictionaryStatus.updateState === 'fallback' && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {t('dictionaryUpdateError', dictionaryStatus.error)}
            </Text>
          )}
          <Pressable
            disabled={isChecking}
            onPress={() => void checkDutchDictionaryForUpdates()}
            style={[
              styles.updateButton,
              { backgroundColor: isChecking ? colors.secondary : colors.primary },
            ]}
          >
            <Text
              style={[
                styles.updateButtonText,
                { color: isChecking ? colors.mutedForeground : colors.primaryForeground },
              ]}
            >
              {t('checkDictionary')}
            </Text>
          </Pressable>
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
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          {t('dictionaryDisclaimer')}
        </Text>
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
  dictionaryDetails: { paddingVertical: 14, gap: 5 },
  detailText: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular' },
  licenseLink: { fontSize: 11, lineHeight: 18, fontFamily: 'Inter_600SemiBold' },
  errorText: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium', marginTop: 2 },
  updateButton: { minHeight: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  updateButtonText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  infoBox: { borderRadius: 17, padding: 17, flexDirection: 'row', gap: 11, marginTop: 14 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
});