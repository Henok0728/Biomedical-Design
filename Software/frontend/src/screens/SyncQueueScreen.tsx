import { RouteProp, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { stateLabelEn } from "../clinical/evaluateState";
import { BigButton } from "../components/ui";
import { t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { sessionStore, type SessionRecord } from "../services/sessionStore";
import { colors } from "../theme/colors";

type R = RouteProp<RootStackParamList, "Sync">;

function formatDate(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function SyncQueueScreen() {
  const { language } = useRoute<R>().params;
  const copy = t(language);

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  const load = async () => {
    const list = await sessionStore.getSessions();
    setSessions(list);
  };

  useEffect(() => {
    load();
    const unsubscribe = sessionStore.subscribe(() => {
      load();
    });
    return () => unsubscribe();
  }, []);

  const queued = sessions.filter((s) => s.syncStatus === "queued");
  const synced = sessions.filter((s) => s.syncStatus === "synced");

  const handleSyncAll = async () => {
    if (queued.length === 0) return;
    setIsSyncing(true);
    setLastSyncResult(null);

    const result = await sessionStore.syncAllQueued();
    setIsSyncing(false);
    setLastSyncResult(
      `Synced ${result.synced} record${result.synced === 1 ? "" : "s"} to DHIS2.`,
    );
    await load();
  };

  const handleClearSynced = async () => {
    for (const item of synced) {
      await sessionStore.deleteSession(item.id);
    }
    await load();
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{copy.sync}</Text>

        {/* Offline notice */}
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>🌐 {copy.offlineBanner}</Text>
        </View>

        {/* Sync Action Header */}
        <View style={styles.summaryBar}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{queued.length}</Text>
            <Text style={styles.statLabel}>{copy.queued}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{synced.length}</Text>
            <Text style={styles.statLabel}>{copy.sent}</Text>
          </View>
        </View>

        {lastSyncResult ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ {lastSyncResult}</Text>
          </View>
        ) : null}

        {queued.length > 0 ? (
          <View style={styles.actionContainer}>
            {isSyncing ? (
              <View style={styles.syncingBox}>
                <ActivityIndicator size="small" color={colors.navy} />
                <Text style={styles.syncingText}>{copy.syncing}</Text>
              </View>
            ) : (
              <BigButton title={copy.syncAll} onPress={handleSyncAll} />
            )}
          </View>
        ) : sessions.length > 0 ? (
          <View style={styles.allSyncedBox}>
            <Text style={styles.allSyncedText}>✓ {copy.allSynced}</Text>
          </View>
        ) : null}

        {/* Queued Section */}
        {queued.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              QUEUED SESSIONS ({queued.length})
            </Text>
            {queued.map((item) => (
              <SessionCard
                key={item.id}
                session={item}
                copy={copy}
                onSyncIndividual={() => sessionStore.syncSession(item.id)}
              />
            ))}
          </View>
        ) : null}

        {/* Synced Section */}
        {synced.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>
                SYNCHRONIZED ({synced.length})
              </Text>
              <Pressable onPress={handleClearSynced}>
                <Text style={styles.clearText}>{copy.clearSynced}</Text>
              </Pressable>
            </View>
            {synced.map((item) => (
              <SessionCard key={item.id} session={item} copy={copy} />
            ))}
          </View>
        ) : null}

        {sessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{copy.emptyQueue}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function SessionCard({
  session,
  copy,
  onSyncIndividual,
}: {
  session: SessionRecord;
  copy: ReturnType<typeof t>;
  onSyncIndividual?: () => void;
}) {
  const isQueued = session.syncStatus === "queued";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>
            {session.deviceId}
            {session.motherId ? ` · ${session.motherId}` : ""}
          </Text>
          <Text style={styles.cardTime}>{formatDate(session.startedAt)}</Text>
        </View>

        <View
          style={[
            styles.statusTag,
            isQueued ? styles.tagQueued : styles.tagSynced,
          ]}
        >
          <Text
            style={[
              styles.statusTagText,
              isQueued ? styles.tagQueuedText : styles.tagSyncedText,
            ]}
          >
            {isQueued ? "QUEUED" : "DHIS2 SYNCED"}
          </Text>
        </View>
      </View>

      <View style={styles.cardMetrics}>
        <Text style={styles.metricText}>
          Peak:{" "}
          <Text style={styles.metricBold}>
            {Math.round(session.peakVolumeMl)} mL
          </Text>
        </Text>
        <Text style={styles.metricText}>
          Status:{" "}
          <Text style={styles.metricBold}>
            {stateLabelEn(session.finalState)}
          </Text>
        </Text>
        <Text style={styles.metricText}>
          Duration:{" "}
          <Text style={styles.metricBold}>{session.durationMinutes} min</Text>
        </Text>
      </View>

      {isQueued && onSyncIndividual ? (
        <Pressable onPress={onSyncIndividual} style={styles.singleSyncBtn}>
          <Text style={styles.singleSyncText}>Sync this record →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingTop: 16,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.ink,
    marginBottom: 8,
  },
  noticeBanner: {
    backgroundColor: "#E2EEF8",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B8D5ED",
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: "600",
  },
  summaryBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.navy,
  },
  statLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "700",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  actionContainer: {
    marginBottom: 12,
  },
  syncingBox: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncingText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },
  successBanner: {
    backgroundColor: "#E8F4EC",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B7DFCA",
    marginBottom: 12,
    alignItems: "center",
  },
  successText: {
    color: colors.greenDark,
    fontWeight: "700",
    fontSize: 14,
  },
  allSyncedBox: {
    backgroundColor: "#E8F4EC",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B7DFCA",
    marginBottom: 16,
    alignItems: "center",
  },
  allSyncedText: {
    color: colors.greenDark,
    fontWeight: "700",
    fontSize: 14,
  },
  section: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  clearText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    textDecorationLine: "underline",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
  },
  cardTime: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  statusTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tagQueued: {
    backgroundColor: "#FFF4D4",
    borderWidth: 1,
    borderColor: "#E5C86B",
  },
  tagSynced: {
    backgroundColor: "#E2F6EA",
    borderWidth: 1,
    borderColor: "#88DBA8",
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "800",
  },
  tagQueuedText: {
    color: "#8A6E12",
  },
  tagSyncedText: {
    color: "#1B7A3D",
  },
  cardMetrics: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  metricText: {
    fontSize: 14,
    color: colors.muted,
  },
  metricBold: {
    fontWeight: "700",
    color: colors.ink,
  },
  singleSyncBtn: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "flex-end",
  },
  singleSyncText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600",
  },
});
