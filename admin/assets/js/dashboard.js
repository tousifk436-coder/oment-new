/* ============================================================================
   DASHBOARD — "what needs me right now"
   ----------------------------------------------------------------------------
   Do cheezein theek ki gayi hain:

   1. CRASH — renderMilestoneSummary() do aise functions call karta tha jo kahin
      define hi nahi the: getMilestoneProgress() aur isMilestoneComplete().
      Jab tak koi bhi case mein ek bhi milestone nahi tha, loop chalta hi nahi
      tha, is liye app kabhi-kabhi khul jaata tha — pehla milestone banate hi
      boot fail. Ab dono helpers niche define hain, aur har widget apne
      try/catch mein chalta hai, taaki ek widget poora workspace na le doobe.

   2. DEAD UI — Projects / Departments / Invoices / Messages modules hata diye
      gaye the, par dashboard abhi bhi unke cards aur links dikhata tha
      (khaali "Recent Messages", "Een kehta hai", aur aise buttons jo undefined
      functions call karte the). Wo sab hata diya — ab dashboard sirf un
      modules par jaata hai jo asal mein maujood hain: Cases, Operations,
      People, Calendar.

   Saare emoji hata ke inline SVG (shared/icons.js) laga diye hain.
   ============================================================================ */

/* ── Milestone helpers ────────────────────────────────────────────────────
   STATE.projects[].milestones[] par pehle se `progress` ({done,total,pct})
   aur `status` maujood hai (state.js projection). Ye helpers usi ko padhte
   hain, aur zarurat pade toh DataAPI par gir jaate hain. */

function _findMilestone(projectId, milestoneId) {
  var projects = (typeof STATE !== 'undefined' && STATE.projects) || [];
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    if (Number(p.id) !== Number(projectId) || !Array.isArray(p.milestones)) continue;
    for (var j = 0; j < p.milestones.length; j++) {
      if (Number(p.milestones[j].id) === Number(milestoneId)) return p.milestones[j];
    }
  }
  return null;
}

/** @returns {{done:number,total:number,pct:number}} — kabhi null nahi. */
function getMilestoneProgress(projectId, milestoneId) {
  var m = _findMilestone(projectId, milestoneId);
  if (m && m.progress && typeof m.progress.total === 'number') return m.progress;

  if (typeof DataAPI !== 'undefined' && typeof DataAPI.milestoneProgress === 'function') {
    try {
      var p = DataAPI.milestoneProgress(milestoneId);
      if (p) return p;
    } catch (e) { /* DataAPI abhi boot nahi hua */ }
  }
  return { done: 0, total: 0, pct: 0 };
}

/** Milestone poora ho gaya? Status 'Done' bhi ginta hai — chahe koi
    deliverable attach na ho (warna manually-closed milestone hamesha
    pending dikhta tha). */
function isMilestoneComplete(projectId, milestoneId) {
  var m = _findMilestone(projectId, milestoneId);
  if (m && m.status === 'Done') return true;
  var prog = getMilestoneProgress(projectId, milestoneId);
  return prog.total > 0 && prog.done === prog.total;
}

/** Overdue = due date nikal gayi aur kaam poora nahi hua. */
function isMilestoneOverdue(projectId, milestone, today) {
  if (!milestone || !milestone.date) return false;
  if (isMilestoneComplete(projectId, milestone.id)) return false;
  var d = new Date(milestone.date);
  if (isNaN(d)) return false;
  d.setHours(0, 0, 0, 0);
  return d < today;
}

/* ── Render orchestration ─────────────────────────────────────────────────
   Har widget alag se run hota hai. Ek widget throw kare toh sirf uske card
   mein error dikhega — boot overlay ab poora app nahi rokega. */

function _widget(label, targetId, fn) {
  try {
    fn();
  } catch (err) {
    console.error('Dashboard widget failed: ' + label, err);
    var el = document.getElementById(targetId);
    if (el) {
      el.innerHTML =
        '<div class="widget-error">' +
          Icons.svg('alert-circle', 18) +
          '<div><div class="widget-error-title">' + esc(label) + ' couldn\'t load</div>' +
          '<div class="widget-error-sub">' + esc(String(err && err.message || err)) + '</div></div>' +
          '<button class="btn btn-secondary btn-xs" onclick="renderDashboard()">Retry</button>' +
        '</div>';
    }
  }
}

