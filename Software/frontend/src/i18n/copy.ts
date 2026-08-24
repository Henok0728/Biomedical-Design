import type { AlertState, Language } from "../clinical/types";

const en = {
  appName: "Smart PPH",
  chooseLanguage: "Choose language",
  english: "English",
  amharic: "Amharic",
  ward: "Ward",
  devices: "Mats",
  connect: "Connect",
  scanBle: "Scan BLE",
  demoMode: "Demo mode",
  demoHint: "No ESP32 needed. Use this for judges and rehearsal.",
  newSession: "New session",
  motherId: "Mother ID (optional)",
  startMonitoring: "Start monitoring",
  live: "Live monitoring",
  volume: "Blood volume",
  rate: "Rate / 15 min",
  shockIndex: "Shock Index",
  heartRate: "Heart rate",
  sbp: "SBP",
  elapsed: "Elapsed",
  mute: "Mute 5 min",
  muted: "Audio muted",
  add100: "Add 100 mL",
  failSensor: "Fail sensor",
  restoreSensor: "Restore sensor",
  raiseSi: "Raise SI",
  endSession: "End session",
  criticalTitle: "Critical blood loss",
  criticalBody: "Start PPH bundle now.",
  monitorBody: "Monitor closely. Prepare uterotonics.",
  normalBody: "Normal postpartum status.",
  sensorFailBody: "Sensor disconnected. Treat as fail-safe alert.",
  checklistUterotonic: "Give uterotonic",
  checklistMassage: "Uterine massage",
  checklistHelp: "Call for help",
  checklistIv: "IV access",
  acknowledge: "Acknowledge",
  summary: "Session summary",
  peakVolume: "Peak volume",
  sync: "Sync queue",
  queued: "Waiting to send",
  sent: "Sent (demo DHIS2)",
  settings: "Settings",
  thresholdsLocked: "Thresholds are locked for demo.",
  lastSeen: "Last seen",
  battery: "Battery",
};

const am: typeof en = {
  appName: "ስማርት PPH",
  chooseLanguage: "ቋንቋ ይምረጡ",
  english: "እንግሊዝኛ",
  amharic: "አማርኛ",
  ward: "ዋርድ",
  devices: "ማቶች",
  connect: "አገናኝ",
  scanBle: "BLE ፈልግ",
  demoMode: "የማሳያ ሁነታ",
  demoHint: "ESP32 አያስፈልግም። ለዳኞች እና ለልምምድ ይህን ይጠቀሙ።",
  newSession: "አዲስ ክትትል",
  motherId: "የእናት መለያ (አማራጭ)",
  startMonitoring: "ክትትል ጀምር",
  live: "ቀጥታ ክትትል",
  volume: "የደም መጠን",
  rate: "መጠን / 15 ደቂቃ",
  shockIndex: "ሾክ ኢንዴክስ",
  heartRate: "የልብ ምት",
  sbp: "SBP",
  elapsed: "ያለፈ ጊዜ",
  mute: "5 ደቂቃ ድምፅ አጥፋ",
  muted: "ድምፅ ተዘግቷል",
  add100: "100 ሚሊ ጨምር",
  failSensor: "ሴንሰር አቋርጥ",
  restoreSensor: "ሴንሰር መልስ",
  raiseSi: "SI አሳድግ",
  endSession: "ክትትል ጨርስ",
  criticalTitle: "ከባድ የደም መፍሰስ",
  criticalBody: "የ PPH እርምጃ አሁን ጀምር።",
  monitorBody: "በቅርበት ይከታተሉ። uterotonic ያዘጋጁ።",
  normalBody: "መደበኛ የድህረ ወሊድ ሁኔታ።",
  sensorFailBody: "ሴንሰር ተቋርጧል። እንደ ቀይ ማንቂያ ይቁጠሩ።",
  checklistUterotonic: "uterotonic ስጥ",
  checklistMassage: "የማህፀን ማሳጅ",
  checklistHelp: "እርዳታ ጥራ",
  checklistIv: "IV",
  acknowledge: "ተረድቻለሁ",
  summary: "ማጠቃለያ",
  peakVolume: "ከፍተኛ መጠን",
  sync: "የማስተላለፍ ወረፋ",
  queued: "ለመላክ በመጠበቅ",
  sent: "ተልኳል (ማሳያ DHIS2)",
  settings: "ቅንብሮች",
  thresholdsLocked: "ለማሳያ ገደቦች ተቆልፈዋል።",
  lastSeen: "መጨረሻ የታየ",
  battery: "ባትሪ",
};

export function t(language: Language) {
  return language === "am" ? am : en;
}

export function guidance(language: Language, state: AlertState): string {
  const c = t(language);
  if (state === "critical") {
    return c.criticalBody;
  }
  if (state === "monitor") {
    return c.monitorBody;
  }
  if (state === "sensor_fail") {
    return c.sensorFailBody;
  }
  return c.normalBody;
}
