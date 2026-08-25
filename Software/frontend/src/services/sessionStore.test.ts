import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  SessionStore,
  InMemoryStorageAdapter,
  type SessionRecord,
} from "./sessionStore";

describe("SessionStore", () => {
  let adapter: InMemoryStorageAdapter;
  let store: SessionStore;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    store = new SessionStore(adapter);
  });

  const dummySession: SessionRecord = {
    id: "ses-test-01",
    deviceId: "PPH-MAT-04",
    motherId: "MOM-1029",
    startedAt: 1700000000000,
    endedAt: 1700001800000,
    durationMinutes: 30,
    peakVolumeMl: 420,
    finalVolumeMl: 420,
    finalState: "monitor",
    maxShockIndex: 0.78,
    events: [
      {
        id: "evt-1",
        type: "state_change",
        state: "monitor",
        timestamp: 1700000500000,
      },
    ],
    syncStatus: "queued",
  };

  it("saves and retrieves a session from persistent storage", async () => {
    await store.saveSession(dummySession);
    const sessions = await store.getSessions();
    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(sessions[0].id, "ses-test-01");
    assert.strictEqual(sessions[0].peakVolumeMl, 420);
    assert.strictEqual(sessions[0].syncStatus, "queued");
  });

  it("persists across store instances sharing the same adapter", async () => {
    await store.saveSession(dummySession);

    // Create a brand new SessionStore instance with the same backend adapter (simulates app restart)
    const newStoreInstance = new SessionStore(adapter);
    const sessions = await newStoreInstance.getSessions();
    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(sessions[0].motherId, "MOM-1029");
  });

  it("filters queued and synced sessions", async () => {
    const session1 = { ...dummySession, id: "ses-1", syncStatus: "queued" as const };
    const session2 = { ...dummySession, id: "ses-2", syncStatus: "synced" as const };

    await store.saveSession(session1);
    await store.saveSession(session2);

    const queued = await store.getQueuedSessions();
    const synced = await store.getSyncedSessions();

    assert.strictEqual(queued.length, 1);
    assert.strictEqual(queued[0].id, "ses-1");
    assert.strictEqual(synced.length, 1);
    assert.strictEqual(synced[0].id, "ses-2");
  });

  it("syncs a queued session and marks it as synced with timestamp", async () => {
    await store.saveSession(dummySession);
    const success = await store.syncSession("ses-test-01");
    assert.strictEqual(success, true);

    const updated = await store.getSessionById("ses-test-01");
    assert.ok(updated);
    assert.strictEqual(updated.syncStatus, "synced");
    assert.ok(typeof updated.syncedAt === "number");
  });

  it("syncs all queued sessions in batch", async () => {
    await store.saveSession({ ...dummySession, id: "s-1", syncStatus: "queued" });
    await store.saveSession({ ...dummySession, id: "s-2", syncStatus: "queued" });
    await store.saveSession({ ...dummySession, id: "s-3", syncStatus: "synced" });

    const result = await store.syncAllQueued();
    assert.strictEqual(result.synced, 2);
    assert.strictEqual(result.failed, 0);

    const queuedRemaining = await store.getQueuedSessions();
    assert.strictEqual(queuedRemaining.length, 0);

    const allSynced = await store.getSyncedSessions();
    assert.strictEqual(allSynced.length, 3);
  });
});
