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
  unmute: "Unmute alarm",
  muted: "Audio muted",
  muteRemaining: "Muted",
  add100: "+100 mL",
  failSensor: "Fail sensor",
  restoreSensor: "Restore sensor",
  raiseSi: "Raise SI (1.20)",
  endSession: "End session",
  criticalTitle: "CRITICAL BLOOD LOSS",
  criticalBody: "Start PPH bundle now.",
  monitorBody: "Monitor closely. Prepare uterotonics.",
  normalBody: "Normal postpartum status.",
  sensorFailBody: "SENSOR DISCONNECTED. Treat as fail-safe emergency.",
  checklistHeader: "FIRST-LINE PPH RESPONSE BUNDLE",
  checklistUterotonic: "Give uterotonic (Oxytocin / Misoprostol)",
  checklistMassage: "Uterine massage immediately",
  checklistHelp: "Call for emergency help",
  checklistIv: "Establish large-bore IV access",
  acknowledge: "Acknowledge & Return to Live View",
  summary: "Session summary",
  peakVolume: "Peak volume",
  sync: "Sync queue",
  queued: "Waiting to send",
  sent: "Sent (demo DHIS2)",
  settings: "Settings",
  thresholdsLocked: "Thresholds are locked for demo.",
  lastSeen: "Last seen",
  battery: "Battery",
  switchLang: "አማርኛ",
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
  unmute: "ድምፅ ክፈት",
  muted: "ድምፅ ተዘግቷል",
  muteRemaining: "ድምፅ ተዘግቷል",
  add100: "+100 ሚሊ",
  failSensor: "ሴንሰር አቋርጥ",
  restoreSensor: "ሴንሰር መልስ",
  raiseSi: "SI አሳድግ (1.20)",
  endSession: "ክትትል ጨርስ",
  criticalTitle: "ከባድ አደገኛ የደም መፍሰስ",
  criticalBody: "የ PPH እርምጃ አሁን ጀምር።",
  monitorBody: "በቅርበት ይከታተሉ። uterotonic ያዘጋጁ።",
  normalBody: "መደበኛ የድህረ ወሊድ ሁኔታ።",
  sensorFailBody: "ሴንሰር ተቋርጧል። እንደ ቀይ ማንቂያ ይቁጠሩ።",
  checklistHeader: "የመጀመሪያ ደረጃ የ PPH ምላሽ እርምጃዎች",
  checklistUterotonic: "uterotonic ስጥ (Oxytocin / Misoprostol)",
  checklistMassage: "የማህፀን ማሳጅ ወዲያውኑ አድርግ",
  checklistHelp: "አስቸኳይ እርዳታ ጥራ",
  checklistIv: "ትልቅ የደም ስር መስመር (IV) ክፈት",
  acknowledge: "ተረድቻለሁ · ወደ ቀጥታ ክትትል ተመለስ",
  summary: "ማጠቃለያ",
  peakVolume: "ከፍተኛ መጠን",
  sync: "የማስተላለፍ ወረፋ",
  queued: "ለመላክ በመጠበቅ",
  sent: "ተልኳል (ማሳያ DHIS2)",
  settings: "ቅንብሮች",
  thresholdsLocked: "ለማሳያ ገደቦች ተቆልፈዋል።",
  lastSeen: "መጨረሻ የታየ",
  battery: "ባትሪ",
  switchLang: "English",
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