function renderDashboard() {
  _widget('Today',            'dash-hero',          renderDashHero);
  _widget('Key numbers',      'stats-bar',          renderStatsBar);
  _widget('Needs attention',  'critical-alerts',    renderCriticalAlerts);
  _widget('Activity',         'activity-feed',      renderActivityFeed);
  _widget('Milestone tracker','milestone-summary-body', renderMilestoneSummary);
  _widget('Team load',        'team-load',          renderTeamLoad);
  _widget('Ready to invoice', 'unbilled-snapshot',  renderUnbilled);
}

/* ── Signature: today strip ──────────────────────────────────────────────── */

function _todayCounts() {
  var todayISO = Utils.isoDate(new Date());
  var today = new Date(); today.setHours(0, 0, 0, 0);

  var tasks = STATE.tasks || [];
  var overdue = tasks.filter(function (t) {
    return t.canonicalStatus !== 'DONE' && t.deadline && t.deadline < todayISO;
  });
  var dueToday = tasks.filter(function (t) {
    return t.canonicalStatus !== 'DONE' && t.deadline === todayISO;
  });
  var review = tasks.filter(function (t) { return t.canonicalStatus === 'IN_REVIEW'; });

  var msOverdue = 0;
  (STATE.projects || []).forEach(function (p) {
    (p.milestones || []).forEach(function (m) {
      if (isMilestoneOverdue(p.id, m, today)) msOverdue++;
    });
  });

  return {
    overdue: overdue.length,
    dueToday: dueToday.length,
    review: review.length,
    msOverdue: msOverdue,
    present: (STATE.employees || []).filter(function (e) { return e.status === 'Present'; }).length,
    headcount: (STATE.employees || []).length,
    activeCases: (STATE.projects || []).filter(function (p) { return p.status === 'Active'; }).length,
    totalCases: (STATE.projects || []).length
  };
}

function renderDashHero() {
  var el = document.getElementById('dash-hero');
  if (!el) return;

  var c = _todayCounts();
  var admin = STATE.adminUser || {};
  var first = String(admin.name || 'there').split(' ')[0];
  var h = new Date().getHours();
  var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  var greetIcon = h < 12 ? 'sun' : h < 17 ? 'sun' : 'globe';

  var dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  /* Sirf wahi chips jinke peeche kaam hai — khaali zeros dikha ke
     dashboard ko bhara hua dikhana bekaar hai. */
  var chips = [];
  if (c.overdue)   chips.push(['alert-triangle', c.overdue + ' past deadline', 'danger', "gotoModule('cases')"]);
  if (c.msOverdue) chips.push(['flag', c.msOverdue + ' milestone' + (c.msOverdue > 1 ? 's' : '') + ' overdue', 'danger', "gotoModule('cases')"]);
  if (c.review)    chips.push(['eye', c.review + ' awaiting review', 'warn', "gotoModule('cases')"]);
  if (c.dueToday)  chips.push(['clock', c.dueToday + ' due today', 'warn', "gotoModule('cases')"]);
  if (!chips.length) chips.push(['check-circle', 'Nothing overdue', 'ok', "gotoModule('sisops')"]);
  chips.push(['users', c.present + ' of ' + c.headcount + ' on duty', 'calm', "gotoModule('hrm')"]);

  el.innerHTML =
    '<div class="dash-hero">' +
      '<div class="dash-hero-main">' +
        '<div class="dash-hero-org">' + esc((STATE.company && STATE.company.name) || 'Workspace') + '</div>' +
        '<h1 class="dash-hero-title">' + Icons.svg(greetIcon, 20) + greet + ', ' + esc(first) + '</h1>' +
        '<div class="dash-hero-date">' + esc(dateLabel) + '</div>' +
      '</div>' +
      '<div class="dash-hero-chips">' +
        chips.map(function (ch) {
          return '<button class="live-chip live-' + ch[2] + '" onclick="' + ch[3] + '">' +
                   Icons.svg(ch[0], 13) + '<span>' + esc(ch[1]) + '</span>' +
                 '</button>';
        }).join('') +
      '</div>' +
    '</div>';
}

/* ── Stat rail ───────────────────────────────────────────────────────────── */

