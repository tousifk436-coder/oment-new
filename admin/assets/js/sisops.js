/* ============================================================================
   SIS OPERATIONS VIEW (admin) — spec ka live control room
   ----------------------------------------------------------------------------
   Ek screen par: deadline-risk banners, aaj ka kaam, milestone control table
   (complete / delay / Google Calendar / email reminder), Nabeel & Humera ke
   pending queues, aur Daily Operations Report (copy ya email).
   Engine: shared/sis-ops.js · Data: DataAPI · Escaping: Utils.esc
   ============================================================================ */

var _sisDelayOpen = null;   // milestone id jiska delay-form khula hai

function renderSisOps() {
  var rootEl = document.getElementById('sisops-root');
  if (!rootEl || !window.SisOps || !window.DataAPI) return;

  Promise.all([DataAPI.getProjects(), DataAPI.getMilestones(), DataAPI.getEmployees(),
               DataAPI.getContacts ? DataAPI.getContacts() : Promise.resolve([])])
    .then(function (res) {
      var projects = res[0] || [];
      var milestones = res[1] || [];
      var employees = res[2] || [];
      window.__sisContacts = res[3] || [];
      _sisDraw(rootEl, projects, milestones, employees);
    })
    .catch(function (e) { rootEl.innerHTML = '<div class="card card-pad">Operations data could not be loaded: ' + Utils.esc(e.message || e) + '</div>'; });
}

