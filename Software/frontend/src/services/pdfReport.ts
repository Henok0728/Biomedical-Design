import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { stateLabelEn } from "../clinical/evaluateState";
import type { AlertState } from "../clinical/types";
import type { LoggedEvent } from "./alarm";
import type { SessionRecord } from "./sessionStore";

// Splash-icon PNG embedded as base64 so the PDF works offline
const LOGO_B64 =
  "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";

// ─── colour tokens ──────────────────────────────────────────────────────────
const STATE_COLOR: Record<AlertState, { bg: string; fg: string; label: string }> = {
  normal:      { bg: "#1B7A3D", fg: "#ffffff", label: "NORMAL"      },
  monitor:     { bg: "#C9A227", fg: "#12202C", label: "MONITOR"     },
  critical:    { bg: "#C41E3A", fg: "#ffffff", label: "CRITICAL"    },
  sensor_fail: { bg: "#C41E3A", fg: "#ffffff", label: "SENSOR FAIL" },
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmt(ts: number) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function eventTypeLabel(type: LoggedEvent["type"]): string {
  const map: Record<LoggedEvent["type"], string> = {
    state_change:     "State Change",
    mute:             "Alarm Muted",
    unmute:           "Alarm Unmuted",
    checklist_toggle: "Checklist Action",
    disconnect:       "Sensor Disconnect",
  };
  return map[type] ?? type;
}

// ─── PDF HTML template ───────────────────────────────────────────────────────
export function buildReportHtml(
  session: SessionRecord,
  events: LoggedEvent[],
): string {
  const { bg, fg, label } = STATE_COLOR[session.finalState];
  const startStr = fmt(session.startedAt);
  const endStr = fmt(session.endedAt);
  const generated = fmt(Date.now());

  // Event rows
  const eventRows = events.length
    ? events
        .map(
          (e, i) => `
        <tr class="${i % 2 === 0 ? "even" : "odd"}">
          <td>${fmt(e.timestamp)}</td>
          <td><span class="badge" style="background:${e.type === "state_change" ? "#E8F4EC" : "#EEF2FF"};color:#12202C">${eventTypeLabel(e.type)}</span></td>
          <td>${e.details ?? "—"}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="3" class="no-events">No clinical events recorded during this session.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Smart PPH Clinical Report · ${session.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #12202C;
      background: #F4F6F8;
      padding: 0;
    }

    /* ─── cover header ─────────────────────────────── */
    .cover {
      background: linear-gradient(135deg, #12324A 0%, #0A1E2F 100%);
      color: #fff;
      padding: 40px 48px 36px;
      display: flex;
      align-items: center;
      gap: 28px;
    }
    .cover-logo {
      width: 80px;
      height: 80px;
      border-radius: 18px;
      object-fit: contain;
      background: #fff;
      padding: 6px;
      flex-shrink: 0;
    }
    .cover-text h1 { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
    .cover-text h2 { font-size: 14px; font-weight: 600; opacity: 0.7; margin-top: 4px; }
    .cover-text .session-id {
      display: inline-block;
      margin-top: 10px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .generated { font-size: 11px; opacity: 0.55; margin-top: 8px; }

    /* ─── status pill ──────────────────────────────── */
    .status-strip {
      background: ${bg};
      color: ${fg};
      padding: 14px 48px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .status-pill {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 1px;
      border: 2px solid ${fg}55;
      border-radius: 8px;
      padding: 4px 16px;
    }
    .status-note { font-size: 13px; font-weight: 600; opacity: 0.85; }

    /* ─── body layout ──────────────────────────────── */
    .body { padding: 32px 48px 48px; }

    /* ─── section titles ───────────────────────────── */
    .section-title {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #5C6B76;
      text-transform: uppercase;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #D8DEE4;
    }

    /* ─── KPI cards ────────────────────────────────── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 32px;
    }
    .kpi-card {
      background: #fff;
      border: 1px solid #D8DEE4;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .kpi-card.highlight { border-color: ${bg}; box-shadow: 0 0 0 2px ${bg}33; }
    .kpi-label { font-size: 11px; font-weight: 700; color: #5C6B76; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 28px; font-weight: 900; color: #12202C; margin: 4px 0 2px; line-height: 1; }
    .kpi-card.highlight .kpi-value { color: ${bg}; }
    .kpi-unit { font-size: 12px; color: #5C6B76; font-weight: 600; }

    /* ─── detail table ─────────────────────────────── */
    .detail-grid {
      background: #fff;
      border: 1px solid #D8DEE4;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 32px;
    }
    .detail-row {
      display: flex;
      border-bottom: 1px solid #EDF0F3;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-key {
      width: 220px;
      flex-shrink: 0;
      font-size: 13px;
      font-weight: 700;
      color: #5C6B76;
      padding: 12px 16px;
      background: #F8FAFB;
      border-right: 1px solid #EDF0F3;
    }
    .detail-val {
      font-size: 13px;
      font-weight: 600;
      color: #12202C;
      padding: 12px 16px;
    }

    /* ─── events table ─────────────────────────────── */
    .events-section { margin-bottom: 32px; }
    table.events {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #D8DEE4;
      background: #fff;
    }
    table.events thead tr {
      background: #12324A;
      color: #fff;
    }
    table.events thead th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    table.events tbody tr.even { background: #fff; }
    table.events tbody tr.odd  { background: #F8FAFB; }
    table.events tbody td {
      padding: 9px 14px;
      font-size: 12px;
      color: #12202C;
      border-bottom: 1px solid #EDF0F3;
      vertical-align: middle;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
    }
    td.no-events {
      text-align: center;
      color: #5C6B76;
      padding: 24px;
      font-style: italic;
    }

    /* ─── footer ───────────────────────────────────── */
    .footer {
      border-top: 2px solid #D8DEE4;
      padding: 20px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-left { font-size: 11px; color: #5C6B76; line-height: 1.7; }
    .footer-right { font-size: 10px; color: #5C6B76; text-align: right; line-height: 1.7; }
    .footer-logo { font-weight: 900; font-size: 13px; color: #12324A; }

    /* ─── checklist callout ────────────────────────── */
    .checklist-box {
      background: #FFF4D4;
      border: 1px solid #E5C86B;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 32px;
    }
    .checklist-box h4 { font-size: 12px; font-weight: 800; color: #8A6E12; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .checklist-box ul { list-style: none; padding: 0; }
    .checklist-box li { font-size: 13px; color: #8A6E12; padding: 3px 0; font-weight: 600; }
    .checklist-box li::before { content: "✓ "; font-weight: 900; }

    .disclaimer {
      font-size: 10px;
      color: #8A939C;
      background: #F4F6F8;
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 8px;
      line-height: 1.6;
    }
  </style>
</head>
<body>

<!-- ░░░ COVER HEADER ░░░ -->
<div class="cover">
  <img class="cover-logo" src="data:image/png;base64,${LOGO_B64}" alt="Smart PPH Logo" />
  <div class="cover-text">
    <h1>Smart PPH · Clinical Session Report</h1>
    <h2>Rice 360° / NEST360 Ethiopia PHCU Pilot</h2>
    <div class="session-id">${session.id}</div>
    <div class="generated">Generated: ${generated}</div>
  </div>
</div>

<!-- ░░░ STATUS STRIP ░░░ -->
<div class="status-strip">
  <span class="status-pill">${label}</span>
  <span class="status-note">Final clinical status at session close · Device: ${session.deviceId}</span>
</div>

<!-- ░░░ BODY ░░░ -->
<div class="body">

  <!-- KPI CARDS -->
  <div class="section-title">Key Metrics</div>
  <div class="kpi-grid">
    <div class="kpi-card highlight">
      <div class="kpi-label">Peak Blood Volume</div>
      <div class="kpi-value">${Math.round(session.peakVolumeMl)}</div>
      <div class="kpi-unit">mL (postpartum hemorrhage)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Monitoring Duration</div>
      <div class="kpi-value">${session.durationMinutes}</div>
      <div class="kpi-unit">minutes</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Events Recorded</div>
      <div class="kpi-value">${events.length}</div>
      <div class="kpi-unit">clinical events</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Final State</div>
      <div class="kpi-value" style="font-size:18px;color:${bg}">${label}</div>
      <div class="kpi-unit">${stateLabelEn(session.finalState)}</div>
    </div>
  </div>

  <!-- SESSION DETAILS -->
  <div class="section-title">Session Details</div>
  <div class="detail-grid">
    <div class="detail-row">
      <div class="detail-key">Session ID</div>
      <div class="detail-val">${session.id}</div>
    </div>
    <div class="detail-row">
      <div class="detail-key">Device ID</div>
      <div class="detail-val">${session.deviceId}</div>
    </div>
    ${session.motherId ? `<div class="detail-row"><div class="detail-key">Patient / Mother ID</div><div class="detail-val">${session.motherId}</div></div>` : ""}
    <div class="detail-row">
      <div class="detail-key">Session Start</div>
      <div class="detail-val">${startStr}</div>
    </div>
    <div class="detail-row">
      <div class="detail-key">Session End</div>
      <div class="detail-val">${endStr}</div>
    </div>
    <div class="detail-row">
      <div class="detail-key">Duration</div>
      <div class="detail-val">${session.durationMinutes} minutes</div>
    </div>
    <div class="detail-row">
      <div class="detail-key">Peak Blood Volume</div>
      <div class="detail-val">${Math.round(session.peakVolumeMl)} mL</div>
    </div>
    <div class="detail-row">
      <div class="detail-key">Final Clinical Status</div>
      <div class="detail-val" style="font-weight:900;color:${bg}">${stateLabelEn(session.finalState).toUpperCase()}</div>
    </div>
    <div class="detail-row">
      <div class="detail-key">DHIS2 Sync Status</div>
      <div class="detail-val">${session.syncStatus === "synced" ? "✓ Synced to facility DHIS2" : "⏳ Queued for upload"}</div>
    </div>
  </div>

  <!-- FIRST-LINE PPH RESPONSE ACTIONS (from checklist events) -->
  ${(() => {
    const checks = events.filter((e) => e.type === "checklist_toggle" && e.details);
    return checks.length
      ? `<div class="checklist-box">
          <h4>First-Line PPH Bundle Actions Recorded</h4>
          <ul>${checks.map((c) => `<li>${c.details}</li>`).join("")}</ul>
        </div>`
      : "";
  })()}

  <!-- CLINICAL EVENT LOG TABLE -->
  <div class="events-section">
    <div class="section-title">Clinical Event Log (${events.length} events)</div>
    <table class="events">
      <thead>
        <tr>
          <th style="width:200px">Timestamp</th>
          <th style="width:170px">Event Type</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${eventRows}
      </tbody>
    </table>
  </div>

  <!-- DISCLAIMER -->
  <div class="disclaimer">
    <strong>Clinical Notice:</strong> This report is generated by the Smart PPH mat system (prototype) for clinical documentation purposes.
    All values are measured or computed by the system. This document is not a substitute for clinical judgement.
    WHO-aligned PPH thresholds applied: ≥ 300 mL → Monitor; ≥ 500 mL → Critical; Shock Index ≥ 0.9 → Critical.
  </div>
</div>

<!-- ░░░ FOOTER ░░░ -->
<div class="footer">
  <div class="footer-left">
    <div class="footer-logo">Smart PPH System</div>
    <div>Rice 360° Institute for Global Health Technologies</div>
    <div>NEST360 Ethiopia PHCU Maternal Health Pilot</div>
  </div>
  <div class="footer-right">
    <div>Session: ${session.id}</div>
    <div>Device: ${session.deviceId}</div>
    <div>Report generated: ${generated}</div>
  </div>
</div>

</body>
</html>`;
}

// ─── public API ───────────────────────────────────────────────────────────────
export async function exportSessionPdf(
  session: SessionRecord,
  events: LoggedEvent[],
): Promise<void> {
  const html = buildReportHtml(session, events);

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Smart PPH Report · ${session.id}`,
      UTI: "com.adobe.pdf",
    });
  } else {
    await Print.printAsync({ uri });
  }
}