function renderStatsBar() {
  var el = document.getElementById('stats-bar');
  if (!el) return;

  var c = _todayCounts();
  var closed = (STATE.projects || []).filter(function (p) { return p.status === 'Completed'; }).length;

  var tiles = [
    { label: 'Active cases',   value: c.activeCases, icon: 'folder', tone: 'spruce',
      sub: c.totalCases ? c.totalCases + ' total · ' + closed + ' closed' : 'No cases yet',
      go: "gotoModule('cases')" },

    { label: 'Awaiting review', value: c.review, icon: 'eye',
      tone: c.review ? 'amber' : 'neutral',
      sub: c.review ? 'Team is blocked until you clear these' : 'Nothing in your queue',
      go: "gotoModule('cases')" },

    /* Deliverables AUR milestones dono ginte hain. Pehle sirf deliverables
       ginte the, to hero "1 milestone overdue" dikhata tha aur ye tile ke
       saath "0 / all on schedule" \u2014 do jagah do alag sach. */
    { label: 'Past deadline',   value: c.overdue + c.msOverdue, icon: 'alert-triangle',
      tone: (c.overdue + c.msOverdue) ? 'red' : 'green',
      sub: (c.overdue + c.msOverdue)
        ? [c.msOverdue ? c.msOverdue + ' milestone' + (c.msOverdue > 1 ? 's' : '') : null,
           c.overdue   ? c.overdue   + ' deliverable' + (c.overdue > 1 ? 's' : '') : null
          ].filter(Boolean).join(' \u00b7 ') + ' overdue'
        : 'Everything on schedule',
      go: "gotoModule('sisops')" },

    { label: 'On duty today',   value: c.present + '/' + c.headcount, icon: 'users',
      tone: 'blue',
      sub: c.headcount ? Math.round(c.present / c.headcount * 100) + '% of the team' : 'No one on the roster',
      go: "gotoModule('hrm')" }
  ];

  el.innerHTML = tiles.map(function (t) {
    return '<button class="stat-card tone-' + t.tone + '" onclick="' + t.go + '">' +
             '<div class="stat-head">' +
               '<span class="stat-label">' + esc(t.label) + '</span>' +
               '<span class="stat-icon">' + Icons.svg(t.icon, 15) + '</span>' +
             '</div>' +
             '<div class="stat-value">' + t.value + '</div>' +
             '<div class="stat-sub">' + esc(t.sub) + '</div>' +
           '</button>';
  }).join('');
}

/* ── Needs attention ─────────────────────────────────────────────────────── */

function renderCriticalAlerts() {
  var el = document.getElementById('critical-alerts');
  if (!el) return;

  var todayISO = Utils.isoDate(new Date());
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var tasks = STATE.tasks || [];

  var review    = tasks.filter(function (t) { return t.canonicalStatus === 'IN_REVIEW'; });
  var overdue   = tasks.filter(function (t) {
    return t.canonicalStatus !== 'DONE' && t.deadline && t.deadline < todayISO; });
  var unassigned = tasks.filter(function (t) {
    return t.canonicalStatus !== 'DONE' && (!t.assignees || !t.assignees.length); });
  var absent    = (STATE.employees || []).filter(function (e) { return e.status === 'Absent'; });

  var msOverdue = [];
  (STATE.projects || []).forEach(function (p) {
    (p.milestones || []).forEach(function (m) {
      if (isMilestoneOverdue(p.id, m, today)) msOverdue.push({ p: p, m: m });
    });
  });

  var alerts = [];

  if (review.length) alerts.push({
    icon: 'eye', tone: 'amber',
    title: review.length + ' deliverable' + (review.length > 1 ? 's' : '') + ' awaiting review',
    sub: 'Team is blocked until you approve or return these',
    cta: 'Review', go: "gotoModule('cases')"
  });

  if (msOverdue.length) alerts.push({
    icon: 'flag', tone: 'red',
    title: msOverdue.length + ' milestone' + (msOverdue.length > 1 ? 's' : '') + ' past due',
    sub: msOverdue.slice(0, 2).map(function (x) { return x.m.title; }).join(' · ') +
         (msOverdue.length > 2 ? ' +' + (msOverdue.length - 2) + ' more' : ''),
    cta: 'Open', go: "jumpToMilestone(" + _dashboardJsId(msOverdue[0].p.id) + ")"
  });

  if (overdue.length) alerts.push({
    icon: 'clock', tone: 'red',
    title: overdue.length + ' deliverable' + (overdue.length > 1 ? 's' : '') + ' past deadline',
    sub: 'Client commitments at risk',
    cta: 'Open', go: "gotoModule('sisops')"
  });

  if (unassigned.length) alerts.push({
    icon: 'user-x', tone: 'blue',
    title: unassigned.length + ' task' + (unassigned.length > 1 ? 's' : '') + ' with no owner',
    sub: 'Nobody has been assigned yet',
    cta: 'Assign', go: "gotoModule('cases')"
  });

  if (absent.length) alerts.push({
    icon: 'user', tone: 'neutral',
    title: absent.length + ' ' + (absent.length > 1 ? 'people are' : 'person is') + ' absent today',
    sub: 'No attendance recorded',
    cta: 'View', go: "gotoModule('hrm')"
  });

  if (!alerts.length) {
    el.innerHTML =
      '<div class="empty-state">' +
        Icons.badge('check-circle', { tone: 'green', box: 44, size: 22 }) +
        '<div class="empty-title">You\'re all caught up</div>' +
        '<div class="empty-sub">Nothing overdue, nothing waiting on you.</div>' +
      '</div>';
    return;
  }

  el.innerHTML = alerts.map(function (a) {
    return '<div class="alert-item tone-' + a.tone + '">' +
             Icons.badge(a.icon, { tone: a.tone, box: 32, size: 16 }) +
             '<div class="alert-body">' +
               '<div class="alert-title">' + esc(a.title) + '</div>' +
               '<div class="alert-sub">' + esc(a.sub) + '</div>' +
             '</div>' +
             '<button class="btn btn-secondary btn-xs" onclick="' + a.go + '">' + esc(a.cta) + '</button>' +
           '</div>';
  }).join('');
}

