import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BigButton } from '../components/ui';
import { t } from '../i18n/copy';
import { simulator } from '../simulator/PphSimulator';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NewSession'>;
type R = RouteProp<RootStackParamList, 'NewSession'>;

export function NewSessionScreen() {
  const navigation = useNavigation<Nav>();
  const { language, deviceId } = useRoute<R>().params;
  const copy = t(language);
  const [motherId, setMotherId] = useState('');

  const start = () => {
    const sessionId = `ses-${Date.now()}`;
    simulator.startSession();
    navigation.replace('Live', {
      language,
      deviceId,
      sessionId,
      motherId: motherId.trim() || undefined,
    });
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{copy.newSession}</Text>
      <Text style={styles.meta}>{deviceId}</Text>
      <TextInput
        value={motherId}
        onChangeText={setMotherId}
        placeholder={copy.motherId}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      <BigButton title={copy.startMonitoring} onPress={start} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  meta: { fontSize: 16, color: colors.muted, marginBottom: 20 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    fontSize: 18,
    color: colors.ink,
  },
});
