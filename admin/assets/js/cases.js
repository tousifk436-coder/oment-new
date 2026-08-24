/* ============================================================================
   IMMIGRATION CASE MANAGEMENT (admin) — Operations Control Center
   ----------------------------------------------------------------------------
   Spec coverage: §9–§20 wizard + milestone builder · §34–§39 dashboards ·
   §28–§30 complete/block/reschedule · §41 daily report · §46–§47 search/filter
   Data: DataAPI only · Engine: SisOps · Templates: ImmTemplates · esc: Utils.esc
   ============================================================================ */

var CASES_UI = { mode: 'dashboard', caseId: null, tab: 'milestones', filters: { q: '', service: '', owner: '', risk: '' }, myWork: '' };

// Safely embed MongoDB string/ObjectId values inside inline onclick handlers.
function _cxJsId(id) {
  return "'" + String(id).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}
var CASE_WIZ = null;   // wizard state

/* ── data helpers ─────────────────────────────────────────────────────────── */
function _cxLoad() {
  return Promise.all([
    DataAPI.getProjects(), DataAPI.getMilestones(), DataAPI.getEmployees(),
    DataAPI.getContacts(), DataAPI.getClients()
  ]).then(function (r) {
    return { projects: r[0] || [], milestones: r[1] || [], users: r[2] || [], contacts: r[3] || [], clients: r[4] || [] };
  });
}
function _cxPeople(D) { return { users: D.users, contacts: D.contacts }; }
function _cxCases(D) { return D.projects.filter(function (p) { return p.kind === 'IMMIGRATION'; }); }
function _refKey(r) { return r.type + ':' + r.id; }

/* ── entry ────────────────────────────────────────────────────────────────── */
function renderCases() {
  var el = document.getElementById('cases-root');
  if (!el || !window.SisOps) return;
  _cxLoad().then(function (D) {
    if (CASES_UI.mode === 'detail' && CASES_UI.caseId != null) _cxDetail(el, D);
    else _cxDashboard(el, D);
  }).catch(function (e) {
    el.innerHTML = '<div class="card card-pad">Case data could not be loaded: ' + Utils.esc(e.message || e) + '</div>';
  });
}

/* ==========================================================================
   CONTROL CENTER (spec §34/§35/§38/§39)
   ========================================================================== */
