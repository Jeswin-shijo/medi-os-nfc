import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { KioskApiError } from '../api/client';
import type { KioskDepartment } from '../api/types';
import { useFlow } from '../flow/useFlow';
import { useRequestGuard } from '../flow/useRequestGuard';
import { strings } from '../i18n/strings';
import { Enter } from '../motion/Enter';
import { useKioskApp } from '../store/useKioskApp';
import { withAlpha } from '../theme/color';
import { colors, radii, shadows, sizes, spacing, typography } from '../theme/tokens';
import { BigTile } from '../ui/BigTile';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { StatusPanel } from '../ui/StatusPanel';
import { StepTitle } from '../ui/StepTitle';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const MAX_CONTENT_WIDTH = 1480;
const GAP = spacing.lg;
/** Three across at 1280 dp, four on the big tablet. */
const WIDE_SCREEN = 1600;
const SKELETON_COUNT = 6;

/** The icon names come from the server: anything this build does not know falls back to a plain medical symbol. */
const iconFor = (name: string): MaterialIconName => (name in MaterialIcons.glyphMap ? (name as MaterialIconName) : 'medical-services');

/** Step 3: which department? Fresh doctor counts every time the screen opens. */
export default function Department() {
  const api = useKioskApp((s) => s.api);
  const session = useFlow((s) => s.session);
  const { width } = useWindowDimensions();
  const begin = useRequestGuard();
  const loadSeq = useRef(0);
  const loaded = useRef(false);
  const [departments, setDepartments] = useState<KioskDepartment[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    const mine = ++loadSeq.current;
    const stale = begin();
    setFailed(null);
    try {
      const list = await api.departments();
      if (stale() || mine !== loadSeq.current) return;
      loaded.current = true;
      setDepartments(list);
    } catch (err) {
      // A removed kiosk key has already sent the kiosk to its setup screen.
      if (stale() || mine !== loadSeq.current || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
      // Counts already on screen stay: a failed refresh is not worth blanking the grid for.
      if (!loaded.current) setFailed(err instanceof Error && err.message ? err.message : strings.department.loadFailed);
    }
  }, [api, begin]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!session) return <Redirect href="/" />;

  const columns = width >= WIDE_SCREEN ? 4 : 3;
  const content = Math.min(width, MAX_CONTENT_WIDTH) - 2 * sizes.screenGutter;
  const tileWidth = Math.floor((content - GAP * (columns - 1)) / columns);

  const choose = (department: KioskDepartment) => {
    useFlow.getState().setDepartment(department);
    router.push('/doctor');
  };

  return (
    <View style={styles.screen}>
      <StepTitle title={strings.department.title} subtitle={strings.department.subtitle} />

      {failed ? (
        <StatusPanel state="error" message={failed} onRetry={() => void load()} />
      ) : departments === null ? (
        <View style={styles.grid} accessibilityRole="progressbar" accessibilityLabel={strings.status.loading}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <Skeleton key={i} style={[styles.skeleton, { width: tileWidth }]} />
          ))}
        </View>
      ) : departments.length === 0 ? (
        <Enter style={styles.empty}>
          <Text style={styles.emptyText}>{strings.department.empty}</Text>
        </Enter>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {departments.map((department, i) => (
            <Enter key={department.code} index={i} style={{ width: tileWidth }}>
              <BigTile
                title={department.name}
                subtitle={strings.department.doctors(department.doctorCount)}
                art={<DepartmentIcon icon={iconFor(department.icon)} color={department.color} />}
                color={department.color}
                disabled={department.doctorCount === 0}
                onPress={() => choose(department)}
                style={styles.tile}
              />
            </Enter>
          ))}
        </ScrollView>
      )}

      <Enter index={2} style={styles.actions}>
        <Button label={strings.department.back} variant="quiet" icon="arrow-left" onPress={() => router.back()} />
      </Enter>
    </View>
  );
}

/** The department's own icon in a soft badge of its colour (the colour tints the glyph and washes the square). */
function DepartmentIcon({ icon, color }: { icon: MaterialIconName; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.12) }]} importantForAccessibility="no-hide-descendants">
      <MaterialIcons name={icon} size={46} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: sizes.screenGutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  scroll: { flex: 1, overflow: 'visible' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingBottom: spacing.md },
  tile: { minHeight: 188 },
  skeleton: { height: 188, borderRadius: radii.lg },
  badge: { width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, boxShadow: shadows.card },
  emptyText: { ...typography.bodyLarge, color: colors.textSecondary, textAlign: 'center', maxWidth: 640 },
  actions: { flexDirection: 'row', justifyContent: 'flex-start' },
});
