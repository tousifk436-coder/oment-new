/* ============================================================================
   SIS OPS SCHEDULER — backend monitoring worker (spec §27 / §60 / §61)
   ----------------------------------------------------------------------------
   Browser band ho tab bhi monitoring chalti rahe — isliye ye Node worker hai,
   frontend JavaScript timer NAHI.

   Ye worker wahi shared engine (shared/sis-ops.js) chalata hai jo UI chalati
   hai — rules ek jagah, do implementations nahi.

   ABHI (demo mode):
     • Ek JSON file ko datastore ki tarah use karta hai (projects, milestones,
       employees, contacts, notifLog).
     • Har run par due notifications compute karta hai (START / DEADLINE /
       OVERDUE / HOURLY), idempotency keys se duplicates rok kar notifLog mein
       likhta hai, aur console par action list print karta hai.

   PRODUCTION MEIN:
     • DataAPI (shared/data.js) ko HTTP backend par point karo — README dekho.
     • sendEmail() ko Gmail API / SMTP se implement karo.
     • syncCalendar() ko Google Calendar API se implement karo
       (event id store karke update — duplicate events nahi, spec §22).
     • Is file ko cron (har 5–15 min) ya queue worker ke roop mein chalao.

   IMPORTANT (spec §73): jab tak email/calendar credentials configure nahi
   hain, ye worker kabhi CLAIM nahi karta ke email bhej diya — wo notification
   ko PREPARED status ke saath log karta hai aur integration gap report karta hai.

   Usage:
     node server/ops-scheduler.js --db ./ops-data.json          # one run
     node server/ops-scheduler.js --db ./ops-data.json --loop   # every 5 min
   ============================================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

/* shared engine — UI ke saath same rules */
global.window = undefined;
const Schema = require('../shared/schema.js');
globalThis.Schema = Schema;
const Utils = require('../shared/utils.js');
globalThis.Utils = Utils;
const SisOps = require('../shared/sis-ops.js');

/* ── args ────────────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] || true) : def;
}
const DB_PATH = arg('--db', path.join(__dirname, 'ops-data.json'));
const LOOP = args.includes('--loop');
const INTERVAL_MS = Number(arg('--interval', 5 * 60 * 1000));

/* ── datastore (demo: JSON file; production: replace with your backend) ──── */
function loadStore() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('[sis-scheduler] datastore not found: ' + DB_PATH);
    console.error('[sis-scheduler] Export one from the app (Settings → Export) or point --db at your backend dump.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
function saveStore(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/* ── integrations — honest stubs (spec §53/§54/§55/§73) ──────────────────── */
const EMAIL_CONFIGURED = false;      // set true after wiring Gmail API / SMTP
const CALENDAR_CONFIGURED = false;   // set true after wiring Google Calendar API

function sendEmail(recipients, subject, body) {
  if (!EMAIL_CONFIGURED) {
    return { sent: false, status: 'PREPARED', note: 'Integration Required: email API is not configured — notification logged, not sent.' };
  }
  /* TODO: Gmail API / SMTP send here; on failure return {sent:false, status:'DELIVERY_FAILED'} for retry (spec §55) */
  return { sent: true, status: 'SENT' };
}

function syncCalendar(project, milestone, owners) {
  if (!CALENDAR_CONFIGURED) {
    return { synced: false, note: 'Integration Required: Google Calendar API is not configured.' };
  }
  /* TODO: create/patch event by stored milestone.calendarEventId — never create duplicates (spec §22/§61) */
  return { synced: true };
}

/* ── one monitoring pass — idempotent (spec §61) ─────────────────────────── */
function runOnce() {
  const db = loadStore();
  db.notifLog = db.notifLog || [];
  const people = { users: db.employees || [], contacts: db.contacts || [] };
  const projects = (db.projects || []).filter(p => p.kind === 'IMMIGRATION' || true); // sab active projects monitor karo
  const now = new Date();

  const due = SisOps.computeDueNotifications(projects, db.milestones || [], people, now);
  let acted = 0, skipped = 0;

  for (const n of due) {
    if (db.notifLog.some(l => l.key === n.key)) { skipped++; continue; }   // duplicate suppressed
    const emails = n.recipients.map(r => r.email).filter(Boolean);
    const result = sendEmail(emails, SisOps.notifSubject(n.kind, n.p), SisOps.notifBody(n.kind, n.p, n.m, n.recipients, { hoursLate: n.hoursLate }));
    db.notifLog.push({
      id: db.notifLog.length + 97001,
      key: n.key, kind: n.kind,
      milestoneId: n.m.id, projectId: n.p.id,
      recipients: emails, channel: EMAIL_CONFIGURED ? 'email' : 'manual-email',
      status: result.status, at: now.toISOString()
    });
    acted++;
    console.log('[sis-scheduler] ' + n.kind.padEnd(8) + ' ' + n.p.name + ' — ' + n.m.title +
      ' → ' + (emails.join(', ') || 'no email on file') + ' [' + result.status + ']' +
      (result.note ? '  (' + result.note + ')' : ''));
  }

  /* project risk sweep (spec §60) */
  for (const p of projects.filter(p => p.status !== 'COMPLETED')) {
    const rk = SisOps.riskLevel(p, db.milestones || []);
    if (rk.level !== 'ON_TRACK') {
      const key = 'RISK:' + p.id + ':' + now.toISOString().slice(0, 10) + ':' + rk.level;
      if (!db.notifLog.some(l => l.key === key)) {
        db.notifLog.push({ id: db.notifLog.length + 97001, key, kind: 'RISK', projectId: p.id, recipients: [], channel: 'log', status: 'FLAGGED', at: now.toISOString() });
        console.log('[sis-scheduler] RISK     ' + p.name + ' → ' + rk.level + ': ' + rk.reasons.join(' ') +
          (rk.recommendation ? ' | Recommendation: ' + rk.recommendation : ''));
      }
    }
  }

  saveStore(db);
  console.log('[sis-scheduler] pass complete — ' + acted + ' notification(s) processed, ' + skipped + ' duplicate(s) suppressed.');
  if (!EMAIL_CONFIGURED)
    console.log('[sis-scheduler] NOTE: email integration not configured — nothing was actually emailed (spec §73 honesty rule).');
}

runOnce();
if (LOOP) {
  console.log('[sis-scheduler] loop mode — every ' + Math.round(INTERVAL_MS / 60000) + ' min. Ctrl+C to stop.');
  setInterval(runOnce, INTERVAL_MS);
}
