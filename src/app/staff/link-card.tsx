import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, View } from 'react-native';
import { KioskApiError } from '../../api/client';
import { linkCard, searchPatients, type StaffPatient } from '../../api/staff';
import { useCardTap } from '../../card/useCardTap';
import { strings } from '../../i18n/strings';
import { feedback } from '../../motion/feedback';
import { PressableScale } from '../../motion/Pressable';
import { Notice, StaffField } from '../../staff/fields';
import { StaffCard, StaffFrame } from '../../staff/StaffFrame';
import { useStaffSession } from '../../staff/useStaffSession';
import { useKioskApp } from '../../store/useKioskApp';
import { colors, fonts, radii, spacing, typography } from '../../theme/tokens';
import { Button } from '../../ui/Button';

const SEARCH_DELAY_MS = 350;
const last4 = (cardId: string): string => cardId.slice(-4);

export default function LinkCardScreen() {
  const apiUrl = useKioskApp((s) => s.address);
  const token = useStaffSession((s) => s.token);
  const touch = useStaffSession((s) => s.touch);
  const end = useStaffSession((s) => s.end);

  const [cardId, setCardId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<StaffPatient[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [picked, setPicked] = useState<StaffPatient | null>(null);
  const [linking, setLinking] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const searchRun = useRef(0);

  const onCard = useCallback((id: string) => {
    feedback.success();
    setCardId(id);
    setConflict(null);
    setError(null);
    setDone(null);
  }, []);
  /** Results and errors belong to what is typed now. */
  const searchActive = q.trim().length >= 2;
  const reader = useCardTap(onCard, !linking);

  // Search as staff type (after a short pause); only the newest answer is shown.
  useEffect(() => {
    const text = q.trim();
    const run = ++searchRun.current;
    if (text.length < 2 || !token) return;
    const timer = setTimeout(() => {
      setSearching(true);
      searchPatients(apiUrl, token, text).then(
        (list) => {
          if (run !== searchRun.current) return;
          setResults(list);
          setSearchError(null);
          setSearching(false);
        },
        (err: unknown) => {
          if (run !== searchRun.current) return;
          setSearching(false);
          if (err instanceof KioskApiError && err.code === 'UNAUTHORIZED') {
            end();
            return;
          }
          setSearchError(err instanceof KioskApiError ? err.message : strings.errors.generic);
        },
      );
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [q, token, apiUrl, end]);

  async function link(reassign: boolean) {
    if (!cardId || !picked || !token) return;
    touch();
    setLinking(true);
    setError(null);
    try {
      await linkCard(apiUrl, token, cardId, picked.uhid, reassign);
      feedback.success();
      setDone(strings.staff.link.linked(last4(cardId), picked.name, picked.uhid));
      setCardId(null);
      setPicked(null);
      setConflict(null);
      setQ('');
      Keyboard.dismiss();
    } catch (err) {
      feedback.error();
      if (err instanceof KioskApiError && err.code === 'CARD_LINKED_ELSEWHERE') setConflict(err.message);
      else if (err instanceof KioskApiError && err.code === 'UNAUTHORIZED') end();
      else setError(err instanceof KioskApiError ? err.message : strings.errors.generic);
    } finally {
      setLinking(false);
    }
  }

  return (
    <StaffFrame title={strings.staff.link.title} onBack={() => router.back()}>
      {reader}
      {done ? <Notice tone="ok">{done}</Notice> : null}

      <StaffCard>
        {cardId ? (
          <View>
            <Text style={styles.cardRead}>{strings.staff.link.cardRead(last4(cardId))}</Text>
            <Text style={styles.hint}>{strings.staff.link.readAgain}</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.cardRead}>{strings.staff.link.tapNow}</Text>
            <Text style={styles.hint}>{strings.staff.link.tapHint}</Text>
          </View>
        )}
      </StaffCard>

      <StaffCard>
        <StaffField
          label={strings.staff.link.searchLabel}
          placeholder={strings.staff.link.searchPlaceholder}
          value={q}
          onChangeText={(text) => {
            setQ(text);
            setPicked(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {searching && searchActive ? <ActivityIndicator color={colors.primary} /> : null}
        {searchError && searchActive ? <Notice tone="error">{searchError}</Notice> : null}
        {searchActive && results && !searching && results.length === 0 ? <Text style={styles.hint}>{strings.staff.link.none}</Text> : null}
        {(searchActive ? results : null)?.map((p) => {
          const on = picked?.uhid === p.uhid;
          return (
            <PressableScale
              key={p.uhid}
              onPress={() => {
                touch();
                // The search box lets go, so the next card goes to the reader and not into the query.
                Keyboard.dismiss();
                setPicked(p);
                setConflict(null);
              }}
              accessibilityState={{ selected: on }}
              style={[styles.row, on && styles.rowOn]}
            >
              <Text style={styles.rowName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {[p.uhid, [p.age, p.gender].filter((x) => x !== undefined && x !== '').join(' / '), p.phone].filter(Boolean).join('  -  ')}
              </Text>
            </PressableScale>
          );
        })}
      </StaffCard>

      {conflict ? (
        <StaffCard>
          <Notice tone="error">{conflict}</Notice>
          <Text style={styles.hint}>{strings.staff.link.moveBody}</Text>
          <Button label={strings.staff.link.move} variant="secondary" icon="swap-horizontal" disabled={!cardId || !picked} loading={linking} onPress={() => void link(true)} />
        </StaffCard>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Text style={styles.hint}>{strings.staff.link.pick}</Text>
      <Button
        label={linking ? strings.staff.link.linking : strings.staff.link.link}
        icon="link-variant"
        disabled={!cardId || !picked}
        loading={linking}
        onPress={() => void link(false)}
      />
    </StaffFrame>
  );
}

const styles = StyleSheet.create({
  cardRead: { ...typography.headline, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary },
  row: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background, gap: 2, minHeight: 64, justifyContent: 'center' },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  rowName: { fontFamily: fonts.semibold, fontSize: 20, color: colors.textPrimary },
  rowMeta: { ...typography.caption, color: colors.textSecondary },
});