/* ── Activity ────────────────────────────────────────────────────────────── */

function renderActivityFeed() {
  var el = document.getElementById('activity-feed');
  if (!el) return;

  var feed = STATE.activityFeed || [];
  if (!feed.length) {
    el.innerHTML =
      '<div class="empty-state">' +
        Icons.badge('activity', { tone: 'neutral', box: 44, size: 22 }) +
        '<div class="empty-title">No activity yet</div>' +
        '<div class="empty-sub">Case updates and submissions will show up here.</div>' +
      '</div>';
    return;
  }

  /* a.icon purane records mein emoji ho sakta hai — Icons.svg() usko
     apne aap naye icon naam par map kar deta hai. */
  el.innerHTML = feed.slice(0, 12).map(function (a) {
    return '<div class="activity-item">' +
             '<span class="icon-badge activity-icon" style="background:' + (a.color || 'var(--s2)') + '">' +
               Icons.svg(a.icon, 15) +
             '</span>' +
             '<div class="activity-body">' +
               '<div class="activity-text">' + Utils.sanitizeHtml(a.text) + '</div>' +
               '<div class="activity-time">' + esc(a.time) + '</div>' +
             '</div>' +
           '</div>';
  }).join('');
}

/* ── Milestone tracker ───────────────────────────────────────────────────── */

