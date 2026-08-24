import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n/copy';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Ward'>;
type R = RouteProp<RootStackParamList, 'Ward'>;

const MATS = [
  { id: 'PPH-MAT-04', name: 'Delivery 1', severity: 'green' as const, volumeMl: 80, si: 0.66 },
  { id: 'PPH-MAT-07', name: 'Delivery 2', severity: 'yellow' as const, volumeMl: 340, si: 0.74 },
];

export function WardScreen() {
  const navigation = useNavigation<Nav>();
  const { language } = useRoute<R>().params;
  const copy = t(language);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{copy.ward}</Text>
      <Text style={styles.sub}>{copy.devices}</Text>
      {MATS.map((mat) => (
        <Pressable
          key={mat.id}
          style={styles.card}
          onPress={() => navigation.navigate('Connect', { language, deviceId: mat.id })}
        >
          <View style={[styles.bar, { backgroundColor: colors[mat.severity] }]} />
          <View style={styles.body}>
            <Text style={styles.name}>{mat.name}</Text>
            <Text style={styles.meta}>{mat.id}</Text>
            <Text style={styles.meta}>
              {Math.round(mat.volumeMl)} mL · SI {mat.si.toFixed(2)}
            </Text>
          </View>
        </Pressable>
      ))}
      <Pressable style={styles.link} onPress={() => navigation.navigate('Sync', { language })}>
        <Text style={styles.linkText}>{copy.sync}</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => navigation.navigate('Settings', { language })}>
        <Text style={styles.linkText}>{copy.settings}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 16, color: colors.muted, marginBottom: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bar: { width: 10 },
  body: { padding: 14, flex: 1 },
  name: { fontSize: 20, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 15, color: colors.muted, marginTop: 2 },
  link: { paddingVertical: 12 },
  linkText: { color: colors.navy, fontSize: 16, fontWeight: '600' },
});
