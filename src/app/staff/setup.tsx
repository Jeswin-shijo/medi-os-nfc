import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { strings } from '../../i18n/strings';
import { useFeedbackSettings } from '../../motion/feedback';
import { PressableScale } from '../../motion/Pressable';
import { ConnectForm } from '../../setup/ConnectForm';
import { StaffCard, StaffFrame } from '../../staff/StaffFrame';
import { staffSizes } from '../../staff/staffSizing';
import { leaveStaffMode } from '../../staff/useStaffGuard';
import { useStaffSession } from '../../staff/useStaffSession';
import { useKioskApp } from '../../store/useKioskApp';
import { colors, fonts, radii, spacing, typography } from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { useLayout } from '../../ui/useLayout';

export default function StaffSetupScreen() {
  const address = useKioskApp((s) => s.address);
  const kioskName = useKioskApp((s) => s.config?.kioskName);
  const soundsOn = useFeedbackSettings((s) => s.soundsOn);
  const setSoundsOn = useFeedbackSettings((s) => s.setSoundsOn);
  const touch = useStaffSession((s) => s.touch);
  const [changing, setChanging] = useState(false);
  const { controlHeight } = staffSizes(useLayout());

  if (changing) {
    return (
      <StaffFrame title={strings.staff.setup.changeKeyTitle} scroll={false} onBack={() => setChanging(false)}>
        <ConnectForm title={strings.staff.setup.changeKeyTitle} intro={strings.staff.setup.changeKeyIntro} onActivity={touch} onConnected={leaveStaffMode} />
      </StaffFrame>
    );
  }

  return (
    <StaffFrame title={strings.staff.setup.title} onBack={() => router.back()}>
      <StaffCard>
        <Text style={styles.label}>{strings.staff.setup.server}</Text>
        <Text style={styles.value} selectable>{address || '-'}</Text>
        <Text style={[styles.label, styles.gapTop]}>{strings.staff.setup.kioskName}</Text>
        <Text style={styles.value}>{kioskName || strings.staff.setup.unknownName}</Text>
      </StaffCard>

      <StaffCard>
        <View style={styles.soundRow}>
          <View style={styles.soundText}>
            <Text style={styles.value}>{strings.staff.setup.sounds}</Text>
            <Text style={styles.hint}>{strings.staff.setup.soundsHint}</Text>
          </View>
          <View style={styles.radios} accessibilityRole="radiogroup">
            {([true, false] as const).map((on) => (
              <PressableScale
                key={String(on)}
                accessibilityRole="radio"
                accessibilityState={{ selected: soundsOn === on }}
                onPress={() => {
                  touch();
                  void setSoundsOn(on);
                }}
                style={[styles.radio, { minHeight: controlHeight }, soundsOn === on && styles.radioOn]}
              >
                <Text style={styles.radioText}>{on ? strings.staff.setup.soundsOn : strings.staff.setup.soundsOff}</Text>
              </PressableScale>
            ))}
          </View>
        </View>
      </StaffCard>

      <Button label={strings.staff.setup.changeKey} variant="secondary" icon="key-variant" onPress={() => setChanging(true)} />
      <Button label={strings.staff.setup.exit} icon="logout" onPress={leaveStaffMode} />
    </StaffFrame>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.caption, color: colors.textSecondary, fontFamily: fonts.semibold },
  value: { ...typography.bodyLarge, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary },
  gapTop: { marginTop: spacing.sm },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  soundText: { flexGrow: 1, flexShrink: 1, flexBasis: 200, gap: 2 },
  radios: { flexDirection: 'row', gap: spacing.sm },
  radio: { minWidth: 110, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radioText: { ...typography.label, color: colors.textPrimary },
});