function _sisDraw(rootEl, projects, milestones, employees) {
  var O = SisOps, esc = Utils.esc;
  var people = { users: employees, contacts: (window.__sisContacts || []) };
  var rep = O.dailyReport(projects, milestones, people);

  /* ── Risk banners (spec §15) ─────────────────────────────────────────── */
  var banners = rep.risks.map(function (r) {
    return '<div class="card card-pad" style="border-left:4px solid #DC2626;margin-bottom:12px;background:#FEF2F2">' +
      '<div style="font-weight:700;color:#991B1B">\uD83D\uDD34\uD83D\uDD34 PROJECT DEADLINE RISK \u2014 ' + esc(r.project.name) + '</div>' +
      '<div style="font-size:13px;color:#7F1D1D;margin-top:4px">' + esc(r.reasons.join(' ')) + '</div>' +
      '<div style="font-size:12px;color:#7F1D1D;margin-top:4px">Final deadline: <strong>' + O.fmt(r.project.deadline) + '</strong> \u00B7 ' + r.stats.done + '/' + r.stats.total + ' milestones done \u00B7 Owner: ' + esc(O.ownerOf(r.stats.nextMilestone || {}, r.project, employees).name) + ' should act now.</div>' +
      '</div>';
  }).join('');

  /* ── Stat tiles ──────────────────────────────────────────────────────── */
  function tile(n, label, color) {
    return '<div class="card card-pad" style="flex:1;min-width:130px;text-align:center">' +
      '<div style="font-size:26px;font-weight:800;color:' + color + '">' + n + '</div>' +
      '<div style="font-size:12px;color:var(--t2)">' + label + '</div></div>';
  }
  var tiles = '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">' +
    tile(rep.active.length, 'Active Projects', 'var(--t1)') +
    tile(rep.dueToday.length, 'Due Today \uD83D\uDFE0', '#D97706') +
    tile(rep.overdue.length, 'Overdue \uD83D\uDD34', '#DC2626') +
    tile(rep.dueSoon.length, 'Due Soon \uD83D\uDFE1', '#CA8A04') +
    tile(rep.completed.length, 'Completed \u2705', '#059669') +
    '</div>';

  /* ── Project overview cards (spec §13) ───────────────────────────────── */
  var projCards = rep.active.map(function (p) {
    var st = O.projectStats(p, milestones);
    var dl = st.daysLeft;
    var dlTxt = dl == null ? '\u2014' : dl < 0 ? Math.abs(dl) + ' days past deadline' : dl + ' days remaining';
    var dlColor = dl != null && dl < 0 ? '#DC2626' : dl != null && dl <= 3 ? '#D97706' : 'var(--t2)';
    var pr = (window.Schema && Schema.PRIORITY[p.priority]) || null;
    return '<div class="card card-pad" style="flex:1;min-width:260px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
      '<div style="font-weight:700">' + esc(p.name) + '</div>' +
      '<span class="badge ' + (p.priority === 'HIGH' || p.priority === 'CRITICAL' ? 'badge-red' : p.priority === 'MEDIUM' ? 'badge-amber' : 'badge-grey') + '">' + (pr ? pr.emoji + ' ' + pr.label : esc(p.priority || '')) + '</span></div>' +
      '<div style="font-size:12px;color:var(--t2);margin-top:2px">' + esc(p.service || p.clientName || '') + '</div>' +
      '<div style="height:8px;background:var(--s2);border-radius:6px;margin:10px 0 6px;overflow:hidden">' +
      '<div style="height:100%;width:' + st.pct + '%;background:' + (st.overdue ? '#DC2626' : '#059669') + ';border-radius:6px"></div></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:12px">' +
      '<span>' + st.done + '/' + st.total + ' milestones \u00B7 ' + st.pct + '%</span>' +
      '<span style="color:' + dlColor + ';font-weight:600">' + dlTxt + '</span></div>' +
      '</div>';
  }).join('');

  /* ── Milestone control table ─────────────────────────────────────────── */
  var pendRows = rep.pending.slice().sort(function (a, b) { return b.sig.order - a.sig.order || (a.days || 0) - (b.days || 0); });
  var tableRows = pendRows.map(function (r) {
    var m = r.m, p = r.p;
    var delayForm = _sisDelayOpen === m.id ?
      '<tr><td colspan="6" style="background:var(--s2)">' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0">' +
      '<span style="font-size:12px;font-weight:600">Reschedule \u2014 why is this milestone delayed?</span>' +
      '<input id="sis-delay-reason-' + m.id + '" class="form-input" style="flex:1;min-width:180px" placeholder="Reason for delay (required)">' +
      '<input id="sis-delay-date-' + m.id + '" type="date" class="form-input" style="width:160px">' +
      '<button class="btn btn-primary" onclick="sisSaveDelay(' + _sisJsId(m.id) + ')">Approve New Deadline</button>' +
      '<button class="btn" onclick="_sisDelayOpen=null;renderSisOps()">Cancel</button>' +
      '</div></td></tr>' : '';
    return '<tr>' +
      '<td><div style="font-weight:600">' + esc(m.title) + '</div><div style="font-size:11px;color:var(--t2)">' + esc(p.name) + '</div></td>' +
      '<td>' + esc(r.owner.name) + '</td>' +
      '<td>' + O.fmt(m.dueDate) + (r.days != null && r.days < 0 ? ' <span style="color:#DC2626;font-size:11px">(' + Math.abs(r.days) + 'd late)</span>' : '') + '</td>' +
      '<td><span class="badge ' + (r.sig.tone === 'red' ? 'badge-red' : r.sig.tone === 'amber' ? 'badge-amber' : 'badge-green') + '">' + r.sig.emoji + ' ' + r.sig.label + '</span>' +
      (m.delayReason ? '<div style="font-size:11px;color:var(--t2)">Rescheduled: ' + esc(m.delayReason) + '</div>' : '') + '</td>' +
      '<td style="white-space:nowrap">' +
      '<button class="btn btn-sm" title="Mark completed" onclick="sisComplete(' + _sisJsId(m.id) + ')">\u2705 Complete</button> ' +
      '<button class="btn btn-sm" title="Reschedule" onclick="sisDelay(' + _sisJsId(m.id) + ')">\u23F3 Delay</button>' +
      '</td>' +
      '<td style="white-space:nowrap">' +
      '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + O.gcalUrl(p, m, r.owner) + '" title="Add to Google Calendar">\uD83D\uDCC5 Calendar</a> ' +
      (r.owner.email ? '<a class="btn btn-sm" href="' + O.reminderMail(r.days != null && r.days < 0 ? 'OVERDUE' : r.days === 0 ? 'DUE' : 'START', p, m, r.owner) + '" title="Email reminder to owner">\u2709\uFE0F Remind</a>' : '') +
      '</td></tr>' + delayForm;
  }).join('');

  var table = '<div class="card card-pad" style="margin-bottom:16px">' +
    '<div class="section-header"><div><div class="section-title">Milestone Control</div>' +
    '<div class="section-sub">Every pending milestone across active projects \u2014 sorted by urgency</div></div>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn" onclick="sisDownloadIcs()">\uD83D\uDCC6 Download .ics (all milestones)</button>' +
    '</div></div>' +
    (pendRows.length ?
      '<div style="overflow-x:auto"><table class="data-table"><thead><tr>' +
      '<th>Milestone / Project</th><th>Owner</th><th>Deadline</th><th>Status</th><th>Update</th><th>Calendar / Email</th>' +
      '</tr></thead><tbody>' + tableRows + '</tbody></table></div>'
      : '<div style="color:var(--t2);font-size:13px">No pending milestones. \uD83C\uDF89</div>') +
    '</div>';

  /* ── Per-owner queues (spec §14 / §24 My Tasks) ──────────────────────── */
  function queue(title, items, email) {
    return '<div class="card card-pad" style="flex:1;min-width:260px">' +
      '<div class="section-title" style="margin-bottom:8px">' + title + ' <span style="font-weight:400;color:var(--t2)">(' + items.length + ' pending)</span></div>' +
      (items.length ? items.map(function (r) {
        return '<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--s2);font-size:13px">' +
          '<div>' + r.sig.emoji + ' ' + esc(r.m.title) + '<div style="font-size:11px;color:var(--t2)">' + esc(r.p.name) + '</div></div>' +
          '<div style="white-space:nowrap;color:var(--t2)">' + O.fmt(r.m.dueDate) + '</div></div>';
      }).join('') : '<div style="color:var(--t2);font-size:13px">Nothing pending.</div>') +
      '</div>';
  }

  /* ── Daily report card ───────────────────────────────────────────────── */
  var reportCard = '<div class="card card-pad" style="margin-bottom:16px">' +
    '<div class="section-header"><div><div class="section-title">Daily Operations Report</div>' +
    '<div class="section-sub">Spec \u00A714 \u2014 aaj ka poora operational snapshot</div></div>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn" onclick="sisCopyReport()">\uD83D\uDCCB Copy Report</button>' +
    '<a class="btn btn-primary" href="' + _sisReportMailto(rep) + '">\u2709\uFE0F Email to Team</a>' +
    '</div></div>' +
    '<pre id="sis-report-text" style="white-space:pre-wrap;font-size:12px;line-height:1.6;background:var(--s2);padding:12px;border-radius:8px;margin:0">' + esc(O.reportText(rep)) + '</pre>' +
    '</div>';

  var queues = rep.byOwner.slice(0, 6).map(function (g) {
    return queue('\uD83D\uDC64 ' + esc(g.person.name) + (g.person.type === 'contact' ? ' <span style="font-weight:400;color:var(--t2)">(external)</span>' : ''), g.items);
  }).join('');

  rootEl.innerHTML =
    banners + tiles +
    '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">' + projCards + '</div>' +
    table +
    '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">' + queues + '</div>' +
    reportCard;
}

