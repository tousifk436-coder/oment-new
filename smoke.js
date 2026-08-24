const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function makeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear(),
    key: i => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; }
  };
}

async function boot(appDir, label) {
  const htmlPath = path.join(ROOT, appDir, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'http://localhost/' + appDir + '/',
    pretendToBeVisual: true
  });
  const w = dom.window;

  Object.defineProperty(w, 'localStorage', { value: makeStorage(), configurable: true });
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
  w.requestAnimationFrame = cb => setTimeout(cb, 0);
  // jsdom mein fetch nahi hota — Een ke network paths test karne ke liye chahiye
  w.fetch = (...a) => globalThis.fetch(...a);
  w.AbortController = globalThis.AbortController;
  w.scrollTo = () => {};
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  w.console.error = (...a) => errors.push('console.error: ' + a.map(String).join(' '));
  w.console.warn = () => {};

  // collect script srcs in order
  const srcs = Array.from(dom.window.document.querySelectorAll('script[src]')).map(s => s.getAttribute('src'));

  for (const src of srcs) {
    const file = path.resolve(path.join(ROOT, appDir), src);
    if (!fs.existsSync(file)) { errors.push('MISSING FILE: ' + src); continue; }
    const code = fs.readFileSync(file, 'utf8');
    try {
      w.eval(code);
    } catch (e) {
      errors.push(`LOAD ERROR in ${src}: ${e.message}`);
    }
  }

  // fire DOMContentLoaded
  try {
    const ev = new w.Event('DOMContentLoaded');
    w.document.dispatchEvent(ev);
    w.dispatchEvent(ev);
  } catch (e) { errors.push('DCL: ' + e.message); }

  await new Promise(r => setTimeout(r, 250));
  return { w, errors, dom };
}