function renderMilestoneSummary() {
  var body = document.getElementById('milestone-summary-body');
  var sub  = document.getElementById('ms-summary-sub');
  if (!body) return;

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var totalMs = 0, doneMs = 0, inProgressMs = 0, overdueMs = 0;

  (STATE.projects || []).forEach(function (p) {
    if (!Array.isArray(p.milestones)) return;
    p.milestones.forEach(function (m) {
      totalMs++;
      if (isMilestoneComplete(p.id, m.id)) doneMs++;
      else if (isMilestoneOverdue(p.id, m, today)) overdueMs++;
      else if (m.status === 'In Progress') inProgressMs++;
    });
  });

  if (sub) {
    sub.textContent = totalMs
      ? totalMs + ' milestones · ' + doneMs + ' done · ' + overdueMs + ' overdue'
      : 'No milestones yet';
  }

  var stats = [
    ['Total',       'flag',           totalMs,      'neutral'],
    ['Completed',   'check-circle',   doneMs,       'green'],
    ['In progress', 'rotate',         inProgressMs, 'blue'],
    ['Overdue',     'alert-triangle', overdueMs,    'red']
  ];

  var statsHTML =
    '<div class="ms-stat-row">' +
      stats.map(function (s) {
        return '<button class="ms-stat tone-' + s[3] + '"' +
                 (s[2] > 0 ? ' onclick="gotoModule(\'cases\')"' : ' disabled') + '>' +
                 '<span class="ms-stat-icon">' + Icons.svg(s[1], 15) + '</span>' +
                 '<span class="ms-stat-val">' + s[2] + '</span>' +
                 '<span class="ms-stat-label">' + s[0] + '</span>' +
               '</button>';
      }).join('') +
    '</div>';

  var rows = (STATE.projects || []).map(function (p) {
    if (!Array.isArray(p.milestones) || !p.milestones.length) return '';

    var ms      = p.milestones;
    var doneCnt = ms.filter(function (m) { return isMilestoneComplete(p.id, m.id); }).length;
    var pct     = Math.round(doneCnt / ms.length * 100);
    var next    = ms.filter(function (m) { return !isMilestoneComplete(p.id, m.id); })[0];

    var stateTone = p.status === 'Completed' ? 'green'
                  : p.status === 'Active'    ? 'spruce'
                  : p.status === 'On Hold'   ? 'amber' : 'neutral';

    var pills = ms.map(function (m) {
      var done    = isMilestoneComplete(p.id, m.id);
      var overdue = isMilestoneOverdue(p.id, m, today);
      var tone    = done ? 'green' : overdue ? 'red'
                  : m.status === 'In Progress' ? 'blue' : 'idle';
      var icon    = done ? 'check' : overdue ? 'alert-triangle'
                  : m.status === 'In Progress' ? 'rotate' : 'circle';
      var short   = m.title.length > 22 ? m.title.slice(0, 21) + '\u2026' : m.title;
      var state   = done ? 'Done' : overdue ? 'Overdue' : m.status;

      return '<button class="ms-pill ms-' + tone + '" onclick="jumpToMilestone(' + _dashboardJsId(p.id) + ',' + _dashboardJsId(m.id) + ')"' +
             ' title="' + escAttr(m.title + ' \u2014 ' + state) + '">' +
               Icons.svg(icon, 11) + '<span>' + esc(short) + '</span>' +
             '</button>';
    }).join('');

    return '<div class="ms-project">' +
      '<div class="ms-project-head">' +
        '<div class="ms-project-id">' +
          '<span class="ms-dot tone-' + stateTone + '"></span>' +
          '<span class="ms-project-name">' + esc(p.name) + '</span>' +
          '<span class="ms-project-client">' + esc(p.client) + '</span>' +
        '</div>' +
        '<div class="ms-project-meta">' +
          '<span class="ms-count">' + doneCnt + '<span class="ms-count-sep">/</span>' + ms.length + '</span>' +
          '<span class="ms-track"><span class="ms-track-fill' + (pct === 100 ? ' full' : '') +
            '" style="width:' + pct + '%"></span></span>' +
          '<span class="ms-pct' + (pct === 100 ? ' full' : '') + '">' + pct + '%</span>' +
          '<button class="btn btn-secondary btn-xs" onclick="jumpToMilestone(' + _dashboardJsId(p.id) + ')">' +
            'Open' + Icons.svg('chevron-right', 12) +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="ms-pills">' + pills + '</div>' +
      (next
        ? '<div class="ms-next">' + Icons.svg('arrow-right', 11) +
            '<span>Next</span><strong>' + esc(next.title) + '</strong>' +
            (next.date
              ? '<span class="ms-next-due' + (new Date(next.date) < today ? ' late' : '') + '">' +
                  'due ' + esc(next.date) + '</span>'
              : '') +
          '</div>'
        : '<div class="ms-next done">' + Icons.svg('check-circle', 11) +
            '<span>Every milestone on this case is complete</span></div>') +
    '</div>';
  }).filter(Boolean).join('');

  body.innerHTML = statsHTML + (rows ||
    '<div class="empty-state">' +
      Icons.badge('route', { tone: 'spruce', box: 44, size: 22 }) +
      '<div class="empty-title">No milestones yet</div>' +
      '<div class="empty-sub">Open a case and add milestones to track it here.</div>' +
      '<button class="btn btn-primary btn-sm" onclick="gotoModule(\'cases\')">Go to Cases</button>' +
    '</div>');
}

/* Milestones Cases workspace mein khulte hain (project-detail module hata
   diya gaya tha, par ye function abhi bhi wahi kholta tha). */
function jumpToMilestone(pid) {
  gotoModule('cases');
  if (typeof cxOpenCase === 'function') cxOpenCase(pid);
}