function _sisJsId(id) {
  return "'" + String(id).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

/* ── Actions ─────────────────────────────────────────────────────────────── */

function sisComplete(id) {
  DataAPI.updateMilestone(id, { status: 'DONE', completedAt: new Date().toISOString() })
    .then(function (m) {
      m = m || {};
      if (typeof syncState === 'function') syncState();
      toast('Milestone Completed \u2705 \u2014 ' + (m.title || ''), 'success');
      renderSisOps();
    })
    .catch(function (e) { toast(e.message || 'Update failed', 'error'); });
}

function sisDelay(id) { _sisDelayOpen = id; renderSisOps(); }

function sisSaveDelay(id) {
  var reason = (document.getElementById('sis-delay-reason-' + id) || {}).value || '';
  var date = (document.getElementById('sis-delay-date-' + id) || {}).value || '';
  if (!reason.trim()) { toast('Delay reason is required (spec \u00A711)', 'error'); return; }
  if (!date) { toast('Please pick the new deadline date', 'error'); return; }
  DataAPI.getMilestones().then(function (rows) {
    var m = (rows || []).filter(function (x) { return x.id === id; })[0] || {};
    return DataAPI.updateMilestone(id, {
      dueDate: date,
      delayReason: reason.trim(),
      prevDueDate: m.dueDate || null,
      rescheduledAt: new Date().toISOString()
    });
  }).then(function () {
    _sisDelayOpen = null;
    if (typeof syncState === 'function') syncState();
    toast('Deadline rescheduled \u2014 reason recorded', 'success');
    renderSisOps();
  }).catch(function (e) { toast(e.message || 'Reschedule failed', 'error'); });
}

function sisDownloadIcs() {
  Promise.all([DataAPI.getProjects(), DataAPI.getMilestones(), DataAPI.getEmployees()]).then(function (res) {
    var ics = SisOps.icsAll(res[0] || [], res[1] || [], res[2] || []);
    var blob = new Blob([ics], { type: 'text/calendar' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'SIS-milestones.ics';
    document.body.appendChild(a); a.click(); a.remove();
    toast('.ics downloaded \u2014 import into Google Calendar', 'success');
  });
}

function sisCopyReport() {
  var el = document.getElementById('sis-report-text');
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(function () { toast('Report copied', 'success'); });
}

function _sisReportMailto(rep) {
  var to = SisOps.TEAM.NABEEL.email + ',' + SisOps.TEAM.HUMERA.email;
  return 'mailto:' + to +
    '?subject=' + encodeURIComponent('SIS Daily Operations Report \u2014 ' + new Date().toLocaleDateString('en-CA')) +
    '&body=' + encodeURIComponent(SisOps.reportText(rep));
}
