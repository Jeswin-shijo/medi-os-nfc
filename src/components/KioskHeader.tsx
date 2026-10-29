import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useKioskStore } from '../store/useKioskStore';

export const KioskHeader: React.FC = () => {
  const { step, resetSession } = useKioskStore();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      setTimeStr(now.toLocaleDateString('en-IN', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.header}>
      <View style={styles.hospitalBranding}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="local-hospital" size={32} color="#FFFFFF" />
        </View>
        <View>
          <Text style={styles.hospitalName}>St. Mary's Multi Speciality Hospital</Text>
          <Text style={styles.subTitle}>Contactless AI Reception & OP Registration Kiosk</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.timeBadge}>
          <MaterialIcons name="access-time" size={18} color={Colors.textSecondary} />
          <Text style={styles.timeText}>{timeStr}</Text>
        </View>

        {step !== 'WELCOME' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={resetSession}
            activeOpacity={0.7}
          >
            <MaterialIcons name="home" size={20} color={Colors.danger} />
            <Text style={styles.cancelText}>Start Over</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 76,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  hospitalBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dangerLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.danger,
  },
});

