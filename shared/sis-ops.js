/* ============================================================================
   SIS OPS v2 — Immigration Operations Engine
   ----------------------------------------------------------------------------
   Pure functions — UI (cases.js / sisops.js) AUR future backend scheduler
   (server/ops-scheduler.js) dono yahi engine use karte hain.

   Spec coverage:
     §4/§50  generic people architecture (users + external contacts, id-based)
     §21/§22 calendar event builders ([SIS] naming, description template)
     §23–§27 notification computation with idempotency keys
     §25/§29 derived OVERDUE + stored BLOCKED
     §40     transparent rule-based risk engine (no fake AI)
     §41     daily operations report (dynamic per-person queues)

   Load order: schema.js → utils.js → sis-ops.js
   ============================================================================ */

(function (root) {
  'use strict';

  /* ── Initial team (spec §5) — sirf convenience constants; business logic
     names par NAHI, ids/emails par chalti hai ─────────────────────────── */
  var TEAM = {
    HUMERA: { id: 10, name: 'Humera Khan', role: 'CEO',        email: 'humera@stansteadimmigration.com' },
    NABEEL: { id: 11, name: 'Nabeel Ali',  role: 'Operations', email: 'alinabeelauctech@gmail.com' }
  };

  var SERVICES = (root.Schema && root.Schema.SIS_SERVICES) || [];
  var SERVICE_GROUPS = (root.Schema && root.Schema.SERVICE_GROUPS) || [];

  /* ── Date helpers ────────────────────────────────────────────────────── */
  function today() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function parseDay(iso) {
    if (!iso) return null;
    var d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
    return isNaN(d) ? null : d;
  }
  function daysUntil(iso) {
    var d = parseDay(iso);
    if (!d) return null;
    return Math.round((d - today()) / 86400000);
  }
  function fmt(iso) {
    var d = parseDay(iso);
    if (!d) return '\u2014';
    return d.toLocaleDateString('en-CA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ==========================================================================
     PEOPLE RESOLUTION (spec §4/§50/§51)
     ownerRefs: [{type:'user'|'contact', id}] — naam kahin store nahi hota.
     ========================================================================== */
  function normPeople(people) {
    if (Array.isArray(people)) return { users: people, contacts: [] };
    people = people || {};
    return { users: people.users || people.employees || [], contacts: people.contacts || [] };
  }

  function resolveRef(ref, people) {
    var P = normPeople(people);
    var pool = ref.type === 'contact' ? P.contacts : P.users;
    var x = pool.filter(function (e) { return e.id === ref.id; })[0];
    if (!x) return { id: ref.id, type: ref.type || 'user', name: 'Unknown', email: '' };
    return { id: x.id, type: ref.type || 'user', name: x.name, email: x.email || '', role: x.role || x.type || '' };
  }

  function ownersOf(ms, project, people) {
    var refs = (ms && Array.isArray(ms.ownerRefs) && ms.ownerRefs.length) ? ms.ownerRefs
      : (ms && ms.ownerId != null) ? [{ type: 'user', id: ms.ownerId }]
      : (project && Array.isArray(project.ownerRefs) && project.ownerRefs.length) ? project.ownerRefs
      : (project && project.headId != null) ? [{ type: 'user', id: project.headId }]
      : [];
    var seen = {};
    return refs.map(function (r) { return resolveRef(r, people); })
      .filter(function (o) { var k = o.type + ':' + o.id; if (seen[k]) return false; seen[k] = true; return true; });
  }

  /* Back-compat: single primary owner */
  function ownerOf(ms, project, employees) {
    var arr = ownersOf(ms, project, { users: employees });
    return arr[0] || { id: null, name: 'Unassigned', email: '' };
  }

  /* Notification recipients (spec §14/§32): owners + project notifyRefs,
     duplicate emails removed */
  function recipientsOf(ms, project, people) {
    var out = ownersOf(ms, project, people);
    ((project && project.notifyRefs) || []).forEach(function (r) { out.push(resolveRef(r, people)); });
    var seen = {};
    return out.filter(function (o) {
      var k = (o.email || (o.type + ':' + o.id)).toLowerCase();
      if (seen[k]) return false; seen[k] = true; return true;
    });
  }

  /* ==========================================================================
     SIGNAL LEVELS (spec §35) — OVERDUE derived, BLOCKED stored
     ========================================================================== */
  var LEVELS = {
    COMPLETED: { key: 'COMPLETED', emoji: '\u2705',                     label: 'Completed',   tone: 'green', order: 0 },
    NORMAL:    { key: 'NORMAL',    emoji: '\uD83D\uDFE2',               label: 'On Track',    tone: 'green', order: 1 },
    DUE_SOON:  { key: 'DUE_SOON',  emoji: '\uD83D\uDFE1',               label: 'Due Soon',    tone: 'amber', order: 2 },
    ATTENTION: { key: 'ATTENTION', emoji: '\uD83D\uDFE0',               label: 'Due Today',   tone: 'amber', order: 3 },
    BLOCKED:   { key: 'BLOCKED',   emoji: '\u26D4',                     label: 'Blocked',     tone: 'red',   order: 4 },
    OVERDUE:   { key: 'OVERDUE',   emoji: '\uD83D\uDD34',               label: 'Overdue',     tone: 'red',   order: 5 },
    CRITICAL:  { key: 'CRITICAL',  emoji: '\uD83D\uDD34\uD83D\uDD34',   label: 'Critical \u2014 Final Deadline at Risk', tone: 'red', order: 6 }
  };

  function signal(ms, project, projectAtRisk) {
    if (!ms) return LEVELS.NORMAL;
    if (ms.status === 'DONE' || ms.status === 'CANCELLED') return LEVELS.COMPLETED;
    var n = daysUntil(ms.dueDate);
    if (ms.status === 'BLOCKED')
      return (n != null && n < 0 && projectAtRisk) ? LEVELS.CRITICAL : LEVELS.BLOCKED;
    if (n == null) return LEVELS.NORMAL;
    if (n < 0) return projectAtRisk ? LEVELS.CRITICAL : LEVELS.OVERDUE;
    if (n === 0) return LEVELS.ATTENTION;
    if (n <= 3) return LEVELS.DUE_SOON;
    return LEVELS.NORMAL;
  }

  /* ==========================================================================
     PROJECT STATS + RISK ENGINE (spec §13/§40)
     ========================================================================== */
  function projectStats(project, milestones) {
    var ms = (milestones || []).filter(function (m) { return m.projectId === project.id; })
      .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
    var done = ms.filter(function (m) { return m.status === 'DONE'; });
    var cancelled = ms.filter(function (m) { return m.status === 'CANCELLED'; });
    var blocked = ms.filter(function (m) { return m.status === 'BLOCKED'; });
    var overdue = ms.filter(function (m) {
      var d = daysUntil(m.dueDate);
      return m.status !== 'DONE' && m.status !== 'CANCELLED' && d != null && d < 0;
    });
    var inProg = ms.filter(function (m) { return m.status === 'IN_PROGRESS'; });
    var required = ms.length - cancelled.length;
    var remaining = required - done.length;
    return {
      milestones: ms,
      total: ms.length,
      required: required,
      done: done.length,
      inProgress: inProg.length,
      blocked: blocked.length,
      overdue: overdue.length,
      remaining: remaining,
      pct: required ? Math.round((done.length / required) * 100) : 0,
      daysLeft: daysUntil(project.deadline),
      nextMilestone: ms.filter(function (m) { return m.status !== 'DONE' && m.status !== 'CANCELLED'; })[0] || null
    };
  }

  /* Rule-based risk engine — transparent rules, no fake AI (spec §40) */
  function riskLevel(project, milestones) {
    if (project.status === 'COMPLETED')
      return { level: 'ON_TRACK', reasons: [], recommendation: null, stats: projectStats(project, milestones) };
    var st = projectStats(project, milestones);
    var critical = [], atRisk = [];

    if (st.daysLeft != null && st.daysLeft < 0)
      critical.push('Final project deadline has already passed (' + fmt(project.deadline) + ').');
    if (st.daysLeft != null && st.daysLeft >= 0 && st.remaining > 0 && st.daysLeft < st.remaining)
      critical.push('Only ' + st.daysLeft + ' day(s) remain for ' + st.remaining + ' remaining milestone(s).');
    if (st.overdue >= 2)
      critical.push(st.overdue + ' milestones are overdue.');

    if (st.overdue === 1) atRisk.push('1 milestone is overdue.');
    if (st.blocked > 0) atRisk.push(st.blocked + ' milestone' + (st.blocked > 1 ? 's are' : ' is') + ' blocked.');
    if (st.daysLeft != null && st.daysLeft >= 0 && st.daysLeft <= 3 && st.remaining > 0)
      atRisk.push('Final deadline is only ' + st.daysLeft + ' day(s) away with ' + st.remaining + ' milestone(s) open.');

    /* Recommendation: earliest overdue/blocked milestone pehle */
    var trouble = st.milestones.filter(function (m) {
      var d = daysUntil(m.dueDate);
      return (m.status !== 'DONE' && m.status !== 'CANCELLED') &&
        (m.status === 'BLOCKED' || (d != null && d < 0));
    })[0];
    var rec = trouble
      ? (trouble.status === 'BLOCKED'
          ? 'Unblock "' + trouble.title + '" (' + (trouble.blockReason || 'reason on file') + ') \u2014 it is holding up the chain.'
          : 'Complete "' + trouble.title + '" immediately \u2014 it is overdue.')
      : (st.nextMilestone ? 'Keep "' + st.nextMilestone.title + '" on schedule.' : null);

    var level = critical.length ? 'CRITICAL' : (atRisk.length ? 'AT_RISK' : 'ON_TRACK');
    return { level: level, reasons: critical.concat(atRisk), recommendation: rec, stats: st };
  }

  /* Back-compat wrapper */
  function deadlineRisk(project, milestones) {
    var r = riskLevel(project, milestones);
    return { risk: r.level !== 'ON_TRACK', level: r.level, reasons: r.reasons, recommendation: r.recommendation, stats: r.stats };
  }

  /* ==========================================================================
     CALENDAR (spec §21/§22) — [SIS] [CLIENT] — [MILESTONE]
     ========================================================================== */
  function eventTitle(project, ms) {
    var who = project.clientName || project.name;
    return '[SIS] ' + who + ' \u2014 ' + ms.title;
  }

  function eventDescription(project, ms, owners) {
    var names = (owners || []).map(function (o) { return o.name; }).join(', ') || '\u2014';
    return 'Client:\n' + (project.clientName || '\u2014') +
      '\n\nService:\n' + (project.service || '\u2014') +
      '\n\nProject:\n' + project.name +
      '\n\nMilestone:\n' + ms.title +
      '\n\nAssigned To:\n' + names +
      '\n\nStart:\n' + (ms.startDate ? fmt(ms.startDate) + (ms.startTime ? ' ' + ms.startTime : '') : '\u2014') +
      '\n\nDeadline:\n' + fmt(ms.dueDate) +
      '\n\nPriority:\n' + (ms.priority || project.priority || '\u2014') +
      '\n\nStatus:\n' + (ms.status === 'DONE' ? 'Completed' : ms.status === 'BLOCKED' ? 'Blocked' : ms.status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started');
  }

  function gcalUrl(project, ms, ownerOrOwners) {
    var owners = Array.isArray(ownerOrOwners) ? ownerOrOwners : (ownerOrOwners ? [ownerOrOwners] : []);
    var d = parseDay(ms.dueDate) || today();
    function ymd(x) { return x.toISOString().slice(0, 10).replace(/-/g, ''); }
    var end = new Date(d.getTime() + 86400000);
    var guests = owners.map(function (o) { return o.email; }).filter(Boolean).join(',');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(eventTitle(project, ms)) +
      '&dates=' + ymd(d) + '/' + ymd(end) +
      '&details=' + encodeURIComponent(eventDescription(project, ms, owners)) +
      (guests ? '&add=' + encodeURIComponent(guests) : '');
  }

  function icsAll(projects, milestones, people) {
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'PRODID:-//Stanstead Immigration Services//SIS Ops//EN',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'
    ];
    function esc(x) { return String(x || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, function (c) { return '\\' + c; }); }
    function ymd(x) { return x.toISOString().slice(0, 10).replace(/-/g, ''); }
    (projects || []).forEach(function (p) {
      if (p.status === 'COMPLETED') return;
      (milestones || []).filter(function (m) { return m.projectId === p.id && m.status !== 'DONE' && m.status !== 'CANCELLED'; })
        .forEach(function (m) {
          var d = parseDay(m.dueDate); if (!d) return;
          var owners = ownersOf(m, p, people);
          lines.push(
            'BEGIN:VEVENT',
            'UID:sis-ms-' + m.id + '@stansteadimmigration.com',   // stable UID — re-import = update, duplicate nahi (§22/§61)
            'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
            'DTSTART;VALUE=DATE:' + ymd(d),
            'DTEND;VALUE=DATE:' + ymd(new Date(d.getTime() + 86400000)),
            'SUMMARY:' + esc(eventTitle(p, m)),
            'DESCRIPTION:' + esc(eventDescription(p, m, owners)),
            'BEGIN:VALARM', 'TRIGGER:-PT9H', 'ACTION:DISPLAY',
            'DESCRIPTION:' + esc('Milestone due today: ' + m.title), 'END:VALARM',
            'END:VEVENT'
          );
        });
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /* ==========================================================================
     EMAIL BUILDERS (spec §23/§24/§25/§26/§53)
     ========================================================================== */
  function mailto(emails, subject, body) {
    var to = Array.isArray(emails) ? emails.filter(Boolean).join(',') : emails;
    return 'mailto:' + to +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  function notifSubject(kind, project) {
    var map = {
      START: 'Milestone Started', DEADLINE: 'Milestone Deadline',
      OVERDUE: 'Milestone Overdue', HOURLY: 'Overdue Reminder', RISK: 'Project At Risk'
    };
    return '[SIS] ' + (map[kind] || 'Update') + ' \u2014 ' + project.name;
  }

  function notifBody(kind, project, ms, owners, extra) {
    var names = (owners || []).map(function (o) { return o.name; }).join(', ') || '\u2014';
    var head = {
      START:   'Milestone Started',
      DEADLINE:'Milestone Deadline',
      OVERDUE: 'OVERDUE MILESTONE \uD83D\uDD34',
      HOURLY:  'Hourly Operations Reminder \uD83D\uDD34'
    }[kind] || 'Update';
    var tail = {
      START:   'Please begin this milestone.',
      DEADLINE:'This milestone is due now.\nPlease mark it Completed or update the deadline.',
      OVERDUE: 'This milestone is now overdue.\nPlease complete it or request a reschedule.',
      HOURLY:  'Please complete the milestone or update its status.'
    }[kind] || '';
    return head +
      '\n\nProject: ' + project.name +
      '\nClient: ' + (project.clientName || '\u2014') +
      '\nService: ' + (project.service || '\u2014') +
      '\nMilestone: ' + ms.title +
      '\nAssigned To: ' + names +
      '\nDeadline: ' + fmt(ms.dueDate) +
      (extra && extra.hoursLate ? '\nDeadline passed: ' + extra.hoursLate + ' hour(s) ago' : '') +
      '\nStatus: ' + (ms.status === 'DONE' ? 'Completed' : kind === 'OVERDUE' || kind === 'HOURLY' ? 'NOT COMPLETED' : ms.status) +
      '\n\n' + tail +
      '\n\n\u2014 SIS Operations, Stanstead Immigration Services';
  }

  function reminderMail(kind, project, ms, ownerOrOwners, extra) {
    var owners = Array.isArray(ownerOrOwners) ? ownerOrOwners : (ownerOrOwners ? [ownerOrOwners] : []);
    var k = kind === 'DUE' ? 'DEADLINE' : kind;   // back-compat
    return mailto(owners.map(function (o) { return o.email; }),
      notifSubject(k, project), notifBody(k, project, ms, owners, extra));
  }

  /* ==========================================================================
     NOTIFICATION COMPUTATION (spec §23–§27) — pure, scheduler-ready
     UI aur backend scheduler dono isko chala sakte hain; idempotency keys
     DataAPI.logNotification ke saath duplicates rok deti hain (§61).
     ========================================================================== */
  function computeDueNotifications(projects, milestones, people, now) {
    now = now || new Date();
    var todayIso = now.toISOString().slice(0, 10);
    var hourBucket = now.toISOString().slice(0, 13);
    var out = [];
    (projects || []).filter(function (p) { return p.status !== 'COMPLETED'; }).forEach(function (p) {
      (milestones || []).filter(function (m) { return m.projectId === p.id; }).forEach(function (m) {
        if (m.status === 'DONE' || m.status === 'CANCELLED') return;   // completed = no reminders (§10/§28)
        var recips = recipientsOf(m, p, people);
        var d = daysUntil(m.dueDate);
        if (m.startDate === todayIso && m.status === 'UPCOMING')
          out.push({ key: 'START:' + m.id + ':' + todayIso, kind: 'START', m: m, p: p, recipients: recips });
        if (d === 0 && m.status !== 'BLOCKED')
          out.push({ key: 'DEADLINE:' + m.id + ':' + todayIso, kind: 'DEADLINE', m: m, p: p, recipients: recips });
        if (d != null && d < 0 && m.status !== 'BLOCKED') {
          var hrs = Math.max(1, Math.round(-d * 24));
          out.push({ key: 'OVERDUE:' + m.id + ':' + (m.dueDate || ''), kind: 'OVERDUE', m: m, p: p, recipients: recips, hoursLate: hrs });
          out.push({ key: 'HOURLY:' + m.id + ':' + hourBucket, kind: 'HOURLY', m: m, p: p, recipients: recips, hoursLate: hrs });
        }
      });
    });
    return out;
  }

  /* ==========================================================================
     DAILY OPERATIONS REPORT (spec §41) — dynamic per-person queues
     ========================================================================== */
  function dailyReport(projects, milestones, people) {
    var active = (projects || []).filter(function (p) { return p.status !== 'COMPLETED'; });
    var rows = [];
    active.forEach(function (p) {
      var atRisk = riskLevel(p, milestones).level !== 'ON_TRACK';
      (milestones || []).filter(function (m) { return m.projectId === p.id; }).forEach(function (m) {
        var os = ownersOf(m, p, people);
        rows.push({ p: p, m: m, owners: os,
                    owner: os[0] || { id: null, name: 'Unassigned', email: '' },
                    sig: signal(m, p, atRisk), days: daysUntil(m.dueDate) });
      });
    });
    var pending = rows.filter(function (r) { return r.m.status !== 'DONE' && r.m.status !== 'CANCELLED'; });
    function by(fn) { return pending.filter(fn); }

    /* dynamic per-person queues — users AND external contacts */
    var ownerMap = {};
    pending.forEach(function (r) {
      var os = r.owners.length ? r.owners : [{ id: 0, type: 'none', name: 'Unassigned', email: '' }];
      os.forEach(function (o) {
        var k = o.type + ':' + o.id;
        if (!ownerMap[k]) ownerMap[k] = { key: k, person: o, items: [] };
        ownerMap[k].items.push(r);
      });
    });
    var byOwner = Object.keys(ownerMap).map(function (k) { return ownerMap[k]; })
      .sort(function (a, b) { return b.items.length - a.items.length; });

    function byEmail(email) {
      var g = byOwner.filter(function (o) { return (o.person.email || '').toLowerCase() === email; })[0];
      return g ? g.items : [];
    }

    return {
      dueToday:   by(function (r) { return r.days === 0 && r.m.status !== 'BLOCKED'; }),
      dueSoon:    by(function (r) { return r.days != null && r.days > 0 && r.days <= 3 && r.m.status !== 'BLOCKED'; }),
      overdue:    by(function (r) { return r.days != null && r.days < 0 && r.m.status !== 'BLOCKED'; }),
      blocked:    by(function (r) { return r.m.status === 'BLOCKED'; }),
      unassigned: by(function (r) { return !r.owners.length; }),
      completed:  rows.filter(function (r) { return r.m.status === 'DONE'; }),
      byOwner:    byOwner,
      nabeel:     byEmail(TEAM.NABEEL.email),
      humera:     byEmail(TEAM.HUMERA.email),
      risks:      active.map(function (p) { var r = deadlineRisk(p, milestones); r.project = p; return r; })
                        .filter(function (r) { return r.risk; }),
      rows: rows, pending: pending, active: active
    };
  }

  function reportText(rep) {
    function line(r) {
      var names = r.owners.map(function (o) { return o.name; }).join(', ') || 'Unassigned';
      return '  \u2022 ' + r.p.name + ' \u2014 ' + r.m.title + ' (Owner: ' + names + ', Due: ' + fmt(r.m.dueDate) + ')';
    }
    var t = 'SIS DAILY OPERATIONS REPORT \u2014 ' + new Date().toLocaleDateString('en-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '\n\n';
    t += 'DUE TODAY (' + rep.dueToday.length + ')\n' + (rep.dueToday.map(line).join('\n') || '  \u2014 none') + '\n\n';
    t += 'OVERDUE \uD83D\uDD34 (' + rep.overdue.length + ')\n' + (rep.overdue.map(line).join('\n') || '  \u2014 none') + '\n\n';
    t += 'BLOCKED \u26D4 (' + rep.blocked.length + ')\n' +
      (rep.blocked.map(function (r) { return line(r) + (r.m.blockReason ? ' \u2014 ' + r.m.blockReason : ''); }).join('\n') || '  \u2014 none') + '\n\n';
    t += 'DUE SOON \uD83D\uDFE1 (' + rep.dueSoon.length + ')\n' + (rep.dueSoon.map(line).join('\n') || '  \u2014 none') + '\n\n';
    rep.byOwner.forEach(function (g) {
      t += g.person.name.toUpperCase() + (g.person.type === 'contact' ? ' (EXTERNAL)' : '') +
        ' \u2014 PENDING (' + g.items.length + ')\n' + (g.items.map(line).join('\n') || '  \u2014 none') + '\n\n';
    });
    t += 'CRITICAL \uD83D\uDD34\uD83D\uDD34 PROJECT DEADLINE RISK (' + rep.risks.length + ')\n';
    t += (rep.risks.map(function (r) {
      return '  \u2022 ' + r.project.name + ': ' + r.reasons.join(' ') +
        (r.recommendation ? ' Recommendation: ' + r.recommendation : '');
    }).join('\n') || '  \u2014 none');
    return t;
  }

  root.SisOps = {
    TEAM: TEAM,
    SERVICES: SERVICES,
    SERVICE_GROUPS: SERVICE_GROUPS,
    LEVELS: LEVELS,
    signal: signal,
    resolveRef: resolveRef,
    ownerOf: ownerOf,
    ownersOf: ownersOf,
    recipientsOf: recipientsOf,
    projectStats: projectStats,
    riskLevel: riskLevel,
    deadlineRisk: deadlineRisk,
    eventTitle: eventTitle,
    eventDescription: eventDescription,
    gcalUrl: gcalUrl,
    icsAll: icsAll,
    reminderMail: reminderMail,
    notifSubject: notifSubject,
    notifBody: notifBody,
    mailto: mailto,
    computeDueNotifications: computeDueNotifications,
    dailyReport: dailyReport,
    reportText: reportText,
    daysUntil: daysUntil,
    fmt: fmt
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.SisOps;

})(typeof window !== 'undefined' ? window : globalThis);
