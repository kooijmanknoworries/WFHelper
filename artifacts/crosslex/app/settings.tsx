import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useFeedbackSettings } from '@/context/FeedbackSettingsContext';
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
  const { settings, isReady: feedbackSettingsReady, setEnabled } = useFeedbackSettings();
  const [dictionaryStatus, setDictionaryStatus] = useState(getDutchDictionaryStatus);

  useEffect(() => subscribeToDutchDictionary(setDictionaryStatus), []);

  const dictionaryStateLabel = getDictionaryStateLabel(dictionaryStatus, t);
  const isChecking =
    dictionaryStatus.updateState === 'checking' ||
    dictionaryStatus.updateState === 'downloading';
  const feedbackRows = [
    {
      key: 'visualEffects' as const,
      icon: 'sparkles-outline' as const,
      title: t('visualEffects'),
      subtitle: t('visualEffectsSubtitle'),
    },
    {
      key: 'soundEffects' as const,
      icon: 'volume-high-outline' as const,
      title: t('soundEffects'),
      subtitle: t('soundEffectsSubtitle'),
    },
    {
      key: 'hapticFeedback' as const,
      icon: 'phone-portrait-outline' as const,
      title: t('hapticFeedback'),
      subtitle: t('hapticFeedbackSubtitle'),
    },
  ];
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
      <Pressable
        onPress={() => (Platform.OS === 'web' ? router.replace('/') : router.back())}
        style={styles.backButton}
      >
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
      <View style={[styles.rewardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rewardHeader}>
          <View style={[styles.rewardIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name="trophy-outline" size={21} color={colors.accentForeground} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rewardTitle, { color: colors.foreground }]}>{t('feedback')}</Text>
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
              {t('feedbackSubtitle')}
            </Text>
          </View>
        </View>
        <View style={[styles.personalBest, { backgroundColor: colors.secondary }]}>
          <View>
            <Text style={[styles.bestLabel, { color: colors.mutedForeground }]}>{t('personalBest')}</Text>
            <Text style={[styles.bestScore, { color: colors.foreground }]}>
              {settings.personalBest} <Text style={styles.bestUnit}>{t('points')}</Text>
            </Text>
          </View>
          <Ionicons name="ribbon-outline" size={25} color={colors.accent} />
        </View>
        <View style={styles.feedbackRows}>
          {feedbackRows.map((row, index) => (
            <View
              key={row.key}
              style={[
                styles.feedbackRow,
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <View style={[styles.feedbackRowIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name={row.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{row.title}</Text>
                <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>{row.subtitle}</Text>
              </View>
              <Switch
                accessibilityLabel={row.title}
                accessibilityState={{ disabled: !feedbackSettingsReady, checked: settings[row.key] }}
                disabled={!feedbackSettingsReady}
                value={settings[row.key]}
                onValueChange={(value) => void setEnabled(row.key, value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.primaryForeground}
              />
            </View>
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
  rewardCard: { borderRadius: 22, borderWidth: 1, padding: 15, marginTop: 16 },
  rewardHeader: { flexDirection: 'row', alignItems: 'center' },
  rewardIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rewardTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  personalBest: { borderRadius: 15, paddingHorizontal: 15, paddingVertical: 13, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bestLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.1, textTransform: 'uppercase' },
  bestScore: { fontSize: 25, lineHeight: 30, fontFamily: 'Inter_700Bold', marginTop: 2 },
  bestUnit: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  feedbackRows: { marginTop: 8 },
  feedbackRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center' },
  feedbackRowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
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