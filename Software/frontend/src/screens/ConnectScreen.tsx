import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { BigButton } from '../components/ui';
import { t } from '../i18n/copy';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Connect'>;
type R = RouteProp<RootStackParamList, 'Connect'>;

export function ConnectScreen() {
  const navigation = useNavigation<Nav>();
  const { language, deviceId } = useRoute<R>().params;
  const copy = t(language);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{copy.connect}</Text>
      <Text style={styles.device}>{deviceId}</Text>
      <Text style={styles.hint}>{copy.demoHint}</Text>
      <BigButton
        title={copy.demoMode}
        onPress={() => navigation.navigate('NewSession', { language, deviceId, demo: true })}
      />
      <BigButton
        title={copy.scanBle}
        variant="ghost"
        onPress={() =>
          Alert.alert('BLE', 'Phase 6. Use Demo mode until the ESP32 notify characteristic is ready.')
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  device: { fontSize: 22, fontWeight: '700', color: colors.navy, marginTop: 8 },
  hint: { fontSize: 16, color: colors.muted, marginTop: 12, marginBottom: 8 },
});
