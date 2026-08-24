import type { AlertState, Language } from '../clinical/types';

export type RootStackParamList = {
  Language: undefined;
  Ward: { language: Language };
  Connect: { language: Language; deviceId: string };
  NewSession: { language: Language; deviceId: string; demo: boolean };
  Live: { language: Language; deviceId: string; sessionId: string; motherId?: string };
  Critical: { language: Language; sessionId: string };
  Summary: {
    language: Language;
    sessionId: string;
    peakVolumeMl: number;
    finalState: AlertState;
    startedAt: number;
    endedAt: number;
  };
  Sync: { language: Language };
  Settings: { language: Language };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
