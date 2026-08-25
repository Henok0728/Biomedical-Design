import type { AlertState } from "../clinical/types";
import type { LoggedEvent } from "./alarm";

export interface SessionRecord {
  id: string;
  deviceId: string;
  motherId?: string;
  startedAt: number;
  endedAt: number;
  durationMinutes: number;
  peakVolumeMl: number;
  finalVolumeMl: number;
  finalState: AlertState;
  maxShockIndex: number | null;
  events: LoggedEvent[];
  syncStatus: "queued" | "synced" | "failed";
  syncedAt?: number;
}

export interface KeyValueStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// In-memory fallback adapter for testing or environments where AsyncStorage isn't loaded
export class InMemoryStorageAdapter implements KeyValueStorageAdapter {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

// Dynamic AsyncStorage adapter for React Native / Expo
const defaultAsyncStorageAdapter: KeyValueStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  async removeItem(key: string): Promise<void> {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

const STORAGE_KEY = "@smart_pph_sessions_v1";

export class SessionStore {
  private adapter: KeyValueStorageAdapter;
  private listeners = new Set<() => void>();

  constructor(adapter: KeyValueStorageAdapter = defaultAsyncStorageAdapter) {
    this.adapter = adapter;
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public async getSessions(): Promise<SessionRecord[]> {
    try {
      const raw = await this.adapter.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public async saveSession(session: SessionRecord): Promise<void> {
    const sessions = await this.getSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session); // Newest first
    }

    await this.adapter.setItem(STORAGE_KEY, JSON.stringify(sessions));
    this.notify();
  }

  public async getSessionById(id: string): Promise<SessionRecord | null> {
    const sessions = await this.getSessions();
    return sessions.find((s) => s.id === id) ?? null;
  }

  public async getQueuedSessions(): Promise<SessionRecord[]> {
    const sessions = await this.getSessions();
    return sessions.filter((s) => s.syncStatus === "queued");
  }

  public async getSyncedSessions(): Promise<SessionRecord[]> {
    const sessions = await this.getSessions();
    return sessions.filter((s) => s.syncStatus === "synced");
  }

  public async deleteSession(id: string): Promise<void> {
    const sessions = await this.getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    await this.adapter.setItem(STORAGE_KEY, JSON.stringify(filtered));
    this.notify();
  }

  public async clearAll(): Promise<void> {
    await this.adapter.removeItem(STORAGE_KEY);
    this.notify();
  }

  /**
   * Syncs a single session to the DHIS2 endpoint (simulated mock POST with network resilience).
   */
  public async syncSession(id: string): Promise<boolean> {
    const session = await this.getSessionById(id);
    if (!session) return false;

    try {
      // Mock DHIS2 Payload formulation
      const dhis2Payload = {
        program: "SMART_PPH_FACILITY_MONITORING",
        orgUnit: "ETH_PHCU_DELIVERY_WARD",
        eventDate: new Date(session.startedAt).toISOString(),
        status: "COMPLETED",
        dataValues: [
          { dataElement: "PPH_DEVICE_ID", value: session.deviceId },
          { dataElement: "PPH_MOTHER_ID", value: session.motherId || "ANONYMOUS" },
          { dataElement: "PPH_PEAK_VOL_ML", value: Math.round(session.peakVolumeMl) },
          { dataElement: "PPH_FINAL_STATE", value: session.finalState },
          { dataElement: "PPH_DURATION_MIN", value: session.durationMinutes },
          { dataElement: "PPH_EVENTS_COUNT", value: session.events.length },
        ],
      };

      // Simulate network request delay (250ms)
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Mark as synced
      session.syncStatus = "synced";
      session.syncedAt = Date.now();
      await this.saveSession(session);
      return true;
    } catch {
      session.syncStatus = "failed";
      await this.saveSession(session);
      return false;
    }
  }

  /**
   * Syncs all queued sessions in batch.
   */
  public async syncAllQueued(): Promise<{ synced: number; failed: number }> {
    const queued = await this.getQueuedSessions();
    let synced = 0;
    let failed = 0;

    for (const session of queued) {
      const ok = await this.syncSession(session.id);
      if (ok) synced++;
      else failed++;
    }

    return { synced, failed };
  }
}

export const sessionStore = new SessionStore();
