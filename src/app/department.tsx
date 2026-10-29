import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KioskApiError } from '../api/client';
import type { KioskDepartment } from '../api/types';
import { useFlow } from '../flow/useFlow';
import { useRequestGuard } from '../flow/useRequestGuard';
import { strings } from '../i18n/strings';
import { Enter } from '../motion/Enter';
import { useKioskApp } from '../store/useKioskApp';
import { withAlpha } from '../theme/color';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';
import { BigTile } from '../ui/BigTile';
import { Button } from '../ui/Button';
import { departmentBadge, departmentTileHeight, gridGap, gridItemWidth, gridWidth } from '../ui/paySizing';
import { PickFrame } from '../ui/PickFrame';
import { Skeleton } from '../ui/Skeleton';
import { StatusPanel } from '../ui/StatusPanel';
import { StepTitle } from '../ui/StepTitle';
import { useLayout } from '../ui/useLayout';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const SKELETON_COUNT = 6;

/** The icon names come from the server: anything this build does not know falls back to a plain medical symbol. */
const iconFor = (name: string): MaterialIconName => (name in MaterialIcons.glyphMap ? (name as MaterialIconName) : 'medical-services');

/** Step 3: which department? Fresh doctor counts every time the screen opens. */
export default function Department() {
  const api = useKioskApp((s) => s.api);
  const session = useFlow((s) => s.session);
  const layout = useLayout();
  const insets = useSafeAreaInsets();
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

  // Phones two across, tablets three, the big tablet four.
  const columns = layout.columns('department');
  const gap = gridGap(layout);
  const tileWidth = gridItemWidth(gridWidth(layout, insets.left, insets.right), columns, gap);
  const tileHeight = departmentTileHeight(layout);

  const choose = (department: KioskDepartment) => {
    useFlow.getState().setDepartment(department);
    router.push('/doctor');
  };

  const header = <StepTitle title={strings.department.title} subtitle={strings.department.subtitle} />;
  const footer = (
    <Enter index={2} style={styles.actions}>
      <Button label={strings.department.back} variant="quiet" icon="arrow-left" onPress={() => router.back()} />
    </Enter>
  );
  const empty = layout.short ? { minHeight: 200 } : null;

  return (
    <PickFrame header={header} footer={footer} grid={!!departments && departments.length > 0 && !failed}>
      {failed ? (
        <StatusPanel state="error" message={failed} onRetry={() => void load()} style={empty} />
      ) : departments === null ? (
        <View style={[styles.grid, { gap }]} accessibilityRole="progressbar" accessibilityLabel={strings.status.loading}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <Skeleton key={i} style={[styles.skeleton, { width: tileWidth, height: tileHeight }]} />
          ))}
        </View>
      ) : departments.length === 0 ? (
        <Enter style={[styles.empty, empty]}>
          <Text style={styles.emptyText}>{strings.department.empty}</Text>
        </Enter>
      ) : (
        <View style={[styles.grid, { gap }]}>
          {departments.map((department, i) => (
            <Enter key={department.code} index={i} style={{ width: tileWidth }}>
              <BigTile
                title={department.name}
                subtitle={strings.department.doctors(department.doctorCount)}
                art={<DepartmentIcon icon={iconFor(department.icon)} color={department.color} />}
                color={department.color}
                disabled={department.doctorCount === 0}
                onPress={() => choose(department)}
                style={{ minHeight: tileHeight }}
              />
            </Enter>
          ))}
        </View>
      )}
    </PickFrame>
  );
}

/** The department's own icon in a soft badge of its colour (the colour tints the glyph and washes the square). */
function DepartmentIcon({ icon, color }: { icon: MaterialIconName; color: string }) {
  const badge = departmentBadge(useLayout());
  return (
    <View
      style={[styles.badge, { width: badge.box, height: badge.box, borderRadius: badge.radius, backgroundColor: withAlpha(color, 0.12) }]}
      importantForAccessibility="no-hide-descendants"
    >
      <MaterialIcons name={icon} size={badge.icon} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  skeleton: { borderRadius: radii.lg },
  badge: { alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, boxShadow: shadows.card },
  emptyText: { ...typography.bodyLarge, color: colors.textSecondary, textAlign: 'center', maxWidth: 640 },
  actions: { flexDirection: 'row', justifyContent: 'flex-start' },
});
