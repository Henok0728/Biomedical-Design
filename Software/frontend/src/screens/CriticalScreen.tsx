import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { stateLabelEn } from '../clinical/evaluateState';
import { BigButton } from '../components/ui';
import { t } from '../i18n/copy';
import type { RootStackParamList } from '../navigation/types';
import { useSimulatorSnapshot } from '../simulator/SimulatorContext';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Critical'>;
type R = RouteProp<RootStackParamList, 'Critical'>;

export function CriticalScreen() {
  const navigation = useNavigation<Nav>();
  const { language } = useRoute<R>().params;
  const copy = t(language);
  const snap = useSimulatorSnapshot();

  const items = [copy.checklistUterotonic, copy.checklistMassage, copy.checklistHelp, copy.checklistIv];

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{copy.criticalTitle}</Text>
      <Text style={styles.body}>{copy.criticalBody}</Text>
      <Text style={styles.volume}>{Math.round(snap.volumeMl)} mL</Text>
      <Text style={styles.meta}>
        SI {snap.shockIndex == null ? '—' : snap.shockIndex.toFixed(2)} · {stateLabelEn(snap.state)}
      </Text>
      {items.map((item) => (
        <View key={item} style={styles.check}>
          <Text style={styles.checkText}>•  {item}</Text>
        </View>
      ))}
      <BigButton title={copy.acknowledge} variant="light" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.red, padding: 24, paddingTop: 56 },
  title: { color: colors.white, fontSize: 32, fontWeight: '800' },
  body: { color: colors.white, fontSize: 20, marginTop: 8 },
  volume: { color: colors.white, fontSize: 56, fontWeight: '800', marginTop: 16 },
  meta: { color: colors.white, fontSize: 18, marginBottom: 20 },
  check: { paddingVertical: 8 },
  checkText: { color: colors.white, fontSize: 22, fontWeight: '600' },
});
