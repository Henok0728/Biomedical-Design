import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { displaySeverity, stateLabelEn } from '../clinical/evaluateState';
import { BigButton } from '../components/ui';
import { guidance, t } from '../i18n/copy';
import type { RootStackParamList } from '../navigation/types';
import { useSimulatorSnapshot } from '../simulator/SimulatorContext';
import { simulator } from '../simulator/PphSimulator';
import { colors, severityColors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Live'>;
type R = RouteProp<RootStackParamList, 'Live'>;

const MUTE_MS = 5 * 60 * 1000;

function formatElapsed(startedAt: number | null) {
  if (!startedAt) {
    return '00:00';
  }
  const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function LiveMonitoringScreen() {
  const navigation = useNavigation<Nav>();
  const { language, deviceId, sessionId, motherId } = useRoute<R>().params;
  const copy = t(language);
  const snap = useSimulatorSnapshot();
  const peakRef = useRef(snap.volumeMl);
  const pushedCritical = useRef(false);
  const [, tick] = useState(0);
  const [mutedUntil, setMutedUntil] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    peakRef.current = Math.max(peakRef.current, snap.volumeMl);
  }, [snap.volumeMl]);

  useEffect(() => {
    const isRed = snap.state === 'critical' || snap.state === 'sensor_fail';
    if (isRed && !pushedCritical.current) {
      pushedCritical.current = true;
      navigation.navigate('Critical', { language, sessionId });
    }
    if (!isRed) {
      pushedCritical.current = false;
    }
  }, [language, navigation, sessionId, snap.state]);

  const severity = displaySeverity(snap.state);
  const palette = severityColors[severity];
  const muted = Date.now() < mutedUntil;

  const end = () => {
    simulator.stop();
    navigation.replace('Summary', {
      language,
      sessionId,
      peakVolumeMl: peakRef.current,
      finalState: snap.state,
      startedAt: snap.startedAt ?? Date.now(),
      endedAt: Date.now(),
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <Text style={[styles.kicker, { color: palette.text }]}>
        {deviceId}
        {motherId ? ` · ${motherId}` : ''}
      </Text>
      <Text style={[styles.state, { color: palette.text }]}>{stateLabelEn(snap.state)}</Text>
      <Text style={[styles.guidance, { color: palette.text }]}>{guidance(language, snap.state)}</Text>

      <Text style={[styles.volume, { color: palette.text }]}>{Math.round(snap.volumeMl)}</Text>
      <Text style={[styles.unit, { color: palette.text }]}>mL · {copy.volume}</Text>

      <View style={styles.row}>
        <Metric label={copy.rate} value={`${Math.round(snap.volumeRateMlPer15min)}`} unit="mL" dark={severity === 'yellow'} />
        <Metric
          label={copy.shockIndex}
          value={snap.shockIndex == null ? '—' : snap.shockIndex.toFixed(2)}
          unit=""
          dark={severity === 'yellow'}
        />
      </View>
      <View style={styles.row}>
        <Metric label={copy.heartRate} value={snap.hrBpm == null ? '—' : String(snap.hrBpm)} unit="bpm" dark={severity === 'yellow'} />
        <Metric label={copy.sbp} value={snap.sbpMmhg == null ? '—' : String(snap.sbpMmhg)} unit="mmHg" dark={severity === 'yellow'} />
      </View>

      <Text style={[styles.elapsed, { color: palette.text }]}>
        {copy.elapsed} {formatElapsed(snap.startedAt)}
        {muted ? ` · ${copy.muted}` : ''}
      </Text>

      <BigButton title={copy.add100} variant="light" onPress={() => simulator.addVolume(100)} />
      <BigButton title={copy.raiseSi} variant="light" onPress={() => simulator.raiseShockIndex()} />
      <BigButton
        title={snap.sensorFail ? copy.restoreSensor : copy.failSensor}
        variant="light"
        onPress={() => simulator.setSensorFail(!snap.sensorFail)}
      />
      <Pressable
        onPress={() => setMutedUntil(Date.now() + MUTE_MS)}
        style={styles.mute}
      >
        <Text style={[styles.muteText, { color: palette.text }]}>{copy.mute}</Text>
      </Pressable>
      <Pressable onPress={end} style={styles.mute}>
        <Text style={[styles.muteText, { color: palette.text }]}>{copy.endSession}</Text>
      </Pressable>
    </View>
  );
}

function Metric({
  label,
  value,
  unit,
  dark,
}: {
  label: string;
  value: string;
  unit: string;
  dark: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: dark ? colors.ink : colors.white }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: dark ? colors.ink : colors.white }]}>
        {value}
        {unit ? ` ${unit}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, paddingTop: 48 },
  kicker: { fontSize: 16, fontWeight: '600', opacity: 0.9 },
  state: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  guidance: { fontSize: 18, marginTop: 8, marginBottom: 8 },
  volume: { fontSize: 88, fontWeight: '800', lineHeight: 96 },
  unit: { fontSize: 18, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 14, opacity: 0.9 },
  metricValue: { fontSize: 22, fontWeight: '700' },
  elapsed: { fontSize: 16, marginTop: 8, marginBottom: 4 },
  mute: { alignItems: 'center', paddingVertical: 10 },
  muteText: { fontSize: 16, fontWeight: '700', textDecorationLine: 'underline' },
});
