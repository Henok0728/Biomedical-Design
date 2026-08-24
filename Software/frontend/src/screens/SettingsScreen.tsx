import { RouteProp, useRoute } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import {
  RATE_CRITICAL_ML_PER_15MIN,
  SI_CRITICAL,
  SI_MONITOR,
  VOLUME_CRITICAL_ML,
  VOLUME_MONITOR_ML,
} from '../clinical/evaluateState';
import { t } from '../i18n/copy';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type R = RouteProp<RootStackParamList, 'Settings'>;

export function SettingsScreen() {
  const { language } = useRoute<R>().params;
  const copy = t(language);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{copy.settings}</Text>
      <Text style={styles.hint}>{copy.thresholdsLocked}</Text>
      <Text style={styles.row}>Yellow: {VOLUME_MONITOR_ML} mL or SI {SI_MONITOR}</Text>
      <Text style={styles.row}>
        Red: {VOLUME_CRITICAL_ML} mL or SI {SI_CRITICAL} or {RATE_CRITICAL_ML_PER_15MIN} mL / 15 min
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20, paddingTop: 36 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  hint: { fontSize: 16, color: colors.muted, marginBottom: 16 },
  row: { fontSize: 18, color: colors.ink, marginBottom: 8 },
});
