import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../i18n/strings';
import { Enter } from '../motion/Enter';
import { PressableScale } from '../motion/Pressable';
import { colors, fonts, radii, spacing, typography } from '../theme/tokens';
import { useLayout } from '../ui/useLayout';
import { staffSizes } from './staffSizing';
import { useStaffGuard } from './useStaffGuard';
import { useStaffSession } from './useStaffSession';

interface StaffFrameProps {
  title: string;
  children: ReactNode;
  /** Signed-in screens need a session; the sign-in screen itself does not. */
  requireSession?: boolean;
  /** Shows a back arrow to the menu (or wherever `onBack` goes). */
  onBack?: () => void;
  /** False when the content brings its own scrolling (the connect form). */
  scroll?: boolean;
}

/**
 * The frame of every staff screen: title, who is signed in, the sign-out countdown. Any touch
 * inside it keeps the session alive (typing on the system keyboard calls `touchStaff`).
 */
export function StaffFrame({ title, children, requireSession = true, onBack, scroll = true }: StaffFrameProps) {
  const seconds = useStaffGuard(requireSession);
  const user = useStaffSession((s) => s.user);
  const touch = useStaffSession((s) => s.touch);
  const layout = useLayout();
  const sizes = staffSizes(layout);
  const insets = useSafeAreaInsets();
  const sideLeft = layout.gutter + insets.left;
  const sideRight = layout.gutter + insets.right;
  const who = user ? (
    <Text style={[styles.who, sizes.stackBar ? styles.whoStacked : { maxWidth: sizes.whoMax }]} numberOfLines={1}>
      {strings.staff.signedInAs(user.name, user.role)}
    </Text>
  ) : null;

  return (
    <View style={styles.screen} onTouchStart={touch}>
      <View style={[styles.bar, { paddingLeft: sideLeft, paddingRight: sideRight, paddingVertical: layout.short ? spacing.xs : spacing.sm }]}>
        <View style={styles.barRow}>
          {onBack ? (
            <PressableScale onPress={onBack} accessibilityLabel={strings.staff.back} style={[styles.back, { width: sizes.controlHeight, height: sizes.controlHeight }]}>
              <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primaryDark} />
            </PressableScale>
          ) : null}
          <Text style={[styles.title, sizes.stackBar && styles.titleCompact]} accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
          {sizes.stackBar ? null : who}
          <Text style={[styles.clock, seconds <= 20 && styles.clockLow]}>{strings.staff.sessionLeft(seconds)}</Text>
        </View>
        {sizes.stackBar ? who : null}
      </View>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingLeft: sideLeft, paddingRight: sideRight, paddingTop: sizes.bodyPadY, paddingBottom: sizes.bodyPadY + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Enter style={[styles.inner, { maxWidth: sizes.innerMax }]}>{children}</Enter>
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );
}

/** A card on a staff screen. */
export function StaffCard({ children, style }: { children: ReactNode; style?: object }) {
  const { cardPadding } = staffSizes(useLayout());
  return <View style={[styles.card, { padding: cardPadding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: {
    minHeight: 72,
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  title: { ...typography.headline, color: colors.textPrimary, flex: 1 },
  who: { ...typography.caption, color: colors.textSecondary },
  whoStacked: { alignSelf: 'stretch' },
  titleCompact: { fontSize: 22, lineHeight: 28 },
  clock: { ...typography.caption, color: colors.textTertiary, fontVariant: ['tabular-nums'] },
  clockLow: { color: colors.dangerStrong, fontFamily: fonts.semibold },
  body: { flexGrow: 1, alignItems: 'center' },
  inner: { width: '100%', gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
});
