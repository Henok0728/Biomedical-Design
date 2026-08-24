import { RouteProp, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BigButton } from "../components/ui";
import { t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type R = RouteProp<RootStackParamList, "Sync">;

export function SyncQueueScreen() {
  const { language } = useRoute<R>().params;
  const copy = t(language);
  const [sent, setSent] = useState(false);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{copy.sync}</Text>
      <Text style={styles.row}>{sent ? copy.sent : `1 ${copy.queued}`}</Text>
      <Text style={styles.hint}>
        DHIS2 when network available — demo stub only.
      </Text>
      {!sent ? (
        <BigButton title={copy.sent} onPress={() => setSent(true)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 12,
  },
  row: { fontSize: 20, color: colors.ink },
  hint: { fontSize: 15, color: colors.muted, marginTop: 8, marginBottom: 12 },
});