(async () => {
  let fails = 0;
  const check = (cond, msg) => { console.log((cond ? '  \u2713 ' : '  \u2717 ') + msg); if (!cond) fails++; };

  /* ══════════════════ ADMIN ══════════════════ */
  console.log('\n═══ ADMIN ═══');
  const A = await boot('admin', 'admin');
  A.errors.forEach(e => { console.log('  ! ' + e); fails++; });

  const aw = A.w;
  check(typeof aw.DataAPI === 'object', 'DataAPI loaded');
  check(typeof aw.STATE === 'object', 'STATE exists');
  check(aw.STATE.employees.length === 3, `employees projected (${aw.STATE.employees.length})`);
  check(aw.STATE.projects.length === 0, 'clean slate: no seeded projects');
  check(aw.STATE.tasks.length === 0, 'clean slate: no seeded tasks');
  check(aw.document.getElementById('view-dashboard').classList.contains('active'), 'dashboard view active');
  check(aw.document.getElementById('stats-bar').innerHTML.length > 50, 'stats bar rendered');
  check(aw.document.getElementById('sidebar-avatar').textContent === 'HK', 'admin avatar set');

  // navigate every module
  const modules = ['employees','hrm','sisops','cases','calendar','settings','dashboard'];
  for (const m of modules) {
    const before = A.errors.length;
    try {
      aw.gotoModule(m);
      const v = aw.document.getElementById('view-' + m);
      const rendered = v && v.innerHTML.trim().length > 40;
      check(rendered, `module "${m}" renders (${v ? v.innerHTML.length : 0} chars)`);
    } catch (e) {
      check(false, `module "${m}" threw: ${e.message}`);
    }
  }

  // view shells — HTML se JS mein nikale gaye
  try {
    check(typeof aw.VIEW_SHELLS === 'object', 'view shells loaded from JS');
    const shellIds = Object.keys(aw.VIEW_SHELLS);
    check(shellIds.length >= 4, `${shellIds.length} views moved out of index.html`);

    // har shell mount hone pe apne key elements deta hai
    const mustHave = {
      'view-dashboard': 'stats-bar',
      'view-employees': 'emp-cards-grid'
    };
    for (const [vid, needle] of Object.entries(mustHave)) {
      const name = vid.replace('view-', '');
      aw.mountView(name);
      const v = aw.document.getElementById(vid);
      check(v && v.innerHTML.includes(needle), `"${name}" shell provides its markup`);
    }

    // dobara mount karne se pehle ka render na ude
    aw.gotoModule('employees');
    await new Promise(r => setTimeout(r, 100));
    const filled = aw.document.getElementById('emp-cards-grid').innerHTML.length;
    check(filled > 200, 'employees rendered into its shell');
    aw.mountView('employees');
    check(aw.document.getElementById('emp-cards-grid').innerHTML.length === filled,
      'remounting does not wipe rendered content');

    // settings apna poora view khud banata hai — shell nahi hona chahiye
    check(!aw.VIEW_SHELLS['view-settings'], 'no dead shell for JS-rendered settings');
    aw.gotoModule('settings');
    await new Promise(r => setTimeout(r, 100));
    check(aw.document.getElementById('view-settings').innerHTML.includes('set-company'),
      'settings still renders fully from JS');

  } catch (e) { check(false, 'view shells: ' + e.message); }

  // HRM module — all five tabs
  try {
    aw.gotoModule('hrm');
    for (const t of ['today','register','leave','timesheets','capacity']) {
      aw.hrSetTab(t);
      await new Promise(r => setTimeout(r, 120));
      const pane = aw.document.getElementById('hr-pane');
      check(pane && pane.innerHTML.length > 200 && !pane.innerHTML.includes('Loading…'),
        `HRM tab "${t}" renders (${pane ? pane.innerHTML.length : 0} chars)`);
    }
  } catch (e) { check(false, 'HRM tabs: ' + e.message); }

  // leave workflow
  try {
    // weekend/holiday se bachne ke liye agla working day dhoondo
    let from = null, to = null;
    for (let i = 7; i < 40 && !from; i++) {
      const d = aw.Utils.isoDate(aw.Utils.daysFromNow(i));
      if (!aw.HRM.isWeekOff(d) && !aw.HRM.holidayOn(d)) { from = d; to = d; }
    }
    const req = await aw.HRM.applyLeave({ employeeId: 12, type: 'CL', fromDate: from, toDate: to, reason: 'Smoke test' });
    check(req.status === 'PENDING', 'leave applied');
    try { await aw.HRM.rejectLeave(req.id, ''); check(false, 'empty reject reason should fail'); }
    catch (e2) { check(e2.code === 'VALIDATION', 'leave rejection needs a reason'); }
    await aw.HRM.approveLeave(req.id);
    const bal = (await aw.HRM.getBalances(12)).find(b => b.type === 'CL');
    check(bal.used >= req.days, 'balance deducted on approval');
    const marked = aw.DataAPI.raw().attendance.filter(a => a.leaveRequestId === req.id);
    check(marked.length === req.days, 'attendance marked ON_LEAVE for approved days');
  } catch (e) { check(false, 'leave workflow: ' + e.message); }

  // Immigration Case Management (spec §69 test battery)
  try {
    check(typeof aw.ImmTemplates === 'object', 'milestone templates loaded');
    check(aw.ImmTemplates.get('Visitor Visa / TRV').length === 10, 'Visitor Visa template has 10 steps');
    check(aw.ImmTemplates.get('Unknown Service X').length > 0, 'unknown service falls back to generic template');

    // client create + dedupe
    const c1 = await aw.DataAPI.createClient({ name: 'Test Client', email: 'test.client@example.com', countryOfNationality: 'India' });
    const c2 = await aw.DataAPI.createClient({ name: 'Test Client 2', email: 'TEST.CLIENT@example.com' });
    check(c1.id === c2.id, 'duplicate client (same email) is not created twice');

    // external contact create + dedupe, no login
    const x1 = await aw.DataAPI.createContact({ name: 'Ext Lawyer', email: 'lawyer@example.com', type: 'Lawyer' });
    const x2 = await aw.DataAPI.createContact({ name: 'Ext Lawyer Again', email: 'lawyer@example.com' });
    check(x1.id === x2.id, 'duplicate contact (same email) suppressed');
    check((await aw.DataAPI.getEmployees()).every(e => e.email !== 'lawyer@example.com'), 'external contact gets NO Oment login/user account');

    // case creation with mixed owners + 10-day deadline
    const start = new Date().toISOString().slice(0, 10);
    const dl = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    const cs = await aw.DataAPI.createCase({
      name: 'Test Client — Study Permit', service: 'Study Permit', serviceGroup: 'Temporary Residence',
      clientId: c1.id, clientName: c1.name, priority: 'HIGH', startDate: start, deadline: dl,
      ownerRefs: [{ type: 'user', id: 11 }, { type: 'contact', id: x1.id }],
      notifyRefs: [{ type: 'user', id: 10 }]
    });
    check(cs.kind === 'IMMIGRATION' && cs.deadline === dl, 'case created with 10-day deadline');

    const mA = await aw.DataAPI.createMilestone({ projectId: cs.id, title: 'Step A', dueDate: start, ownerRefs: [{ type: 'user', id: 11 }], status: 'IN_PROGRESS', billable: false, sortOrder: 1 });
    const mB = await aw.DataAPI.createMilestone({ projectId: cs.id, title: 'Step B', dueDate: dl, ownerRefs: [{ type: 'contact', id: x1.id }], dependsOn: mA.id, billable: false, sortOrder: 2 });
    check(mB.dependsOn === mA.id && mB.ownerRefs[0].type === 'contact', 'milestone carries dependency + external owner');

    // recipients: milestone owner + project notifyRefs, dedupe
    const P2 = await aw.DataAPI.getProjects(); const M2 = await aw.DataAPI.getMilestones();
    const E2 = await aw.DataAPI.getEmployees(); const X2 = await aw.DataAPI.getContacts();
    const ppl = { users: E2, contacts: X2 };
    const rec = aw.SisOps.recipientsOf(M2.find(m => m.id === mB.id), P2.find(p => p.id === cs.id), ppl);
    check(rec.some(r => r.email === 'lawyer@example.com') && rec.some(r => r.email === 'humera@stansteadimmigration.com'),
      'notifications resolve to external contact + notify recipients');

    // completion → dependent activates + audit trail
    const done = await aw.DataAPI.completeMilestone(mA.id, { note: 'All docs verified.' });
    check(done.milestone.status === 'DONE' && !!done.milestone.completedAt, 'completion stores completed_at/by + note');
    check(done.activated.length === 1 && done.activated[0].id === mB.id, 'dependent milestone activates on completion');
    const aud1 = await aw.DataAPI.getCaseAudit(cs.id);
    check(aud1.some(a => a.action === 'MILESTONE_COMPLETED') && aud1.some(a => a.action === 'MILESTONE_ACTIVATED'), 'audit log records completion + activation');

    // completed milestones generate NO further reminders
    const M3 = await aw.DataAPI.getMilestones();
    const due1 = aw.SisOps.computeDueNotifications(P2.filter(p => p.id === cs.id), M3, ppl);
    check(!due1.some(n => n.m.id === mA.id), 'completed milestone leaves the reminder queue');

    // reschedule: reason mandatory + history
    let failedNoReason = false;
    try { await aw.DataAPI.rescheduleMilestone(mB.id, { newDate: dl }); } catch (e) { failedNoReason = true; }
    check(failedNoReason, 'reschedule without a reason is rejected');
    const newDl = new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10);
    await aw.DataAPI.rescheduleMilestone(mB.id, { newDate: newDl, reason: 'Client travelling' });
    const dc = await aw.DataAPI.getDeadlineChanges(mB.id);
    check(dc.length === 1 && dc[0].oldDeadline === dl && dc[0].newDeadline === newDl, 'deadline change log stores old → new + reason');

    // block → shows in report; unblock restores
    await aw.DataAPI.blockMilestone(mB.id, { reason: 'Waiting for client' });
    const rep3 = aw.SisOps.dailyReport(P2.filter(p => p.id === cs.id), await aw.DataAPI.getMilestones(), ppl);
    check(rep3.blocked.some(r => r.m.id === mB.id), 'blocked milestone appears in blocked queue');
    await aw.DataAPI.unblockMilestone(mB.id);

    // risk engine: overdue milestone → project not ON_TRACK, with recommendation
    await aw.DataAPI.updateMilestone(mB.id, { dueDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) });
    const rk = aw.SisOps.riskLevel(P2.find(p => p.id === cs.id), await aw.DataAPI.getMilestones());
    check(rk.level !== 'ON_TRACK' && !!rk.recommendation, 'risk engine flags overdue project with a recommendation');

    // hourly reminder idempotency via notification log
    const M4 = await aw.DataAPI.getMilestones();
    const due2 = aw.SisOps.computeDueNotifications(P2.filter(p => p.id === cs.id), M4, ppl);
    const hourly = due2.find(n => n.kind === 'HOURLY' && n.m.id === mB.id);
    check(!!hourly, 'hourly reminder computed for overdue milestone');
    const l1 = await aw.DataAPI.logNotification(hourly.key, { kind: 'HOURLY', milestoneId: mB.id, projectId: cs.id });
    const l2 = await aw.DataAPI.logNotification(hourly.key, { kind: 'HOURLY', milestoneId: mB.id, projectId: cs.id });
    check(l1.duplicate === false && l2.duplicate === true, 'duplicate hourly notification suppressed (idempotency key)');

    // calendar naming [SIS] CLIENT — MILESTONE
    const url2 = aw.SisOps.gcalUrl(P2.find(p => p.id === cs.id), M4.find(m => m.id === mA.id), []);
    check(decodeURIComponent(url2).includes('[SIS] Test Client — Step A'), 'calendar title uses [SIS] Client — Milestone standard');

    // UI: control center + hero + workspace (before closure, data present)
    aw.CASES_UI.mode = 'dashboard'; aw.gotoModule('cases');
    await new Promise(r => setTimeout(r, 250));
    const cv = aw.document.getElementById('cases-root').innerHTML;
    check(cv.includes('Immigration Operations Control Center') && cv.includes('sis-hero'), 'signature live-status hero renders');
    check(cv.includes('Immigration Projects') && cv.includes('Notification Center') && cv.includes('Daily Operations Report'), 'control center renders projects + notifications + report');
    check(cv.includes('New Immigration Project'), 'wizard entry point rendered');

    aw.cxOpenCase(cs.id);
    await new Promise(r => setTimeout(r, 250));
    const dv = aw.document.getElementById('cases-root').innerHTML;
    check(dv.includes('Milestone Timeline') && dv.includes('Test Client'), 'case workspace renders timeline + client header');
    check(dv.includes('>Task</button>') || dv.includes('Task</button>'), 'assign-task automation available on milestones');
    aw.cxBackToDash();
    await new Promise(r => setTimeout(r, 150));

    // close protection + closure
    let closeBlocked = false;
    try { await aw.DataAPI.closeCase(cs.id); } catch (e) { closeBlocked = true; }
    check(closeBlocked, 'project cannot close with open milestones');
    await aw.DataAPI.completeMilestone(mB.id, {});
    const closed = await aw.DataAPI.closeCase(cs.id);
    check(closed.status === 'COMPLETED' && !!closed.closedAt, 'project closes with closed_by/closed_at once all milestones done');
  } catch (e) { check(false, 'cases: ' + e.message); }

  /* ── DASHBOARD WITH REAL DATA ────────────────────────────────────────────
     REGRESSION: dashboard ke Milestone Tracker mein do function call hote the
     jo kahin define hi nahi the (getMilestoneProgress / isMilestoneComplete).
     Loop sirf tab chalta tha jab kisi case mein milestone ho — clean slate par
     bug chhupa rehta tha, aur pehla milestone banate hi boot fail ho jaata tha
     ("Couldn't load your workspace"). Ye suite dashboard ko BHARI HUI state
     par render karti hai, taaki wo baat dobara chup-chaap na nikal jaaye. */
  try {
    const dashCase = await aw.DataAPI.createCase({
      name: 'Dashboard Fixture — Study Permit', service: 'Study Permit',
      clientName: 'Dashboard Client', priority: 'HIGH',
      deadline: new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10),
      ownerRefs: [{ type: 'user', id: 11 }], notifyRefs: [{ type: 'user', id: 10 }]
    });
    const dOverdue = await aw.DataAPI.createMilestone({
      projectId: dashCase.id, title: 'Collect documents',
      dueDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
      ownerRefs: [{ type: 'user', id: 11 }], status: 'IN_PROGRESS', billable: true, sortOrder: 1
    });
    const dDone = await aw.DataAPI.createMilestone({
      projectId: dashCase.id, title: 'Biometrics booked',
      dueDate: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
      ownerRefs: [{ type: 'user', id: 11 }], billable: true, sortOrder: 2
    });
    await aw.DataAPI.createMilestone({
      projectId: dashCase.id, title: 'Submit application',
      dueDate: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
      ownerRefs: [{ type: 'user', id: 10 }], billable: false, sortOrder: 3
    });
    await aw.DataAPI.completeMilestone(dDone.id, { note: 'Slot confirmed.' });
    aw.syncState();

    check(aw.STATE.projects.some(p => (p.milestones || []).length >= 3),
      'fixture: a case with milestones exists in STATE');

    /* Ye do helpers hi missing the */
    check(typeof aw.getMilestoneProgress === 'function', 'getMilestoneProgress is defined');
    check(typeof aw.isMilestoneComplete === 'function', 'isMilestoneComplete is defined');

    const prog = aw.getMilestoneProgress(dashCase.id, dOverdue.id);
    check(prog && typeof prog.total === 'number' && typeof prog.done === 'number',
      'getMilestoneProgress always returns a {done,total,pct} shape');
    check(aw.getMilestoneProgress(999999, 999999).total === 0,
      'unknown milestone degrades to zero progress instead of throwing');

    /* Deliverable-less "DONE" milestone bhi complete ginna chahiye */
    check(aw.isMilestoneComplete(dashCase.id, dDone.id) === true,
      'milestone marked DONE counts as complete even with no deliverables');
    check(aw.isMilestoneComplete(dashCase.id, dOverdue.id) === false,
      'unfinished milestone is not reported complete');

    /* Asli regression: dashboard populated state par render hona chahiye */
    const errsBefore = A.errors.length;
    aw.gotoModule('dashboard');
    await new Promise(r => setTimeout(r, 250));
    check(A.errors.length === errsBefore,
      `dashboard renders with milestones present without console errors (${A.errors.length - errsBefore} new)`);

    const msBody = aw.document.getElementById('milestone-summary-body');
    check(msBody && msBody.innerHTML.length > 200,
      `milestone tracker rendered (${msBody ? msBody.innerHTML.length : 0} chars)`);
    check(msBody.innerHTML.includes('Collect documents') && msBody.innerHTML.includes('Biometrics booked'),
      'tracker lists the case milestones');
    check(!msBody.innerHTML.includes("couldn't load"), 'tracker did not fall back to its error state');

    const sub = aw.document.getElementById('ms-summary-sub');
    check(sub && /\d+ milestones/.test(sub.textContent), `tracker subtitle counts milestones ("${sub ? sub.textContent : ''}")`);

    /* Hero + alerts populated state par */
    const hero = aw.document.getElementById('dash-hero');
    check(hero && hero.innerHTML.includes('dash-hero'), 'dashboard hero renders');
    check(hero.innerHTML.includes('overdue') || hero.innerHTML.includes('past deadline'),
      'hero surfaces the overdue milestone');

    const alerts = aw.document.getElementById('critical-alerts');
    check(alerts && alerts.innerHTML.length > 100, 'needs-attention panel renders');

    check(aw.document.getElementById('team-load').innerHTML.includes('load-row'),
      'team load renders one row per person');

    /* Boot overlay bilkul nahi hona chahiye — yahi wo screen thi jo dikh rahi thi */
    check(!aw.document.getElementById('boot-overlay'),
      'no boot-error overlay left on screen');

    /* Ek widget jaan-boojh kar toda jaaye toh baaki dashboard zinda rahe */
    const realTeamLoad = aw.renderTeamLoad;
    aw.renderTeamLoad = function () { throw new Error('deliberate widget failure'); };
    aw.renderDashboard();
    await new Promise(r => setTimeout(r, 80));
    check(aw.document.getElementById('team-load').innerHTML.includes('widget-error'),
      'a broken widget shows its own error, not a blank page');
    check(aw.document.getElementById('milestone-summary-body').innerHTML.length > 200,
      'sibling widgets keep rendering when one fails');
    aw.renderTeamLoad = realTeamLoad;
    aw.renderDashboard();
  } catch (e) { check(false, 'dashboard with data: ' + e.message); }

  // SIS Operations engine (spec: overdue escalation, deadline risk, daily report)
  try {
    check(typeof aw.SisOps === 'object', 'SIS Ops engine loaded');
    // clean-slate: apna data banao
    const opsCase = await aw.DataAPI.createCase({
      name: 'Ops Test — Study Permit', service: 'Study Permit', clientName: 'Ops Client',
      priority: 'HIGH', deadline: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
      ownerRefs: [{ type: 'user', id: 11 }], notifyRefs: [{ type: 'user', id: 10 }]
    });
    const opsMs1 = await aw.DataAPI.createMilestone({ projectId: opsCase.id, title: 'Ops Step One', dueDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10), ownerRefs: [{ type: 'user', id: 11 }], status: 'IN_PROGRESS', billable: false, sortOrder: 1 });
    await aw.DataAPI.createMilestone({ projectId: opsCase.id, title: 'Ops Step Two', dueDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10), ownerRefs: [{ type: 'user', id: 10 }], billable: false, sortOrder: 2 });
    aw.gotoModule('sisops');
    await new Promise(r => setTimeout(r, 150));
    const ov = aw.document.getElementById('sisops-root').innerHTML;
    check(ov.includes('Milestone Control'), 'operations view renders milestone control');
    check(ov.includes('Daily Operations Report'), 'operations view renders daily report');
    check(ov.includes('Nabeel Ali') && ov.includes('Humera Khan'), 'per-owner queues render');
    const P = await aw.DataAPI.getProjects();
    const M = await aw.DataAPI.getMilestones();
    const E = await aw.DataAPI.getEmployees();
    const rep = aw.SisOps.dailyReport(P, M, E);
    check(rep.pending.length > 0, 'daily report finds pending milestones');
    const p5 = P.find(p => p.id === opsCase.id);
    const m5 = M.find(m => m.id === opsMs1.id);
    const url = aw.SisOps.gcalUrl(p5, m5, aw.SisOps.ownerOf(m5, p5, E));
    check(url.includes('%5BSIS%5D'), 'calendar events use the [SIS] naming standard');
    const ics = aw.SisOps.icsAll(P, M, E);
    check(ics.includes('BEGIN:VEVENT') && ics.includes('VALARM'), '.ics export carries events + reminders');
    // complete flow — status change + no further reminders for that milestone
    await aw.DataAPI.updateMilestone(opsMs1.id, { status: 'DONE', completedAt: new Date().toISOString() });
    const rep2 = aw.SisOps.dailyReport(await aw.DataAPI.getProjects(), await aw.DataAPI.getMilestones(), await aw.DataAPI.getEmployees());
    check(!rep2.pending.some(r => r.m.id === opsMs1.id), 'completed milestone leaves the pending queue');
    await aw.DataAPI.updateMilestone(opsMs1.id, { status: 'IN_PROGRESS', completedAt: null });
  } catch (e) { check(false, 'sisops: ' + e.message); }

  // accessibility layer
  try {
    // no popup tutorials
    check(!aw.document.getElementById('tour-overlay'), 'no tutorial popup on open');
    check(typeof aw.startTour === 'undefined', 'tour code removed entirely');

    // tutorials/page guides removed by design
    check(typeof aw.PageGuide === 'undefined', 'page guides removed entirely');

    check(typeof aw.hideGuide === 'undefined', 'page-guide code removed entirely');

    // accessibility basics
    check(!aw.document.querySelector('.skip-link'), 'skip link removed');
    aw.openModal('Test', '<input id="a11y-test">', '<button>OK</button>');
    const box = aw.document.querySelector('#modal-overlay .modal-box');
    check(aw.document.getElementById('modal-overlay').getAttribute('aria-modal') === 'true',
      'modal marked aria-modal');
    aw.closeModal();
    aw.announce('test message');
    await new Promise(r => setTimeout(r, 90));
    const live = aw.document.getElementById('sr-live');
    check(live && live.getAttribute('aria-live') === 'polite', 'screen-reader live region announces');
  } catch (e) { check(false, 'a11y: ' + e.message); }

  // settings actually works now
  try {
    aw.gotoModule('settings');
    aw.setSettingsTab('billing');
    const gstin = aw.document.getElementById('set-gstin');
    check(!!gstin, 'settings billing tab has GSTIN field');
    gstin.value = 'BADGSTIN';
    aw.saveSettings();
    check(aw.document.getElementById('set-gstin-err').classList.contains('show'), 'settings validates bad GSTIN');
    gstin.value = '27AABCO1234F1Z5';
    aw.document.getElementById('set-state').value = '27';
    aw.document.getElementById('set-gstrate').value = '18';
    aw.saveSettings();
    await new Promise(r => setTimeout(r, 60));
    check(aw.DataAPI.raw().settings.gstin === '27AABCO1234F1Z5', 'settings persists');
  } catch (e) { check(false, 'settings flow: ' + e.message); }

  // approve a deliverable end-to-end (clean slate: create → review → approve)
  try {
    const apCase = await aw.DataAPI.createCase({ name: 'Approve Test', service: 'Consultation', clientName: 'AT', priority: 'LOW', deadline: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), ownerRefs: [{ type: 'user', id: 10 }] });
    const inReview = await aw.DataAPI.createDeliverable({ projectId: apCase.id, title: 'Approve me', assigneeIds: [12], createdById: 100, origin: 'ADMIN', status: 'IN_REVIEW', priority: 'LOW', dueAt: new Date(Date.now() + 2 * 86400000).toISOString(), estimateSecs: 3600 });
    await aw.DataAPI.approveDeliverable(inReview.id);
    aw.syncState();
    const after = aw.DataAPI.raw().deliverables.find(d => d.id === inReview.id);
    check(after.status === 'DONE', 'approve deliverable persists');
  } catch (e) { check(false, 'approve flow: ' + e.message); }

  // XSS check
  try {
    await aw.DataAPI.createEmployee({ name: '<img src=x onerror=alert(1)>', email: 'xss@test.in', role: 'QA' });
    aw.syncState();
    aw.gotoModule('employees');
    const h = aw.document.getElementById('view-employees').innerHTML;
    check(!h.includes('<img src=x onerror'), 'XSS payload escaped in employees');
  } catch (e) { check(false, 'xss check: ' + e.message); }

  /* ══════════════════ EMPLOYEE ══════════════════ */
  console.log('\n═══ EMPLOYEE ═══');
  const E = await boot('employee', 'employee');
  E.errors.forEach(e => { console.log('  ! ' + e); fails++; });
  const ew = E.w;

  check(typeof ew.DataAPI === 'object', 'DataAPI loaded');
  check(Array.isArray(ew.USERS) && ew.USERS.length === 3, `login roster built (${ew.USERS && ew.USERS.length})`);
  // clean slate: Nabeel ke liye kaam banao (admin flow ka simulation)
  const empCase = await ew.DataAPI.createCase({ name: 'Emp Test — Work Permit', service: 'Work Permit', clientName: 'Emp Client', priority: 'HIGH', deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), ownerRefs: [{ type: 'user', id: 11 }] });
  await ew.DataAPI.createDeliverable({ projectId: empCase.id, title: 'Collect employer documents', assigneeIds: [11], createdById: 100, origin: 'ADMIN', status: 'TODO', priority: 'HIGH', dueAt: new Date(Date.now() + 2 * 86400000).toISOString(), estimateSecs: 4 * 3600 });
  await ew.DataAPI.createDeliverable({ projectId: empCase.id, title: 'Draft LMIA summary', assigneeIds: [11], createdById: 100, origin: 'ADMIN', status: 'IN_PROGRESS', priority: 'MEDIUM', dueAt: new Date(Date.now() + 3 * 86400000).toISOString(), estimateSecs: 3 * 3600 });
  ew.syncUserState && ew.syncUserState();
  check(ew.document.getElementById('elist').innerHTML.includes('Nabeel Ali'), 'login list rendered');

  // login as Nabeel (id 11)
  try {
    ew.doLogin(11);
    await new Promise(r => setTimeout(r, 200));
    check(ew.CU && ew.CU.id === 11, 'logged in as Nabeel');
    check(ew.document.getElementById('s-app').classList.contains('on'), 'app screen shown');
    check(ew.TASKS.length >= 2, `per-user tasks (${ew.TASKS.length})`);
    check(ew.document.getElementById('dash').innerHTML.length > 200, 'dashboard rendered');
  } catch (e) { check(false, 'login: ' + e.message); }

  // navigate views
  for (const v of ['projects','tracker','attendance','leave','performance','notifs','dashboard']) {
    try {
      ew.nav(v, ew.document.querySelector(`[data-v=${v}]`));
      const el = ew.document.getElementById('v-' + v);
      check(el && el.innerHTML.trim().length > 40, `view "${v}" renders`);
    } catch (e) { check(false, `view "${v}" threw: ${e.message}`); }
  }

  // notification click -> opens task (was broken: n.tid vs n.taskId)
  try {
    ew.nav('notifs', ew.document.querySelector('[data-v=notifs]'));
    const n = ew.NOTIFS.find(x => x.taskId);
    check(!!n, 'notification has taskId');
    check(!!n.iconBg && n.iconBg !== 'undefined', 'notification has iconBg');
    ew.nav('notifs', ew.document.querySelector('[data-v=notifs]'));
    await new Promise(r => setTimeout(r, 90));
    const nl = ew.document.getElementById('notif-list').innerHTML;
    check(!nl.includes('background:undefined'), 'notification icons actually render a colour');
    ew.hNotif(n.id);
    await new Promise(r => setTimeout(r, 80));
    check(ew.document.getElementById('v-detail').classList.contains('on'), 'notification opens task detail');
  } catch (e) { check(false, 'notif flow: ' + e.message); }

  // submit a task -> admin should see it
  try {
    const todo = ew.TASKS.find(t => t.status === 'todo');
    ew.openDetail(todo.id);
    const ta = ew.document.getElementById('sn-' + todo.id);
    ta.value = 'Smoke test submission notes';
    ew.doSubmit(todo.id);
    await new Promise(r => setTimeout(r, 150));
    const rec = ew.DataAPI.raw().deliverables.find(d => d.id === todo.id);
    check(rec.status === 'IN_REVIEW', 'submit persists to shared DB');
    check(rec.submissionNotes === 'Smoke test submission notes', 'submission notes saved');
    const notif = ew.DataAPI.raw().notifications.find(n => n.entityId === todo.id && n.kind === 'REVIEW');
    check(!!notif, 'admin notified of submission');
  } catch (e) { check(false, 'submit flow: ' + e.message); }

  // timer
  try {
    const t = ew.TASKS.find(x => x.status === 'todo' || x.status === 'inprogress');
    ew.activateTask(t.id, true);
    await new Promise(r => setTimeout(r, 60));
    const open = ew.DataAPI.raw().timeEntries.find(e2 => !e2.endedAt);
    check(!!open, 'timer creates open time entry');
    ew.stopT();
    await new Promise(r => setTimeout(r, 60));
    check(!ew.DataAPI.raw().timeEntries.some(e2 => !e2.endedAt), 'stopT closes time entry');
  } catch (e) { check(false, 'timer flow: ' + e.message); }

  // employee clarity layer
  try {
    check(typeof ew.Glossary === 'object', 'glossary available in employee app');
    check(!ew.document.querySelector('.skip-link'), 'employee skip link removed');
    ew.nav('performance', ew.document.querySelector('[data-v=performance]'));
    await new Promise(r => setTimeout(r, 100));
    const perf = ew.document.getElementById('perf-body').innerHTML;
    check(perf.includes('teen cheezon') || perf.includes('estimate'), 'performance score is explained, not just shown');
    check(typeof ew.empHideGuide === 'undefined', 'employee page guides removed entirely');
    ew.nav('leave', ew.document.querySelector('[data-v=leave]'));
    await new Promise(r => setTimeout(r, 150));
    check(ew.document.getElementById('leave-body').innerHTML.includes('help-dot'),
      'help dots present on employee leave screen');
  } catch (e) { check(false, 'employee clarity: ' + e.message); }

  // employee leave flow
  try {
    let d = null;
    for (let i = 7; i < 40 && !d; i++) {
      const c = ew.Utils.isoDate(ew.Utils.daysFromNow(i));
      if (!ew.HRM.isWeekOff(c) && !ew.HRM.holidayOn(c)) d = c;
    }
    const before = (await ew.HRM.getLeaveRequests({ employeeId: 11 })).length;
    await ew.HRM.applyLeave({ employeeId: 11, type: 'SL', fromDate: d, toDate: d, reason: 'Fever' });
    const after = await ew.HRM.getLeaveRequests({ employeeId: 11 });
    check(after.length === before + 1, 'employee applied leave');
    ew.nav('leave', ew.document.querySelector('[data-v=leave]'));
    await new Promise(r => setTimeout(r, 150));
    const body = ew.document.getElementById('leave-body').innerHTML;
    check(body.includes('Fever'), 'leave request shows in employee list');
    check(body.includes('Casual') || body.includes('Sick'), 'balances rendered');
    const reg = await ew.HRM.requestRegularisation({ employeeId: 11, date: ew.Utils.isoDate(ew.Utils.daysFromNow(-3)), inTime: '09:30', outTime: '18:30', reason: 'Client site' });
    check(reg.status === 'PENDING', 'regularisation raised');
  } catch (e) { check(false, 'employee leave flow: ' + e.message); }

  // XSS in task title
  try {
    const t = ew.TASKS[0];
    await ew.DataAPI.updateDeliverable(t.id, { title: '<script>alert(1)</script>evil' });
    ew.syncUserState();
    ew.rTracker();
    const h = ew.document.getElementById('tr-list').innerHTML;
    check(!h.includes('<script>alert(1)'), 'XSS payload escaped in tracker');
  } catch (e) { check(false, 'emp xss: ' + e.message); }

  console.log('\n' + (fails === 0 ? '\u2705 ALL CHECKS PASSED' : `\u274C ${fails} FAILURE(S)`));
  process.exit(fails ? 1 : 0);
})();