function _cxDashboard(el, D) {
  var esc = Utils.esc, O = SisOps, people = _cxPeople(D);
  var cases = _cxCases(D);
  var rep = O.dailyReport(cases, D.milestones, people);

  var weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  var completedWeek = D.milestones.filter(function (m) {
    return m.status === 'DONE' && m.completedAt && m.completedAt >= weekAgo &&
      cases.some(function (p) { return p.id === m.projectId; });
  }).length;
  var riskMap = {};
  cases.forEach(function (p) { riskMap[p.id] = O.riskLevel(p, D.milestones); });
  var atRiskN = cases.filter(function (p) { return p.status !== 'COMPLETED' && riskMap[p.id].level === 'AT_RISK'; }).length;
  var criticalN = cases.filter(function (p) { return p.status !== 'COMPLETED' && riskMap[p.id].level === 'CRITICAL'; }).length;

  function tile(n, label, color, filter) {
    return '<div class="card card-pad cx-tile" style="flex:1;min-width:118px;text-align:center;cursor:' + (filter ? 'pointer' : 'default') + '"' +
      (filter ? ' onclick="CASES_UI.filters.risk=\'' + filter + '\';renderCases()"' : '') + '>' +
      '<div style="font-size:24px;font-weight:800;color:' + color + '">' + n + '</div>' +
      '<div style="font-size:11px;color:var(--t2)">' + label + '</div></div>';
  }
  /* signature: live status-strip hero */
  var dstr = new Date().toLocaleDateString('en-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var hero = '<div class="sis-hero"><div>' +
    '<div class="sis-hero-org">Stanstead Immigration Services</div>' +
    '<div class="sis-hero-title">Immigration Operations Control Center</div>' +
    '<div class="sis-hero-date">' + dstr + ' \u00B7 auto-monitored every minute while open</div></div>' +
    '<div class="sis-hero-live">' +
    '<span class="sis-live-chip' + (rep.overdue.length ? ' alert' : '') + '"><span class="dot"></span>' + rep.overdue.length + ' overdue</span>' +
    '<span class="sis-live-chip' + (rep.dueToday.length ? ' warn' : '') + '"><span class="dot"></span>' + rep.dueToday.length + ' due today</span>' +
    '<span class="sis-live-chip"><span class="dot"></span>' + rep.active.length + ' active</span>' +
    '</div></div>';

  var tiles = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
    tile(rep.active.length, 'Active Projects', 'var(--t1)', '') +
    tile(rep.dueToday.length, 'Due Today \uD83D\uDFE0', '#D97706', 'today') +
    tile(rep.overdue.length, 'Overdue \uD83D\uDD34', '#DC2626', 'overdue') +
    tile(rep.blocked.length, 'Blocked \u26D4', '#DC2626', 'blocked') +
    tile(atRiskN, 'At Risk \uD83D\uDFE1', '#CA8A04', 'atrisk') +
    tile(criticalN, 'Critical \uD83D\uDD34\uD83D\uDD34', '#991B1B', 'critical') +
    tile(completedWeek, 'Completed This Week \u2705', '#059669', '') +
    '</div>';

  /* risk banners with recommendation (spec §40) */
  var banners = rep.risks.filter(function (r) { return r.level === 'CRITICAL'; }).map(function (r) {
    return '<div class="card card-pad" style="border-left:4px solid #DC2626;margin-bottom:10px;background:#FEF2F2">' +
      '<div style="font-weight:700;color:#991B1B">\uD83D\uDD34\uD83D\uDD34 PROJECT AT RISK \u2014 ' + esc(r.project.name) + '</div>' +
      '<div style="font-size:12px;color:#7F1D1D;margin-top:3px">Final Deadline: <strong>' + O.fmt(r.project.deadline) + '</strong> \u00B7 Remaining: ' + (r.stats.daysLeft != null ? r.stats.daysLeft + ' days' : '\u2014') + ' \u00B7 Incomplete: ' + r.stats.remaining + ' \u00B7 Overdue: ' + r.stats.overdue + '</div>' +
      '<div style="font-size:12px;color:#7F1D1D;margin-top:3px">Reason: ' + esc(r.reasons.join(' ')) + '</div>' +
      (r.recommendation ? '<div style="font-size:12px;margin-top:3px;font-weight:600;color:#991B1B">Recommendation: ' + esc(r.recommendation) + '</div>' : '') +
      '</div>';
  }).join('');

  /* filters + search (spec §46/§47) */
  var services = [''].concat((SisOps.SERVICE_GROUPS || []).reduce(function (a, g) { return a.concat(g.services); }, []));
  var ownerOpts = ['<option value="">All owners</option>'];
  D.users.concat(D.contacts.map(function (c) { return Object.assign({}, c, { _ct: 1 }); })).forEach(function (u) {
    var v = (u._ct ? 'contact:' : 'user:') + u.id;
    ownerOpts.push('<option value="' + v + '"' + (CASES_UI.filters.owner === v ? ' selected' : '') + '>' + esc(u.name) + (u._ct ? ' (external)' : '') + '</option>');
  });
  var bar = '<div class="card card-pad" style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
    '<button class="btn btn-primary" onclick="cxStartWizard()">+ New Immigration Project</button>' +
    '<input class="form-input" style="flex:1;min-width:160px" placeholder="Search client, project, service, milestone, UCI\u2026" value="' + esc(CASES_UI.filters.q) + '" oninput="CASES_UI.filters.q=this.value" onchange="renderCases()">' +
    '<select class="form-select" style="width:auto" onchange="CASES_UI.filters.service=this.value;renderCases()">' +
    services.map(function (sv) { return '<option value="' + esc(sv) + '"' + (CASES_UI.filters.service === sv ? ' selected' : '') + '>' + (sv || 'All services') + '</option>'; }).join('') +
    '</select>' +
    '<select class="form-select" style="width:auto" onchange="CASES_UI.filters.owner=this.value;renderCases()">' + ownerOpts.join('') + '</select>' +
    (CASES_UI.filters.risk ? '<button class="btn btn-sm" onclick="CASES_UI.filters.risk=\'\';renderCases()">Clear filter \u2715</button>' : '') +
    '</div>';

  /* project table (spec §35) */
  var q = CASES_UI.filters.q.trim().toLowerCase();
  var rows = cases.filter(function (p) {
    if (CASES_UI.filters.service && p.service !== CASES_UI.filters.service) return false;
    if (CASES_UI.filters.owner) {
      var hit = (p.ownerRefs || []).some(function (r) { return _refKey(r) === CASES_UI.filters.owner; }) ||
        D.milestones.some(function (m) { return m.projectId === p.id && (m.ownerRefs || []).some(function (r) { return _refKey(r) === CASES_UI.filters.owner; }); });
      if (!hit) return false;
    }
    var rk = riskMap[p.id];
    if (CASES_UI.filters.risk === 'critical' && rk.level !== 'CRITICAL') return false;
    if (CASES_UI.filters.risk === 'atrisk' && rk.level !== 'AT_RISK') return false;
    if (CASES_UI.filters.risk === 'overdue' && rk.stats.overdue === 0) return false;
    if (CASES_UI.filters.risk === 'blocked' && rk.stats.blocked === 0) return false;
    if (CASES_UI.filters.risk === 'today' && !D.milestones.some(function (m) { return m.projectId === p.id && m.status !== 'DONE' && SisOps.daysUntil(m.dueDate) === 0; })) return false;
    if (q) {
      var cl = D.clients.filter(function (c) { return c.id === p.clientId; })[0] || {};
      var hay = [p.name, p.clientName, p.service, cl.uci, cl.applicationNumber, cl.internalRef, cl.email]
        .concat(D.milestones.filter(function (m) { return m.projectId === p.id; }).map(function (m) { return m.title; }))
        .join(' ').toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });

  var table = '<div class="card card-pad" style="margin-bottom:14px"><div class="section-header"><div>' +
    '<div class="section-title">Immigration Projects</div>' +
    '<div class="section-sub">' + rows.length + ' of ' + cases.length + ' projects</div></div></div>' +
    (rows.length ? '<div style="overflow-x:auto"><table class="data-table"><thead><tr>' +
      '<th>Project / Client</th><th>Service</th><th>Owner</th><th>Final Deadline</th><th>Progress</th><th>Next Milestone</th><th>Status</th></tr></thead><tbody>' +
      rows.map(function (p) {
        var rk = riskMap[p.id], st = rk.stats;
        var owners = SisOps.ownersOf(null, p, people).map(function (o) { return o.name; }).join(', ');
        var badge = p.status === 'COMPLETED' ? '<span class="badge badge-green">\u2705 Completed</span>'
          : rk.level === 'CRITICAL' ? '<span class="badge badge-red">\uD83D\uDD34 Critical</span>'
          : rk.level === 'AT_RISK' ? '<span class="badge badge-amber">\uD83D\uDFE1 At Risk</span>'
          : '<span class="badge badge-green">\uD83D\uDFE2 On Track</span>';
        return '<tr style="cursor:pointer" onclick="cxOpenCase(' + _cxJsId(p.id) + ')">' +
          '<td><div style="font-weight:600">' + esc(p.name) + '</div><div style="font-size:11px;color:var(--t2)">' + esc(p.clientName || '') + '</div></td>' +
          '<td style="font-size:12px">' + esc(p.service || '\u2014') + '</td>' +
          '<td style="font-size:12px">' + esc(owners || '\u2014') + '</td>' +
          '<td>' + SisOps.fmt(p.deadline) + (st.daysLeft != null && p.status !== 'COMPLETED' ? '<div style="font-size:11px;color:' + (st.daysLeft < 0 ? '#DC2626' : 'var(--t2)') + '">' + (st.daysLeft < 0 ? Math.abs(st.daysLeft) + 'd past' : st.daysLeft + 'd left') + '</div>' : '') + '</td>' +
          '<td><div style="height:6px;width:90px;background:var(--s2);border-radius:4px;overflow:hidden"><div style="height:100%;width:' + st.pct + '%;background:' + (st.overdue ? '#DC2626' : '#059669') + '"></div></div><div style="font-size:11px;color:var(--t2)">' + st.done + '/' + st.required + ' \u00B7 ' + st.pct + '%</div></td>' +
          '<td style="font-size:12px">' + esc(st.nextMilestone ? st.nextMilestone.title : '\u2014') + '</td>' +
          '<td>' + badge + '</td></tr>';
      }).join('') + '</tbody></table></div>'
      : (cases.length === 0
        ? '<div class="sis-empty"><div class="glyph">\uD83C\uDF41</div><div class="lead">Start your first immigration project</div><div class="hint">Pick a client and service \u2014 the wizard suggests milestones, deadlines and owners automatically.</div><button class="btn btn-primary" onclick="cxStartWizard()">+ New Immigration Project</button></div>'
        : '<div style="color:var(--t2);font-size:13px;padding:8px 0">No projects match these filters.</div>')) +
    '</div>';

  /* MY WORK (spec §38) */
  var mwOpts = ['<option value="">\u2014 select person \u2014</option>'];
  rep.byOwner.forEach(function (g) {
    mwOpts.push('<option value="' + g.key + '"' + (CASES_UI.myWork === g.key ? ' selected' : '') + '>' + esc(g.person.name) + (g.person.type === 'contact' ? ' (external)' : '') + '</option>');
  });
  var mw = '<div class="card card-pad" style="flex:1;min-width:280px"><div class="section-header"><div class="section-title">My Work</div>' +
    '<select class="form-select" style="width:auto" onchange="CASES_UI.myWork=this.value;renderCases()">' + mwOpts.join('') + '</select></div>';
  var mwG = rep.byOwner.filter(function (g) { return g.key === CASES_UI.myWork; })[0];
  if (mwG) {
    var buckets = [
      ['Overdue \uD83D\uDD34', mwG.items.filter(function (r) { return r.days != null && r.days < 0 && r.m.status !== 'BLOCKED'; })],
      ['Due Today \uD83D\uDFE0', mwG.items.filter(function (r) { return r.days === 0 && r.m.status !== 'BLOCKED'; })],
      ['Blocked \u26D4', mwG.items.filter(function (r) { return r.m.status === 'BLOCKED'; })],
      ['Upcoming', mwG.items.filter(function (r) { return (r.days == null || r.days > 0) && r.m.status !== 'BLOCKED'; })]
    ];
    mw += buckets.map(function (b) {
      return '<div style="font-size:12px;font-weight:700;margin-top:8px">' + b[0] + ' (' + b[1].length + ')</div>' +
        b[1].map(function (r) {
          return '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--s2);cursor:pointer" onclick="cxOpenCase(' + _cxJsId(r.p.id) + ')">' +
            r.sig.emoji + ' ' + esc(r.m.title) + ' <span style="color:var(--t2)">\u00B7 ' + esc(r.p.name) + ' \u00B7 ' + SisOps.fmt(r.m.dueDate) + '</span></div>';
        }).join('');
    }).join('');
  } else mw += '<div style="font-size:12px;color:var(--t2)">Select a person to see their work queue.</div>';
  mw += '</div>';

  /* NOTIFICATION CENTER (spec §23–§27, honest about integrations §73) */
  var due = SisOps.computeDueNotifications(cases, D.milestones, people);
  var nc = '<div class="card card-pad" style="flex:1;min-width:280px"><div class="section-header"><div>' +
    '<div class="section-title">Notification Center</div>' +
    '<div class="section-sub">Due now per the reminder rules \u00B7 duplicates auto-suppressed</div></div></div>' +
    '<div style="font-size:11px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:8px;margin-bottom:8px;color:#92400E">' +
    '<span style="color:#047857">✓ Backend automation enabled:</span> owner emails and Google Calendar synchronization are handled automatically when SMTP and Google OAuth are configured. ' +
    'The list below is the live in-app reminder view.</div>';
  DataAPI.getNotificationLog().then(function () {}); // warm cache; render sync below
  nc += (due.length ? due.slice(0, 12).map(function (n) {
    var emails = n.recipients.map(function (r2) { return r2.email; }).filter(Boolean);
    var href = SisOps.mailto(emails, SisOps.notifSubject(n.kind, n.p), SisOps.notifBody(n.kind, n.p, n.m, n.recipients, { hoursLate: n.hoursLate }));
    return '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--s2)">' +
      '<div style="font-size:12px"><strong>' + n.kind + '</strong> \u00B7 ' + esc(n.m.title) + '<div style="color:var(--t2);font-size:11px">' + esc(n.p.name) + ' \u2192 ' + esc(n.recipients.map(function (r2) { return r2.name; }).join(', ')) + '</div></div>' +
      '<a class="btn btn-sm" href="' + href + '" onclick="cxLogNotif(\'' + n.key + '\',\'' + n.kind + '\',' + n.m.id + ',' + n.p.id + ')">\u2709\uFE0F Prepare email</a></div>';
  }).join('') : '<div style="font-size:12px;color:var(--t2)">Nothing due right now. \uD83C\uDF89</div>');
  nc += '</div>';

  /* Daily report */
  var repCard = '<div class="card card-pad" style="margin-bottom:14px"><div class="section-header"><div>' +
    '<div class="section-title">Daily Operations Report</div></div>' +
    '<div style="display:flex;gap:8px"><button class="btn" onclick="cxCopyReport()">\uD83D\uDCCB Copy</button>' +
    '<a class="btn btn-primary" href="' + SisOps.mailto([SisOps.TEAM.NABEEL.email, SisOps.TEAM.HUMERA.email], '[SIS] Daily Operations Report \u2014 ' + new Date().toLocaleDateString('en-CA'), SisOps.reportText(rep)) + '">\u2709\uFE0F Email</a>' +
    '<button class="btn" onclick="cxDownloadIcsAll()">\uD83D\uDCC6 .ics export</button></div></div>' +
    '<pre id="cx-report" style="white-space:pre-wrap;font-size:12px;line-height:1.55;background:var(--s2);padding:12px;border-radius:8px;margin:0">' + esc(SisOps.reportText(rep)) + '</pre></div>';

  el.innerHTML = hero + banners + tiles + bar + table +
    '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px">' + mw + nc + '</div>' + repCard;
}

function cxLogNotif(key, kind, msId, pId) {
  DataAPI.logNotification(key, { kind: kind, milestoneId: msId, projectId: pId, channel: 'manual-email', status: 'PREPARED' })
    .then(function (r) { if (r.duplicate) toast('Already logged \u2014 duplicate suppressed', ''); else toast('Notification logged', 'success'); });
}
function cxCopyReport() {
  var el = document.getElementById('cx-report');
  if (el) navigator.clipboard.writeText(el.textContent).then(function () { toast('Report copied', 'success'); });
}
function cxDownloadIcsAll() {
  _cxLoad().then(function (D) {
    var ics = SisOps.icsAll(_cxCases(D), D.milestones, _cxPeople(D));
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'SIS-immigration-milestones.ics';
    document.body.appendChild(a); a.click(); a.remove();
    toast('.ics downloaded \u2014 import into Google Calendar', 'success');
  });
}

/* ==========================================================================
   CASE DETAIL WORKSPACE (spec §36/§37/§58)
   ========================================================================== */
function cxOpenCase(id) { CASES_UI.mode = 'detail'; CASES_UI.caseId = id; renderCases(); }
function cxBackToDash() { CASES_UI.mode = 'dashboard'; CASES_UI.caseId = null; renderCases(); }
function cxSetTab(t) { CASES_UI.tab = t; renderCases(); }

function _cxDetail(el, D) {
  var esc = Utils.esc, O = SisOps, people = _cxPeople(D);
  var p = D.projects.filter(function (x) { return x.id === CASES_UI.caseId; })[0];
  if (!p) { cxBackToDash(); return; }
  var client = D.clients.filter(function (c) { return c.id === p.clientId; })[0];
  var rk = O.riskLevel(p, D.milestones), st = rk.stats;
  var atRisk = rk.level !== 'ON_TRACK';
  var owners = O.ownersOf(null, p, people).map(function (o) { return o.name; }).join(', ');

  var header = '<div class="card card-pad" style="margin-bottom:12px">' +
    '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center">' +
    '<div><button class="btn btn-sm" onclick="cxBackToDash()">\u2190 All Projects</button> ' +
    '<span style="font-size:17px;font-weight:800;margin-left:6px">' + esc(p.name) + '</span> ' +
    (rk.level === 'CRITICAL' ? '<span class="badge badge-red">\uD83D\uDD34 Critical</span>' : rk.level === 'AT_RISK' ? '<span class="badge badge-amber">\uD83D\uDFE1 At Risk</span>' : p.status === 'COMPLETED' ? '<span class="badge badge-green">\u2705 Completed</span>' : '<span class="badge badge-green">\uD83D\uDFE2 On Track</span>') +
    '</div><div style="display:flex;gap:6px;flex-wrap:wrap">' +
    '<button class="btn btn-sm" onclick="cxAddMilestone(' + _cxJsId(p.id) + ')">+ Add Milestone</button>' +
    (p.status !== 'COMPLETED' && st.remaining === 0 && st.required > 0 ? '<button class="btn btn-primary btn-sm" onclick="cxCloseCase(' + _cxJsId(p.id) + ')">\uD83C\uDFC1 Close Project</button>' : '') +
    '</div></div>' +
    '<div style="display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:var(--t2);margin-top:8px">' +
    '<span><strong style="color:var(--t1)">Client:</strong> ' + esc(p.clientName || '\u2014') + (client && client.internalRef ? ' (' + esc(client.internalRef) + ')' : '') + '</span>' +
    '<span><strong style="color:var(--t1)">Service:</strong> ' + esc(p.service || '\u2014') + '</span>' +
    '<span><strong style="color:var(--t1)">Owner:</strong> ' + esc(owners || '\u2014') + '</span>' +
    '<span><strong style="color:var(--t1)">Priority:</strong> ' + esc(p.priority || '\u2014') + '</span>' +
    '<span><strong style="color:var(--t1)">Final Deadline:</strong> ' + O.fmt(p.deadline) + (st.daysLeft != null ? ' (' + (st.daysLeft < 0 ? Math.abs(st.daysLeft) + 'd past' : st.daysLeft + 'd left') + ')' : '') + '</span>' +
    '</div>' +
    '<div style="height:8px;background:var(--s2);border-radius:6px;margin-top:10px;overflow:hidden"><div style="height:100%;width:' + st.pct + '%;background:' + (st.overdue ? '#DC2626' : '#059669') + '"></div></div>' +
    '<div style="font-size:11px;color:var(--t2);margin-top:3px">' + st.done + '/' + st.required + ' milestones \u00B7 ' + st.pct + '%</div>' +
    '<div class="cx-project-timer"><div><span class="cx-project-timer-dot"></span><span>Current task timer</span></div><strong id="cx-project-live-timer">00:00:00</strong></div>' +
    (rk.reasons.length ? '<div style="font-size:12px;color:#991B1B;background:#FEF2F2;border-radius:8px;padding:8px;margin-top:8px">' + esc(rk.reasons.join(' ')) + (rk.recommendation ? '<br><strong>Recommendation:</strong> ' + esc(rk.recommendation) : '') + '</div>' : '') +
    '</div>';

  var tabs = ['milestones', 'overview', 'notes', 'activity'];
  var tabBar = '<div style="display:flex;gap:4px;margin-bottom:10px">' + tabs.map(function (t) {
    var lbl = { milestones: 'Milestones', overview: 'Overview', notes: 'Notes', activity: 'Activity & Audit' }[t];
    return '<button class="btn btn-sm' + (CASES_UI.tab === t ? ' btn-primary' : '') + '" onclick="cxSetTab(\'' + t + '\')">' + lbl + '</button>';
  }).join('') + '</div>';

  var body = '';
  if (CASES_UI.tab === 'milestones') body = _cxMilestonesTab(p, D, atRisk);
  else if (CASES_UI.tab === 'overview') body = _cxOverviewTab(p, client, st);
  else if (CASES_UI.tab === 'notes') body = _cxNotesTab(p);
  else body = '<div class="card card-pad" id="cx-activity"><div style="color:var(--t2);font-size:12px">Loading\u2026</div></div>';

  el.innerHTML = header + tabBar + body;
  if (CASES_UI.tab === 'activity') _cxRenderActivity(p.id);
}


function _cxSecondsLabel(seconds) {
  seconds = Math.max(0, Math.round(Number(seconds) || 0));
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var sec = seconds % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function _cxTaskTimer(task, D) {
  var base = Number(task.loggedSecs || 0);
  var entry = (D.timeEntries || []).find(function (t) {
    return String(t.deliverableId || '') === String(task.id) &&
      String(t.employeeId || '') === String(STATE.adminUser && STATE.adminUser.id || '') &&
      (t.status === 'RUNNING' || t.status === 'PAUSED');
  });
  if (!entry) return { seconds: base, entry: null };
  var seconds = Number(entry.totalActiveSecs || 0);
  if (entry.status === 'RUNNING' && entry.activeStartedAt) {
    seconds += Math.max(0, Math.round((Date.now() - new Date(entry.activeStartedAt).getTime()) / 1000));
  }
  return { seconds: Math.max(base, seconds), entry: entry };
}

function _cxTaskStart(id) {
  DataAPI.startTimer(STATE.adminUser && STATE.adminUser.id, id)
    .then(function () {
      if (typeof syncState === 'function') syncState();
      toast('Task started. Timer is running.', 'success');
      renderCases();
    })
    .catch(function (e) { toast(e.message || 'Could not start task', 'error'); });
}

function _cxTaskPause(timerId) {
  DataAPI.pauseTimer(timerId)
    .then(function () {
      if (typeof syncState === 'function') syncState();
      toast('Task paused. Active time has been saved.', 'success');
      renderCases();
    })
    .catch(function (e) { toast(e.message || 'Could not pause task', 'error'); });
}

function _cxTaskResume(timerId) {
  DataAPI.resumeTimer(timerId)
    .then(function () {
      if (typeof syncState === 'function') syncState();
      toast('Task resumed. Timer is running again.', 'success');
      renderCases();
    })
    .catch(function (e) { toast(e.message || 'Could not resume task', 'error'); });
}

function _cxTaskEnd(timerId) {
  DataAPI.stopTimerById(timerId)
    .then(function (result) {
      if (typeof syncState === 'function') syncState();
      var secs = result && result.activeSeconds ? result.activeSeconds : 0;
      toast('Task timer stopped. ' + _cxSecondsLabel(secs) + ' active time saved.', 'success');
      renderCases();
    })
    .catch(function (e) { toast(e.message || 'Could not stop task', 'error'); });
}

function _cxTaskComplete(id) {
  showConfirm('Mark this task as completed? The running timer will be stopped and its active time will be saved.', function () {
    DataAPI.updateDeliverable(id, { status: 'DONE', progressPct: 100, approvalState: 'APPROVED' })
      .then(function () {
        if (typeof syncState === 'function') syncState();
        toast('Task completed. Time has been saved.', 'success');
        renderCases();
      })
      .catch(function (e) { toast(e.message || 'Could not complete task', 'error'); });
  });
}

function _cxDeleteMilestone(id) {
  showConfirm('Delete this milestone? This action cannot be undone.', function () {
    DataAPI.deleteMilestone(id)
      .then(function () {
        if (typeof syncState === 'function') syncState();
        toast('Milestone deleted.', 'success');
        renderCases();
      })
      .catch(function (e) { toast(e.message || 'Could not delete milestone', 'error'); });
  });
}

function _cxTaskRows(m, D) {
  var esc = Utils.esc;
  var tasks = (D.deliverables || []).filter(function (d) {
    return String(d.milestoneId || '') === String(m.id);
  });
  if (!tasks.length) return '<div class="cx-task-empty">No tasks assigned yet.</div>';

  return '<div class="cx-task-list">' + tasks.map(function (task) {
    var owners = (task.assigneeIds || []).map(function (id) {
      var user = (D.employees || D.users || []).find(function (u) { return String(u.id) === String(id); });
      return user ? user.name : String(id);
    }).join(', ');
    var timer = _cxTaskTimer(task, D);
    var entry = timer.entry;
    var timerState = entry ? entry.status : 'STOPPED';
    var isDone = task.status === 'DONE';
    var actions = '';

    if (!isDone) {
      if (!entry) {
        actions += '<button class="btn btn-xs btn-green" onclick="_cxTaskStart(' + _cxJsId(task.id) + ')">▶ Start Task</button>';
      } else if (timerState === 'RUNNING') {
        actions += '<button class="btn btn-xs btn-secondary" onclick="_cxTaskPause(' + _cxJsId(entry.id) + ')">Ⅱ Pause</button>';
        actions += '<button class="btn btn-xs btn-danger" onclick="_cxTaskEnd(' + _cxJsId(entry.id) + ')">■ End Task</button>';
      } else {
        actions += '<button class="btn btn-xs btn-green" onclick="_cxTaskResume(' + _cxJsId(entry.id) + ')">▶ Resume</button>';
        actions += '<button class="btn btn-xs btn-danger" onclick="_cxTaskEnd(' + _cxJsId(entry.id) + ')">■ End Task</button>';
      }
      actions += '<button class="btn btn-xs btn-primary" onclick="_cxTaskComplete(' + _cxJsId(task.id) + ')">✓ Complete</button>';
    } else {
      actions = '<span class="badge badge-green">✓ Completed</span>';
    }

    var stateLabel = entry ? (timerState === 'RUNNING' ? 'Running' : 'Paused') : (isDone ? 'Completed' : 'Not started');
    return '<div class="cx-task-row">' +
      '<div class="cx-task-main">' +
        '<div class="cx-task-title-row"><strong>' + esc(task.title) + '</strong><span class="badge ' + (isDone ? 'badge-green' : task.status === 'IN_PROGRESS' ? 'badge-blue' : 'badge-grey') + '">' + esc(String(task.status || 'TODO').replace(/_/g, ' ')) + '</span></div>' +
        (task.description ? '<div class="cx-task-desc">' + esc(task.description) + '</div>' : '') +
        '<div class="cx-task-meta">Owner: ' + esc(owners || 'Unassigned') + ' · Deadline: ' + esc(SisOps.fmt(task.dueAt)) + '</div>' +
      '</div>' +
      '<div class="cx-task-time">' +
        '<div class="cx-task-time-label">' + stateLabel + '</div>' +
        '<div class="cx-task-clock" data-task-timer="' + esc(task.id) + '" data-base-secs="' + String(timer.seconds) + '" data-entry-status="' + timerState + '" data-active-start="' + (entry && entry.activeStartedAt ? esc(entry.activeStartedAt) : '') + '">' + _cxSecondsLabel(timer.seconds) + '</div>' +
        '<div class="cx-task-time-sub">Active time</div>' +
      '</div>' +
      '<div class="cx-task-actions">' + actions + '</div>' +
    '</div>';
  }).join('') + '</div>';
}

function _cxRefreshTaskTimers() {
  document.querySelectorAll('[data-task-timer]').forEach(function (el) {
    var value = Number(el.getAttribute('data-base-secs') || 0);
    if (el.getAttribute('data-entry-status') === 'RUNNING' && el.getAttribute('data-active-start')) {
      value += Math.max(0, Math.round((Date.now() - new Date(el.getAttribute('data-active-start')).getTime()) / 1000));
    }
    el.textContent = _cxSecondsLabel(value);
  });
  var projectTimer = document.getElementById('cx-project-live-timer');
  if (projectTimer) {
    var running = document.querySelector('[data-task-timer][data-entry-status="RUNNING"]');
    var paused = document.querySelector('[data-task-timer][data-entry-status="PAUSED"]');
    var source = running || paused;
    projectTimer.textContent = source ? source.textContent : '00:00:00';
    projectTimer.classList.toggle('is-running', !!running);
    projectTimer.classList.toggle('is-paused', !!paused && !running);
  }
}
setInterval(_cxRefreshTaskTimers, 1000);

function _cxMilestonesTab(p, D, atRisk) {
  var esc = Utils.esc, O = SisOps, people = _cxPeople(D);
  var ms = D.milestones.filter(function (m) { return String(m.projectId) === String(p.id); })
    .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
  var byId = {}; ms.forEach(function (m) { byId[m.id] = m; });

  var rows = ms.map(function (m, i) {
    var sig = O.signal(m, p, atRisk);
    var owners = O.ownersOf(m, p, people);
    var dep = m.dependsOn != null && byId[m.dependsOn] ? byId[m.dependsOn].title : null;
    var cf = (m.customFields || []).map(function (f) {
      return '<span style="font-size:10px;background:var(--s2);border-radius:4px;padding:1px 6px;margin-right:4px">' + esc(f.label) + ': ' + esc(f.value) + '</span>';
    }).join('');

    var actions = '<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">';
    if (m.status !== 'DONE' && m.status !== 'CANCELLED') {
      actions += '<button class="btn btn-sm" title="Mark complete" onclick="cxComplete(' + _cxJsId(m.id) + ')">✓</button>';
      actions += m.status === 'BLOCKED'
        ? '<button class="btn btn-sm" onclick="cxUnblock(' + _cxJsId(m.id) + ')">▶ Unblock</button>'
        : '<button class="btn btn-sm" title="Block milestone" onclick="cxBlock(' + _cxJsId(m.id) + ')">⛔</button>';
      actions += '<button class="btn btn-sm" title="Reschedule" onclick="cxReschedule(' + _cxJsId(m.id) + ')">⏳</button>';
      actions += '<button class="btn btn-sm" title="Assign task" onclick="cxAssignTask(' + _cxJsId(p.id) + ',' + _cxJsId(m.id) + ')">' + ICON('user-plus', 12) + ' Task</button>';
      actions += '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + O.gcalUrl(p, m, owners) + '">📅</a>';
    }
    actions += '<button class="btn btn-sm btn-danger" title="Delete milestone" onclick="_cxDeleteMilestone(' + _cxJsId(m.id) + ')">🗑 Delete</button>';
    actions += '</div>';

    return '<div style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--s2);align-items:flex-start">' +
      '<div style="min-width:26px;text-align:center;font-weight:800;color:var(--t2)">' + (i + 1) + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:600">' + sig.emoji + ' ' + esc(m.title) +
      (m.priority ? ' <span class="badge ' + (m.priority === 'CRITICAL' || m.priority === 'HIGH' ? 'badge-red' : m.priority === 'MEDIUM' ? 'badge-amber' : 'badge-grey') + '" style="font-size:10px">' + m.priority + '</span>' : '') + '</div>' +
      (m.description ? '<div style="font-size:12px;color:var(--t2);margin-top:2px">' + esc(m.description) + '</div>' : '') +
      '<div style="font-size:11px;color:var(--t2);margin-top:4px">Owner: ' + esc(owners.map(function (o) { return o.name + (o.type === 'contact' ? ' (external)' : ''); }).join(', ') || 'Unassigned') +
      ' · Start: ' + O.fmt(m.startDate) + ' · Due: ' + O.fmt(m.dueDate) +
      (dep ? ' · After: “' + esc(dep) + '”' : '') + '</div>' +
      (m.status === 'BLOCKED' ? '<div style="font-size:11px;color:#991B1B;margin-top:3px">⛔ ' + esc(m.blockReason || '') + (m.blockNotes ? ' — ' + esc(m.blockNotes) : '') + '</div>' : '') +
      (m.delayReason ? '<div style="font-size:11px;color:var(--t2);margin-top:3px">⏳ Rescheduled from ' + O.fmt(m.prevDueDate) + ': ' + esc(m.delayReason) + '</div>' : '') +
      (m.completionNote ? '<div style="font-size:11px;color:#065F46;margin-top:3px">✓ ' + esc(m.completionNote) + '</div>' : '') +
      (cf ? '<div style="margin-top:4px">' + cf + '</div>' : '') +
      _cxTaskRows(m, D) +
      '</div><div class="cx-milestone-actions">' + actions + '</div></div>';
  }).join('');

  return '<div class="card card-pad"><div class="section-header"><div>' +
    '<div class="section-title">Milestone Timeline</div>' +
    '<div class="section-sub">Manage milestones, tasks, timers, deadlines and completion</div></div></div>' +
    (rows || '<div style="font-size:12px;color:var(--t2)">No milestones yet — add one.</div>') + '</div>';
}

function _cxOverviewTab(p, client, st) {
  var esc = Utils.esc;
  function row(k, v) { return v ? '<tr><td style="font-size:12px;color:var(--t2);padding:4px 12px 4px 0">' + k + '</td><td style="font-size:12px">' + esc(v) + '</td></tr>' : ''; }
  return '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
    '<div class="card card-pad" style="flex:1;min-width:260px"><div class="section-title" style="margin-bottom:6px">Client</div><table>' +
    row('Name', client ? client.name : p.clientName) + row('Email', client && client.email) + row('Phone', client && client.phone) +
    row('Country of Residence', client && client.countryOfResidence) + row('Current Country', client && client.currentCountry) +
    row('UCI', (client && client.uci) || p.uci) + row('Application #', (client && client.applicationNumber) || p.applicationNumber) +
    row('Internal Ref', client && client.internalRef) + '</table></div>' +
    '<div class="card card-pad" style="flex:1;min-width:260px"><div class="section-title" style="margin-bottom:6px">Project</div><table>' +
    row('Service', p.service) + row('Service Group', p.serviceGroup) + row('Description', p.description) +
    row('Start', SisOps.fmt(p.startDate)) + row('Final Deadline', SisOps.fmt(p.deadline)) +
    row('Milestones', st.done + '/' + st.required + ' complete') +
    row('Closed', p.closedAt ? SisOps.fmt(p.closedAt) : '') + '</table></div></div>';
}

function _cxNotesTab(p) {
  var esc = Utils.esc;
  var notes = p.caseNotes || [];
  return '<div class="card card-pad"><div class="section-header"><div class="section-title">Notes</div></div>' +
    '<div style="display:flex;gap:8px;margin-bottom:10px">' +
    '<input id="cx-note-input" class="form-input" style="flex:1" placeholder="Add a project note\u2026">' +
    '<button class="btn btn-primary" onclick="cxAddNote(' + _cxJsId(p.id) + ')">Add</button></div>' +
    (notes.length ? notes.slice().reverse().map(function (n) {
      return '<div style="font-size:12px;padding:6px 0;border-bottom:1px solid var(--s2)">' + esc(n.text) +
        '<div style="font-size:10px;color:var(--t2)">' + new Date(n.at).toLocaleString('en-CA') + '</div></div>';
    }).join('') : '<div style="font-size:12px;color:var(--t2)">No notes yet.</div>') + '</div>';
}
function cxAddNote(pid) {
  var v = (document.getElementById('cx-note-input') || {}).value || '';
  if (!v.trim()) return;
  DataAPI.updateCase(pid, {}, null).then(function () {
    return DataAPI.getProjects();
  }).then(function (ps) {
    var p = ps.filter(function (x) { return x.id === pid; })[0];
    var notes = (p.caseNotes || []).concat([{ text: v.trim(), at: new Date().toISOString() }]);
    return DataAPI.updateCase(pid, { caseNotes: notes });
  }).then(function () { toast('Note added', 'success'); renderCases(); });
}

function _cxRenderActivity(pid) {
  var esc = Utils.esc;
  DataAPI.getCaseAudit(pid).then(function (rows) {
    var el = document.getElementById('cx-activity');
    if (!el) return;
    el.innerHTML = '<div class="section-header"><div><div class="section-title">Activity &amp; Audit Log</div>' +
      '<div class="section-sub">Every change: who, what, when, old \u2192 new, why</div></div></div>' +
      (rows.length ? '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>When</th><th>Action</th><th>Change</th><th>Reason</th></tr></thead><tbody>' +
        rows.map(function (a) {
          return '<tr><td style="font-size:11px;white-space:nowrap">' + new Date(a.at).toLocaleString('en-CA') + '</td>' +
            '<td style="font-size:11px">' + esc(a.action.replace(/_/g, ' ')) + '</td>' +
            '<td style="font-size:11px">' + (a.oldValue != null || a.newValue != null ? esc(String(a.oldValue == null ? '\u2014' : a.oldValue)) + ' \u2192 ' + esc(String(a.newValue == null ? '\u2014' : a.newValue)) : '\u2014') + '</td>' +
            '<td style="font-size:11px">' + esc(a.reason || '\u2014') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div style="font-size:12px;color:var(--t2)">No audit entries yet.</div>');
  });
}

/* ── milestone actions (spec §28/§29/§30) ─────────────────────────────────── */
function cxComplete(id) {
  openModal('Mark Milestone Complete',
    '<div class="form-group"><label class="form-label">Completion note (optional)</label>' +
    '<input id="cx-done-note" class="form-input" placeholder="e.g. All client documents received and verified."></div>',
    '<button class="btn" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="cxCompleteGo(' + _cxJsId(id) + ')">\u2713 Mark Complete</button>');
}
function cxCompleteGo(id) {
  var note = (document.getElementById('cx-done-note') || {}).value || '';
  DataAPI.completeMilestone(id, { note: note.trim() }).then(function (r) {
    closeModal();
    if (typeof syncState === 'function') syncState();
    var msg = 'Milestone Completed \u2705';
    if (r.activated && r.activated.length) msg += ' \u2014 activated: ' + r.activated.map(function (m) { return m.title; }).join(', ');
    toast(msg, 'success');
    renderCases();
  }).catch(function (e) { toast(e.message, 'error'); });
}
function cxBlock(id) {
  var reasons = ['Waiting for client', 'Waiting for documents', 'Waiting for CEO approval', 'Waiting for external response', 'Technical issue', 'Other'];
  openModal('Block Milestone',
    '<div class="form-group"><label class="form-label">What is blocking this milestone?</label>' +
    '<select id="cx-block-reason" class="form-select">' + reasons.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></div>' +
    '<div class="form-group"><label class="form-label">Notes (optional)</label><input id="cx-block-notes" class="form-input"></div>',
    '<button class="btn" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="cxBlockGo(' + _cxJsId(id) + ')">\u26D4 Block</button>');
}
function cxBlockGo(id) {
  DataAPI.blockMilestone(id, {
    reason: (document.getElementById('cx-block-reason') || {}).value,
    notes: (document.getElementById('cx-block-notes') || {}).value || ''
  }).then(function () { closeModal(); toast('Milestone blocked \u26D4', ''); renderCases(); })
    .catch(function (e) { toast(e.message, 'error'); });
}
function cxUnblock(id) {
  DataAPI.unblockMilestone(id).then(function () { toast('Milestone unblocked \u25B6', 'success'); renderCases(); });
}
function cxReschedule(id) {
  openModal('Reschedule Milestone',
    '<div class="form-group"><label class="form-label">Why is this milestone being delayed? (required)</label>' +
    '<input id="cx-resch-reason" class="form-input"></div>' +
    '<div class="form-group"><label class="form-label">New deadline</label>' +
    '<input id="cx-resch-date" type="date" class="form-input"></div>',
    '<button class="btn" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="cxRescheduleGo(' + _cxJsId(id) + ')">Approve New Deadline</button>');
}
function cxRescheduleGo(id) {
  DataAPI.rescheduleMilestone(id, {
    reason: ((document.getElementById('cx-resch-reason') || {}).value || '').trim(),
    newDate: (document.getElementById('cx-resch-date') || {}).value
  }).then(function () { closeModal(); toast('Deadline rescheduled \u2014 history recorded', 'success'); renderCases(); })
    .catch(function (e) { toast(e.message, 'error'); });
}
function cxCloseCase(id) {
  showConfirm('All required milestones are complete. Close this project?', function () {
    DataAPI.closeCase(id).then(function () { toast('Project closed \uD83C\uDFC1', 'success'); cxBackToDash(); })
      .catch(function (e) { toast(e.message, 'error'); });
  });
}
function cxAddMilestone(pid) {
  _cxLoad().then(function (D) {
    var ppl = D.users.map(function (u) { return '<option value="user:' + u.id + '">' + Utils.esc(u.name) + '</option>'; })
      .concat(D.contacts.map(function (c) { return '<option value="contact:' + c.id + '">' + Utils.esc(c.name) + ' (external)</option>'; })).join('');
    openModal('Add Milestone',
      '<div class="form-group"><label class="form-label">Name</label><input id="cx-nm-title" class="form-input"></div>' +
      '<div class="form-group"><label class="form-label">What must be completed?</label><input id="cx-nm-desc" class="form-input"></div>' +
      '<div style="display:flex;gap:8px"><div class="form-group" style="flex:1"><label class="form-label">Owner</label><select id="cx-nm-owner" class="form-select">' + ppl + '</select></div>' +
      '<div class="form-group" style="flex:1"><label class="form-label">Deadline</label><input id="cx-nm-date" type="date" class="form-input"></div></div>' +
      '<div class="form-group"><label class="form-label">Priority</label><select id="cx-nm-pri" class="form-select"><option>CRITICAL</option><option selected>HIGH</option><option>MEDIUM</option><option>LOW</option></select></div>',
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="cxAddMilestoneGo(' + _cxJsId(pid) + ')">Add Milestone</button>');
  });
}
function cxAddMilestoneGo(pid) {
  var t = (document.getElementById('cx-nm-title') || {}).value || '';
  if (!t.trim()) { toast('Milestone name is required', 'error'); return; }
  var ref = ((document.getElementById('cx-nm-owner') || {}).value || 'user:11').split(':');
  DataAPI.getMilestones(pid).then(function (ms) {
    return DataAPI.createMilestone({
      projectId: pid, title: t.trim(),
      description: (document.getElementById('cx-nm-desc') || {}).value || '',
      dueDate: (document.getElementById('cx-nm-date') || {}).value || null,
      priority: (document.getElementById('cx-nm-pri') || {}).value,
      ownerRefs: [{ type: ref[0], id: String(ref[1]) }],
      billable: false, status: 'UPCOMING',
      sortOrder: ms.length + 1
    });
  }).then(function () { closeModal(); toast('Milestone added', 'success'); renderCases(); })
    .catch(function (e) { toast(e.message, 'error'); });
}

/* ==========================================================================
   NEW PROJECT WIZARD (spec §9–§20) — progressive, multiple-choice first
   ========================================================================== */
function cxStartWizard() {
  CASE_WIZ = {
    step: 1, clientMode: 'existing', clientId: null,
    newClient: {}, service: '', serviceGroup: '', customService: '',
    name: '', description: '', priority: 'HIGH', startMode: 'today', startDate: '',
    deadlineMode: 'days', deadlineDays: 10, deadlineDate: '',
    ownerKeys: {}, notifyKeys: {}, newPerson: null,
    milestones: [], templateUsed: false
  };
  _cxWizRender();
}
function _wizStart() {
  var W = CASE_WIZ;
  if (W.startMode === 'today') return Utils.isoDate(new Date());
  if (W.startMode === 'tomorrow') return Utils.isoDate(new Date(Date.now() + 86400000));
  return W.startDate || Utils.isoDate(new Date());
}
function _wizDeadline() {
  var W = CASE_WIZ;
  if (W.deadlineMode === 'date') return W.deadlineDate || null;
  var s = new Date(_wizStart() + 'T00:00:00');
  return Utils.isoDate(new Date(s.getTime() + (Number(W.deadlineDays) || 10) * 86400000));
}

function _cxWizRender() {
  var W = CASE_WIZ; if (!W) return;
  _cxLoad().then(function (D) {
    var esc = Utils.esc, body = '', foot = '', title = 'New Immigration Project';
    var steps = ['Client', 'Service', 'Details', 'People', 'Milestones', 'Review'];
    var crumbs = '<div style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap">' + steps.map(function (s2, i) {
      return '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:' + (i + 1 === W.step ? 'var(--t1)' : 'var(--s2)') + ';color:' + (i + 1 === W.step ? '#fff' : 'var(--t2)') + '">' + (i + 1) + '. ' + s2 + '</span>';
    }).join('') + '</div>';

    /* STEP 1 — CLIENT (§10) */
    if (W.step === 1) {
      title = 'Who is this project for?';
      body = '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<button class="btn' + (W.clientMode === 'existing' ? ' btn-primary' : '') + '" onclick="CASE_WIZ.clientMode=\'existing\';_cxWizRender()">Existing Client</button>' +
        '<button class="btn' + (W.clientMode === 'new' ? ' btn-primary' : '') + '" onclick="CASE_WIZ.clientMode=\'new\';_cxWizRender()">Create New Client</button></div>';
      if (W.clientMode === 'existing') {
        body += '<div class="form-group"><label class="form-label">Select client</label><select id="wiz-client" class="form-select">' +
          (D.clients.length ? D.clients.map(function (c) {
            return '<option value="' + c.id + '"' + (W.clientId === c.id ? ' selected' : '') + '>' + esc(c.name) + (c.internalRef ? ' \u00B7 ' + esc(c.internalRef) : '') + '</option>';
          }).join('') : '<option value="">\u2014 no clients yet, create new \u2014</option>') + '</select></div>';
      } else {
        function fld(id, label, ph) { return '<div class="form-group"><label class="form-label">' + label + '</label><input id="' + id + '" class="form-input" placeholder="' + (ph || '') + '" value="' + esc(W.newClient[id.replace('wiz-nc-', '')] || '') + '"></div>'; }
        body += fld('wiz-nc-name', 'Full Name *') + fld('wiz-nc-email', 'Email') + fld('wiz-nc-phone', 'Phone') +
          '<div style="display:flex;gap:8px"><div style="flex:1">' + fld('wiz-nc-countryOfResidence', 'Country of Residence') + '</div><div style="flex:1">' + fld('wiz-nc-currentCountry', 'Current Country') + '</div></div>' +
          '<div style="display:flex;gap:8px"><div style="flex:1">' + fld('wiz-nc-uci', 'UCI') + '</div><div style="flex:1">' + fld('wiz-nc-internalRef', 'Internal Reference') + '</div></div>';
      }
      foot = '<button class="btn" onclick="cxWizCancel()">Cancel</button><button class="btn btn-primary" onclick="cxWizNext(' + JSON.stringify(1) + ')">Next \u2192</button>';
    }

    /* STEP 2 — SERVICE (§11) */
    else if (W.step === 2) {
      title = 'Which immigration service?';
      body = (SisOps.SERVICE_GROUPS || []).map(function (g) {
        return '<div style="font-size:12px;font-weight:700;margin:8px 0 4px">' + esc(g.group) + '</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' + g.services.map(function (sv) {
            return '<button class="btn btn-sm' + (W.service === sv ? ' btn-primary' : '') + '" onclick="CASE_WIZ.service=' + JSON.stringify(sv).replace(/"/g, '&quot;') + ';CASE_WIZ.serviceGroup=' + JSON.stringify(g.group).replace(/"/g, '&quot;') + ';_cxWizRender()">' + esc(sv) + '</button>';
          }).join('') + '</div>';
      }).join('');
      if (W.service === 'Other')
        body += '<div class="form-group" style="margin-top:10px"><label class="form-label">Custom service name</label><input id="wiz-custom-svc" class="form-input" value="' + esc(W.customService) + '"></div>';
      foot = '<button class="btn" onclick="CASE_WIZ.step=1;_cxWizRender()">\u2190 Back</button><button class="btn btn-primary" onclick="cxWizNext(2)">Next \u2192</button>';
    }

    /* STEP 3 — DETAILS (§12) */
    else if (W.step === 3) {
      title = 'Project details';
      var cl = D.clients.filter(function (c) { return c.id === W.clientId; })[0];
      var suggested = W.name || ((cl ? cl.name : (W.newClient.name || 'Client')) + ' \u2014 ' + (W.service === 'Other' ? W.customService || 'Other' : W.service));
      body = '<div class="form-group"><label class="form-label">Project Name</label><input id="wiz-name" class="form-input" value="' + esc(suggested) + '"></div>' +
        '<div class="form-group"><label class="form-label">Description</label><input id="wiz-desc" class="form-input" value="' + esc(W.description) + '"></div>' +
        '<div class="form-group"><label class="form-label">Priority</label><div style="display:flex;gap:6px">' +
        ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(function (pr) {
          var e2 = Schema.PRIORITY[pr] ? Schema.PRIORITY[pr].emoji + ' ' : '';
          return '<button class="btn btn-sm' + (W.priority === pr ? ' btn-primary' : '') + '" onclick="CASE_WIZ.priority=\'' + pr + '\';_cxWizRender()">' + e2 + pr + '</button>';
        }).join('') + '</div></div>' +
        '<div class="form-group"><label class="form-label">Start Date</label><div style="display:flex;gap:6px;align-items:center">' +
        ['today', 'tomorrow', 'custom'].map(function (mo) {
          return '<button class="btn btn-sm' + (W.startMode === mo ? ' btn-primary' : '') + '" onclick="CASE_WIZ.startMode=\'' + mo + '\';_cxWizRender()">' + mo.charAt(0).toUpperCase() + mo.slice(1) + '</button>';
        }).join('') +
        (W.startMode === 'custom' ? '<input id="wiz-start" type="date" class="form-input" style="width:150px" value="' + esc(W.startDate) + '" onchange="CASE_WIZ.startDate=this.value">' : '') + '</div></div>' +
        '<div class="form-group"><label class="form-label">Final Deadline</label><div style="display:flex;gap:6px;align-items:center">' +
        '<button class="btn btn-sm' + (W.deadlineMode === 'days' ? ' btn-primary' : '') + '" onclick="CASE_WIZ.deadlineMode=\'days\';_cxWizRender()">Days from start</button>' +
        '<button class="btn btn-sm' + (W.deadlineMode === 'date' ? ' btn-primary' : '') + '" onclick="CASE_WIZ.deadlineMode=\'date\';_cxWizRender()">Specific date</button>' +
        (W.deadlineMode === 'days'
          ? '<input id="wiz-dl-days" type="number" min="1" class="form-input" style="width:80px" value="' + W.deadlineDays + '" onchange="CASE_WIZ.deadlineDays=this.value;_cxWizRender()"><span style="font-size:12px;color:var(--t2)">days \u2192 <strong>' + SisOps.fmt(_wizDeadline()) + '</strong></span>'
          : '<input id="wiz-dl-date" type="date" class="form-input" style="width:150px" value="' + esc(W.deadlineDate) + '" onchange="CASE_WIZ.deadlineDate=this.value">') +
        '</div></div>';
      foot = '<button class="btn" onclick="CASE_WIZ.step=2;_cxWizRender()">\u2190 Back</button><button class="btn btn-primary" onclick="cxWizNext(3)">Next \u2192</button>';
    }

    /* STEP 4 — OWNERS + NOTIFY (§13/§14) */
    else if (W.step === 4) {
      title = 'People';
      function chips(mapName, map) {
        var out = D.users.map(function (u) {
          var k = 'user:' + u.id;
          return '<button class="btn btn-sm' + (map[k] ? ' btn-primary' : '') + '" onclick="CASE_WIZ.' + mapName + '[\'' + k + '\']=!CASE_WIZ.' + mapName + '[\'' + k + '\'];_cxWizRender()">' + esc(u.name) + '</button>';
        });
        D.contacts.forEach(function (c) {
          var k = 'contact:' + c.id;
          out.push('<button class="btn btn-sm' + (map[k] ? ' btn-primary' : '') + '" onclick="CASE_WIZ.' + mapName + '[\'' + k + '\']=!CASE_WIZ.' + mapName + '[\'' + k + '\'];_cxWizRender()">' + esc(c.name) + ' (ext)</button>');
        });
        return '<div style="display:flex;gap:6px;flex-wrap:wrap">' + out.join('') + '</div>';
      }
      body = '<div class="form-group"><label class="form-label">Who is responsible for this project? (select one or more)</label>' + chips('ownerKeys', W.ownerKeys) + '</div>' +
        '<div class="form-group"><label class="form-label">Notification recipients (owners are included automatically)</label>' + chips('notifyKeys', W.notifyKeys) + '</div>' +
        '<div class="card card-pad" style="background:var(--s2)"><div style="font-size:12px;font-weight:700;margin-bottom:6px">+ Add New Person (external \u2014 no Oment login)</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<input id="wiz-np-name" class="form-input" style="flex:1;min-width:120px" placeholder="Name *">' +
        '<input id="wiz-np-email" class="form-input" style="flex:1;min-width:140px" placeholder="Email">' +
        '<select id="wiz-np-type" class="form-select" style="width:auto"><option>Consultant</option><option>Lawyer</option><option>Translator</option><option>Client</option><option>Vendor</option><option>Employee</option><option>Other</option></select>' +
        '<button class="btn" onclick="cxWizAddPerson()">Save Contact</button></div>' +
        '<div style="font-size:11px;color:var(--t2);margin-top:4px">Saved as a reusable contact \u2014 selectable above and in future projects.</div></div>';
      foot = '<button class="btn" onclick="CASE_WIZ.step=3;_cxWizRender()">\u2190 Back</button><button class="btn btn-primary" onclick="cxWizNext(4)">Next \u2192</button>';
    }

    /* STEP 5 — MILESTONE BUILDER (§15–§19) */
    else if (W.step === 5) {
      title = 'Milestone Builder';
      if (!W.milestones.length && !W.templateUsed) {
        var svc = W.service === 'Other' ? W.customService : W.service;
        var tpl = ImmTemplates.get(svc);
        body = '<div style="font-size:13px;margin-bottom:10px">Suggested template for <strong>' + esc(svc || 'this service') + '</strong> \u2014 ' + tpl.length + ' milestones. You can edit, reorder or delete everything after accepting.</div>' +
          '<ol style="font-size:12px;color:var(--t2);padding-left:18px;margin:0 0 10px">' + tpl.map(function (t) { return '<li>' + esc(t.title) + '</li>'; }).join('') + '</ol>' +
          '<div style="display:flex;gap:8px"><button class="btn btn-primary" onclick="cxWizUseTemplate()">Accept Template</button>' +
          '<button class="btn" onclick="CASE_WIZ.templateUsed=true;_cxWizRender()">Start From Blank</button></div>';
        foot = '<button class="btn" onclick="CASE_WIZ.step=4;_cxWizRender()">\u2190 Back</button>';
      } else {
        var ppl = D.users.map(function (u) { return { k: 'user:' + u.id, n: u.name }; })
          .concat(D.contacts.map(function (c) { return { k: 'contact:' + c.id, n: c.name + ' (ext)' }; }));
        body = W.milestones.map(function (m, i) {
          var ownerSel = '<select class="form-select" style="width:auto" onchange="CASE_WIZ.milestones[' + i + '].owner=this.value">' +
            ppl.map(function (o) { return '<option value="' + o.k + '"' + (m.owner === o.k ? ' selected' : '') + '>' + esc(o.n) + '</option>'; }).join('') + '</select>';
          var cf = (m.customFields || []).map(function (f, j) {
            return '<span style="font-size:10px;background:#fff;border:1px solid var(--s2);border-radius:4px;padding:1px 6px;margin-right:4px">' + esc(f.label) + ': ' + esc(f.value) +
              ' <a style="cursor:pointer" onclick="CASE_WIZ.milestones[' + i + '].customFields.splice(' + j + ',1);_cxWizRender()">\u2715</a></span>';
          }).join('');
          return '<div class="card card-pad" style="margin-bottom:8px;background:var(--s2)">' +
            '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
            '<strong style="min-width:20px">' + (i + 1) + '.</strong>' +
            '<input class="form-input" style="flex:2;min-width:160px" value="' + esc(m.title) + '" placeholder="Milestone name" onchange="CASE_WIZ.milestones[' + i + '].title=this.value">' +
            ownerSel +
            '<input type="date" class="form-input" style="width:140px" value="' + esc(m.dueDate || '') + '" onchange="CASE_WIZ.milestones[' + i + '].dueDate=this.value">' +
            '<select class="form-select" style="width:auto" onchange="CASE_WIZ.milestones[' + i + '].priority=this.value">' +
            ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(function (pr) { return '<option' + (m.priority === pr ? ' selected' : '') + '>' + pr + '</option>'; }).join('') + '</select>' +
            '<label style="font-size:11px;display:flex;gap:4px;align-items:center"><input type="checkbox"' + (m.afterPrev ? ' checked' : '') + ' onchange="CASE_WIZ.milestones[' + i + '].afterPrev=this.checked"> after previous</label>' +
            '<span style="margin-left:auto;display:flex;gap:4px">' +
            (i > 0 ? '<button class="btn btn-sm" onclick="cxWizMove(' + i + ',-1)">\u2191</button>' : '') +
            (i < W.milestones.length - 1 ? '<button class="btn btn-sm" onclick="cxWizMove(' + i + ',1)">\u2193</button>' : '') +
            '<button class="btn btn-sm" onclick="CASE_WIZ.milestones.splice(' + i + ',1);_cxWizRender()">\uD83D\uDDD1</button></span></div>' +
            '<input class="form-input" style="margin-top:6px" value="' + esc(m.description || '') + '" placeholder="What exactly must be completed?" onchange="CASE_WIZ.milestones[' + i + '].description=this.value">' +
            '<div style="margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">' + cf +
            '<input class="form-input" style="width:130px" id="wiz-cf-l-' + i + '" placeholder="Field label">' +
            '<input class="form-input" style="width:150px" id="wiz-cf-v-' + i + '" placeholder="Value">' +
            '<button class="btn btn-sm" onclick="cxWizAddCF(' + i + ')">+ Field</button></div></div>';
        }).join('') +
          '<button class="btn" onclick="cxWizAddBlankMs()">+ Add Milestone</button>';
        foot = '<button class="btn" onclick="CASE_WIZ.step=4;_cxWizRender()">\u2190 Back</button><button class="btn btn-primary" onclick="cxWizNext(5)">Next \u2192</button>';
      }
    }

    /* STEP 6 — REVIEW + CREATE */
    else {
      title = 'Review & Create';
      var cl2 = D.clients.filter(function (c) { return c.id === W.clientId; })[0];
      var svc2 = W.service === 'Other' ? W.customService : W.service;
      var owners = Object.keys(W.ownerKeys).filter(function (k) { return W.ownerKeys[k]; });
      body = '<table style="font-size:12px">' +
        '<tr><td style="color:var(--t2);padding:3px 12px 3px 0">Client</td><td>' + esc(cl2 ? cl2.name : W.newClient.name || '') + '</td></tr>' +
        '<tr><td style="color:var(--t2);padding:3px 12px 3px 0">Service</td><td>' + esc(svc2) + '</td></tr>' +
        '<tr><td style="color:var(--t2);padding:3px 12px 3px 0">Project</td><td>' + esc(W.name) + '</td></tr>' +
        '<tr><td style="color:var(--t2);padding:3px 12px 3px 0">Priority</td><td>' + W.priority + '</td></tr>' +
        '<tr><td style="color:var(--t2);padding:3px 12px 3px 0">Start \u2192 Deadline</td><td>' + SisOps.fmt(_wizStart()) + ' \u2192 <strong>' + SisOps.fmt(_wizDeadline()) + '</strong></td></tr>' +
        '<tr><td style="color:var(--t2);padding:3px 12px 3px 0">Owners</td><td>' + owners.length + ' selected</td></tr>' +
        '<tr><td style="color:var(--t2);padding:3px 12px 3px 0">Milestones</td><td>' + W.milestones.length + '</td></tr></table>' +
        '<div style="font-size:11px;color:var(--t2);margin-top:8px">On create: milestones get deadlines auto-spread up to the final deadline (where not set), dependencies chain "after previous", and every milestone gets a one-click Google Calendar event with <strong>[SIS] Client \u2014 Milestone</strong> naming.</div>';
      foot = '<button class="btn" onclick="CASE_WIZ.step=5;_cxWizRender()">\u2190 Back</button><button class="btn btn-primary" onclick="cxWizCreate()">\uD83C\uDF41 Create Project</button>';
    }

    openModal(title, crumbs + body, foot);
  });
}

function cxWizCancel() { CASE_WIZ = null; closeModal(); }
function cxWizMove(i, d) {
  var a = CASE_WIZ.milestones, t = a[i]; a[i] = a[i + d]; a[i + d] = t; _cxWizRender();
}
function cxWizAddCF(i) {
  var l = (document.getElementById('wiz-cf-l-' + i) || {}).value || '';
  var v = (document.getElementById('wiz-cf-v-' + i) || {}).value || '';
  if (!l.trim()) return;
  (CASE_WIZ.milestones[i].customFields = CASE_WIZ.milestones[i].customFields || []).push({ label: l.trim(), value: v.trim() });
  _cxWizRender();
}
function cxWizAddBlankMs() {
  CASE_WIZ.milestones.push({ title: '', description: '', owner: Object.keys(CASE_WIZ.ownerKeys).filter(function (k) { return CASE_WIZ.ownerKeys[k]; })[0] || 'user:11', dueDate: '', priority: 'HIGH', afterPrev: CASE_WIZ.milestones.length > 0, customFields: [] });
  _cxWizRender();
}
function cxWizUseTemplate() {
  var W = CASE_WIZ;
  var svc = W.service === 'Other' ? W.customService : W.service;
  var tpl = ImmTemplates.get(svc);
  var start = new Date(_wizStart() + 'T00:00:00');
  var defOwner = Object.keys(W.ownerKeys).filter(function (k) { return W.ownerKeys[k]; })[0] || 'user:11';
  var cursor = new Date(start);
  W.milestones = tpl.map(function (t, i) {
    cursor = new Date(cursor.getTime() + (t.days || 1) * 86400000);
    return { title: t.title, description: t.description, owner: defOwner, dueDate: Utils.isoDate(cursor), priority: t.priority, afterPrev: i > 0, customFields: [] };
  });
  /* deadline se aage mat jao — clamp (spec §12 auto-calculation) */
  var dl = _wizDeadline();
  if (dl) W.milestones.forEach(function (m) { if (m.dueDate > dl) m.dueDate = dl; });
  W.templateUsed = true;
  _cxWizRender();
}
function cxWizAddPerson() {
  var name = (document.getElementById('wiz-np-name') || {}).value || '';
  if (!name.trim()) { toast('Name is required', 'error'); return; }
  DataAPI.createContact({
    name: name.trim(),
    email: (document.getElementById('wiz-np-email') || {}).value || '',
    type: (document.getElementById('wiz-np-type') || {}).value || 'Other',
    reusable: true
  }).then(function (c) {
    CASE_WIZ.ownerKeys['contact:' + c.id] = true;
    toast('Contact saved \u2014 ' + c.name, 'success');
    _cxWizRender();
  }).catch(function (e) { toast(e.message, 'error'); });
}

function cxWizNext(from) {
  var W = CASE_WIZ;
  if (from === 1) {
    if (W.clientMode === 'existing') {
      var sel = document.getElementById('wiz-client');
      W.clientId = sel && sel.value ? Number(sel.value) : null;
      if (W.clientId == null) { W.clientMode = 'new'; _cxWizRender(); return; }
    } else {
      ['name', 'email', 'phone', 'countryOfResidence', 'currentCountry', 'uci', 'internalRef'].forEach(function (f) {
        var el = document.getElementById('wiz-nc-' + f); if (el) W.newClient[f] = el.value;
      });
      if (!(W.newClient.name || '').trim()) { toast('Client name is required', 'error'); return; }
    }
    W.step = 2;
  } else if (from === 2) {
    if (!W.service) { toast('Select a service', 'error'); return; }
    if (W.service === 'Other') {
      var cs = document.getElementById('wiz-custom-svc');
      W.customService = cs ? cs.value : W.customService;
      if (!(W.customService || '').trim()) { toast('Enter the custom service name', 'error'); return; }
    }
    W.step = 3;
  } else if (from === 3) {
    W.name = (document.getElementById('wiz-name') || {}).value || '';
    W.description = (document.getElementById('wiz-desc') || {}).value || '';
    if (!W.name.trim()) { toast('Project name is required', 'error'); return; }
    if (W.deadlineMode === 'date' && !W.deadlineDate) { toast('Pick the final deadline', 'error'); return; }
    W.step = 4;
  } else if (from === 4) {
    if (!Object.keys(W.ownerKeys).some(function (k) { return W.ownerKeys[k]; })) { toast('Select at least one project owner', 'error'); return; }
    W.step = 5;
  } else if (from === 5) {
    W.milestones = W.milestones.filter(function (m) { return (m.title || '').trim(); });
    if (!W.milestones.length) { toast('Add at least one milestone', 'error'); return; }
    W.step = 6;
  }
  _cxWizRender();
}

function cxWizCreate() {
  var W = CASE_WIZ;
  var clientP = W.clientMode === 'existing' && W.clientId != null
    ? DataAPI.getClients().then(function (cs) { return cs.filter(function (c) { return c.id === W.clientId; })[0]; })
    : DataAPI.createClient(W.newClient);
  clientP.then(function (client) {
    var refs = function (map) {
      return Object.keys(map).filter(function (k) { return map[k]; }).map(function (k) {
        var a = k.split(':'); return { type: a[0], id: String(a[1]) };
      });
    };
    var ownerRefs = refs(W.ownerKeys);
    return DataAPI.createCase({
      name: W.name.trim(),
      description: W.description,
      clientId: client ? client.id : null,
      clientName: client ? client.name : (W.newClient.name || ''),
      clientEmail: client ? client.email : '',
      service: W.service === 'Other' ? W.customService.trim() : W.service,
      serviceGroup: W.serviceGroup,
      priority: W.priority,
      startDate: _wizStart(),
      deadline: _wizDeadline(),
      ownerRefs: ownerRefs,
      notifyRefs: ownerRefs.concat(refs(W.notifyKeys))
    });
  }).then(function (proj) {
    /* milestones sequentially (dependency ids chain ke liye) */
    var prevId = null, chain = Promise.resolve();
    W.milestones.forEach(function (m, i) {
      chain = chain.then(function () {
        var a = (m.owner || 'user:11').split(':');
        return DataAPI.createMilestone({
          projectId: proj.id, title: m.title.trim(), description: m.description || '',
          dueDate: m.dueDate || proj.deadline, priority: m.priority,
          ownerRefs: [{ type: a[0], id: String(a[1]) }],
          dependsOn: m.afterPrev ? prevId : null,
          customFields: m.customFields || [],
          status: i === 0 ? 'IN_PROGRESS' : 'UPCOMING',
          billable: false, sortOrder: i + 1,
          startDate: i === 0 ? proj.startDate : null
        }).then(function (created) { prevId = created.id; });
      });
    });
    return chain.then(function () { return proj; });
  }).then(function (proj) {
    CASE_WIZ = null; closeModal();
    if (typeof syncState === 'function') syncState();
    toast('Project created \uD83C\uDF41 \u2014 ' + proj.name, 'success');
    cxOpenCase(proj.id);
  }).catch(function (e) { toast(e.message || 'Create failed', 'error'); });
}


/* ── Assign Task (milestone → employee-app deliverable) ───────────────────
   Auto-fills title/deadline from the milestone; assignee ko turant in-app
   notification jaata hai aur task employee workspace mein dikh jaata hai. */
function cxAssignTask(pid, msId) {
  Promise.all([DataAPI.getMilestones(pid), DataAPI.getEmployees()]).then(function (r) {
    var m = (r[0] || []).filter(function (x) { return x.id === msId; })[0] || {};
    var emps = r[1] || [];
    var opts = emps.map(function (e) { return '<option value="' + e.id + '">' + Utils.esc(e.name) + ' \u2014 ' + Utils.esc(e.role) + '</option>'; }).join('');
    openModal('Assign Task \u2014 ' + Utils.esc(m.title || ''),
      '<div class="form-group"><label class="form-label">Task</label><input id="cx-at-title" class="form-input" value="' + Utils.esc(m.title || '') + '"></div>' +
      '<div class="form-group"><label class="form-label">Details</label><input id="cx-at-desc" class="form-input" value="' + Utils.esc(m.description || '') + '"></div>' +
      '<div style="display:flex;gap:8px"><div class="form-group" style="flex:1"><label class="form-label">Assign to</label><select id="cx-at-who" class="form-select">' + opts + '</select></div>' +
      '<div class="form-group" style="flex:1"><label class="form-label">Deadline</label><input id="cx-at-due" type="date" class="form-input" value="' + Utils.esc((m.dueDate || '').slice(0, 10)) + '"></div></div>',
      '<button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="cxAssignTaskGo(' + _cxJsId(pid) + ',' + _cxJsId(msId) + ')">Assign Task</button>');
  });
}
function cxAssignTaskGo(pid, msId) {
  var due = (document.getElementById('cx-at-due') || {}).value;
  DataAPI.createDeliverable({
    projectId: pid, milestoneId: msId,
    title: ((document.getElementById('cx-at-title') || {}).value || '').trim(),
    description: (document.getElementById('cx-at-desc') || {}).value || '',
    priority: 'HIGH', status: 'TODO',
    assigneeIds: [(document.getElementById('cx-at-who') || {}).value],
    createdById: STATE.adminUser && STATE.adminUser.id ? STATE.adminUser.id : null, origin: 'ADMIN',
    dueAt: due ? due + 'T18:00:00' : new Date(Date.now() + 86400000).toISOString(),
    estimateSecs: 4 * 3600
  }).then(function (d) {
    closeModal();
    if (typeof syncState === 'function') syncState();
    toast('Task assigned \u2014 "' + d.title + '" (employee app mein notify ho gaya)', 'success');
  }).catch(function (e) { toast(e.message, 'error'); });
}
