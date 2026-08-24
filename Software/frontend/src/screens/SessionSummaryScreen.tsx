import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { stateLabelEn } from '../clinical/evaluateState';
import { BigButton } from '../components/ui';
import { t } from '../i18n/copy';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Summary'>;
type R = RouteProp<RootStackParamList, 'Summary'>;

export function SessionSummaryScreen() {
  const navigation = useNavigation<Nav>();
  const params = useRoute<R>().params;
  const copy = t(params.language);
  const minutes = Math.max(1, Math.round((params.endedAt - params.startedAt) / 60000));

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{copy.summary}</Text>
      <Text style={styles.row}>
        {copy.peakVolume}: {Math.round(params.peakVolumeMl)} mL
      </Text>
      <Text style={styles.row}>
        {stateLabelEn(params.finalState)} · {minutes} min
      </Text>
      <Text style={styles.meta}>{params.sessionId}</Text>
      <BigButton title={copy.sync} onPress={() => navigation.navigate('Sync', { language: params.language })} />
      <BigButton
        title={copy.ward}
        variant="ghost"
        onPress={() =>
          navigation.reset({
            index: 1,
            routes: [
              { name: 'Language' },
              { name: 'Ward', params: { language: params.language } },
            ],
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 16 },
  row: { fontSize: 20, color: colors.ink, marginBottom: 8 },
  meta: { fontSize: 14, color: colors.muted, marginBottom: 16 },
});