function _dashboardJsId(id) {
  return "'" + String(id).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

/* ── Team load ───────────────────────────────────────────────────────────── */

function renderTeamLoad() {
  var el = document.getElementById('team-load');
  if (!el) return;

  var people = (STATE.employees || []).slice().sort(function (a, b) {
    return (b.tasks || 0) - (a.tasks || 0) || (b.score || 0) - (a.score || 0);
  });

  if (!people.length) {
    el.innerHTML =
      '<div class="empty-state">' +
        Icons.badge('users', { tone: 'neutral', box: 44, size: 22 }) +
        '<div class="empty-title">No one on the roster</div>' +
        '<div class="empty-sub">Add your team to see how work is spread.</div>' +
      '</div>';
    return;
  }

  var busiest = Math.max(1, people[0].tasks || 0);

  el.innerHTML = people.slice(0, 6).map(function (e) {
    var tone = e.status === 'Present'  ? 'green'
             : e.status === 'On Leave' ? 'amber'
             : e.status === 'Half Day' ? 'blue' : 'idle';
    var load = Math.round((e.tasks || 0) / busiest * 100);

    return '<div class="load-row" onclick="gotoModule(\'employees\')">' +
             '<span class="avatar avatar-sm" style="background:' + escAttr(e.color || '#5C5A60') + '">' +
               esc(e.avatar || '?') + '</span>' +
             '<div class="load-id">' +
               '<div class="load-name">' + esc(e.name) +
                 '<span class="presence tone-' + tone + '" title="' + escAttr(e.status) + '"></span>' +
               '</div>' +
               '<div class="load-role">' + esc(e.role || e.dept || '') + '</div>' +
             '</div>' +
             '<div class="load-bar"><span style="width:' + load + '%"></span></div>' +
             '<div class="load-count">' + (e.tasks || 0) +
               '<span class="load-count-label">open</span></div>' +
           '</div>';
  }).join('');
}

/* ── Ready to invoice ────────────────────────────────────────────────────── */

function renderUnbilled() {
  var el    = document.getElementById('unbilled-snapshot');
  var valEl = document.getElementById('unbilled-value');
  if (!el) return;

  var DB = DataAPI.raw();
  var rows = [];

  DB.milestones.forEach(function (m) {
    if (m.status !== 'DONE' || !m.billable) return;
    var billed = DB.invoices.some(function (i) {
      return i.milestoneId === m.id && i.status !== 'CANCELLED';
    });
    if (billed) return;
    var p = DB.projects.find(function (x) { return x.id === m.projectId; });
    if (!p) return;
    /* Milestone ka hissa project budget ka — sirf billable milestones pe bataa */
    var billableCount = DB.milestones.filter(function (x) {
      return x.projectId === p.id && x.billable;
    }).length || 1;
    rows.push({
      projectId: p.id,
      milestone: m.title,
      client: p.clientName,
      valuePaise: Math.round((p.budgetPaise || 0) / billableCount)
    });
  });

  rows.sort(function (a, b) { return b.valuePaise - a.valuePaise; });
  var totalPaise = rows.reduce(function (s, r) { return s + r.valuePaise; }, 0);

  if (!rows.length) {
    el.innerHTML =
      '<div class="empty-state compact">' +
        Icons.badge('check-circle', { tone: 'green', box: 38, size: 19 }) +
        '<div class="empty-title">Nothing pending</div>' +
        '<div class="empty-sub">Everything delivered has been invoiced.</div>' +
      '</div>';
    if (valEl) { valEl.textContent = '\u20B90'; valEl.className = 'unbilled-total zero'; }
    return;
  }

  el.innerHTML = rows.slice(0, 5).map(function (r) {
    return '<button class="unbilled-row" onclick="jumpToMilestone(' + _dashboardJsId(r.projectId) + ')">' +
             '<span class="unbilled-dot"></span>' +
             '<span class="unbilled-id">' +
               '<span class="unbilled-ms">' + esc(r.milestone) + '</span>' +
               '<span class="unbilled-client">' + esc(r.client) + '</span>' +
             '</span>' +
             '<span class="unbilled-amt">' +
               Utils.fmtRupee(r.valuePaise).replace('.00', '') + '</span>' +
           '</button>';
  }).join('') +
  (rows.length > 5
    ? '<div class="unbilled-more">+' + (rows.length - 5) + ' more</div>'
    : '');

  if (valEl) {
    valEl.textContent = Utils.fmtRupee(totalPaise).replace('.00', '');
    valEl.className = 'unbilled-total';
  }
}
