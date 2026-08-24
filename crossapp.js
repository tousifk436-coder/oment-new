/* Cross-app round-trip: admin aur employee ek hi localStorage share karte hain.
   Ye wo test hai jo pehle possible hi nahi tha — dono apps ka data model
   alag tha (id 1 = Priya vs id 1 = Alex, "Swiggy Clone" vs "Swiggy App
   Redesign", 'Done' vs 'approved'). */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const ROOT = __dirname;

/* EK shared store — dono apps isi ko use karenge, jaise same browser mein */
const shared = new Map();
const storage = {
  getItem: k => (shared.has(k) ? shared.get(k) : null),
  setItem: (k, v) => shared.set(k, String(v)),
  removeItem: k => shared.delete(k),
  clear: () => shared.clear(),
  key: i => Array.from(shared.keys())[i] ?? null,
  get length() { return shared.size; }
};

async function boot(appDir) {
  const html = fs.readFileSync(path.join(ROOT, appDir, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' + appDir + '/', pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w, 'localStorage', { value: storage, configurable: true });
  w.requestAnimationFrame = cb => setTimeout(cb, 0);
  // jsdom mein fetch nahi hota — Een ke network paths test karne ke liye chahiye
  w.fetch = (...a) => globalThis.fetch(...a);
  w.AbortController = globalThis.AbortController;
  w.scrollTo = () => {};
  w.URL.createObjectURL = () => 'blob:m'; w.URL.revokeObjectURL = () => {};
  w.console.error = () => {}; w.console.warn = () => {};
  for (const s of Array.from(w.document.querySelectorAll('script[src]'))) {
    const f = path.resolve(path.join(ROOT, appDir), s.getAttribute('src'));
    if (fs.existsSync(f)) { try { w.eval(fs.readFileSync(f, 'utf8')); } catch (e) { console.log('  ! ' + s.getAttribute('src') + ': ' + e.message); } }
  }
  const ev = new w.Event('DOMContentLoaded');
  w.document.dispatchEvent(ev); w.dispatchEvent(ev);
  await new Promise(r => setTimeout(r, 250));
  return w;
}

(async () => {
  let fails = 0;
  const ck = (c, m) => { console.log((c ? '  \u2713 ' : '  \u2717 ') + m); if (!c) fails++; };

  console.log('\n═══ CROSS-APP ROUND TRIP ═══\n');

  /* ── 1. Admin assigns work to Nabeel (id 11) ── */
  const A = await boot('admin');
  ck(!!A.STATE, 'admin booted');

  /* clean slate — pehle ek immigration case banao (asli admin flow) */
  const proj = await A.DataAPI.createCase({
    name: 'Crossapp — Visitor Visa', service: 'Visitor Visa / TRV', clientName: 'Crossapp Client',
    priority: 'HIGH', deadline: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    ownerRefs: [{ type: 'user', id: 11 }]
  });
  const ms = await A.DataAPI.createMilestone({
    projectId: proj.id, title: 'Crossapp milestone', dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    ownerRefs: [{ type: 'user', id: 11 }], status: 'IN_PROGRESS', billable: true, sortOrder: 1
  });
  A.syncState();
  const created = await A.DataAPI.createDeliverable({
    projectId: proj.id, milestoneId: ms.id,
    title: 'Cross-app test: build the checkout screen',
    description: 'Round-trip verification task',
    priority: 'HIGH', status: 'TODO',
    assigneeIds: [11], createdById: A.STATE.adminUser.id, origin: 'ADMIN',
    dueAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    estimateSecs: 4 * 3600
  });
  A.syncState();
  ck(!!created.id, `admin created deliverable #${created.id}`);
  ck(A.STATE.tasks.some(t => t.id === created.id), 'appears in admin projection');
  A.DataAPI.flush();
  ck(shared.has("oment_crm_db_v1"), "persisted to shared storage");

  /* ── 2. Employee app boots fresh from the SAME storage ── */
  const E = await boot('employee');
  ck(!!E.USERS && E.USERS.length === 3, 'employee booted from shared store');

  E.doLogin(11);
  await new Promise(r => setTimeout(r, 200));
  ck(E.CU.name === 'Nabeel Ali', 'logged in as Nabeel Ali');

  const seen = E.TASKS.find(t => t.id === created.id);
  ck(!!seen, '\u2b50 ADMIN\u2192EMPLOYEE: assigned task visible to Nabeel');
  ck(seen && seen.status === 'todo', `  status translated to "${seen && seen.status}"`);
  ck(seen && seen.priority === 'high', `  priority translated to "${seen && seen.priority}"`);
  ck(seen && /Visitor Visa/.test(seen.proj || ''), `  project name matches ("${seen && seen.proj}")`);
  ck(seen && seen.exp === 4 * 3600, '  estimate in seconds for employee app');

  const notif = E.NOTIFS.find(n => n.taskId === created.id);
  ck(!!notif, '  employee got an ASSIGNED notification');

  /* another employee should NOT see it */
  E.CU = E.USERS.find(u => u.id === 12);
  E.syncUserState();
  ck(!E.TASKS.some(t => t.id === created.id), '\u2b50 ISOLATION: Arjun cannot see Alex\'s task');
  E.CU = E.USERS.find(u => u.id === 11);
  E.syncUserState();
  E.DataAPI.flush();

  /* ── 3. Employee works on it and submits ── */
  E.activateTask(created.id, true);
  await new Promise(r => setTimeout(r, 120));
  ck(E.DataAPI.raw().deliverables.find(d => d.id === created.id).status === 'IN_PROGRESS',
     'starting the timer moves it to IN_PROGRESS');

  E.stopT();
  await new Promise(r => setTimeout(r, 80));

  await E.DataAPI.addDeliverableFiles(created.id,
    [{ name: 'checkout-v1.zip', sizeLabel: '2.1 MB', kind: 'zip' }], 'submission');
  await E.DataAPI.submitDeliverable(created.id, { notes: 'Checkout screen done, tested on mobile.' });
  E.syncUserState();
  E.DataAPI.flush();

  const afterSubmit = E.TASKS.find(t => t.id === created.id);
  ck(afterSubmit.status === 'submitted', 'employee submitted (shows as "submitted")');

  /* ── 4. Admin reloads and sees the submission ── */
  const A2 = await boot('admin');
  A2.syncState();
  const adminSees = A2.STATE.tasks.find(t => t.id === created.id);
  ck(!!adminSees, '\u2b50 EMPLOYEE\u2192ADMIN: submission visible after admin reload');
  ck(adminSees.status === 'In Review', `  status translated to "${adminSees.status}"`);
  ck(adminSees.submissionNotes.includes('Checkout screen done'), '  submission notes carried across');
  ck(adminSees.submissionFiles.length === 1, '  submitted file carried across');

  const adminNotif = A2.STATE.notifications.find(n => n.entityId === created.id);
  ck(!!adminNotif, '  admin got a REVIEW notification');

  /* ── 5. Admin rejects with a reason ── */
  try { await A2.DataAPI.rejectDeliverable(created.id, ''); ck(false, 'empty reason should be rejected'); }
  catch (e) { ck(e.code === 'VALIDATION', 'rejection reason is mandatory'); }

  await A2.DataAPI.rejectDeliverable(created.id, 'Mobile breakpoint 360px pe toota hua hai. Fix karke resubmit karo.');
  A2.syncState();
  A2.DataAPI.flush();

  /* ── 6. Employee sees the rejection with the reason ── */
  const E2 = await boot('employee');
  E2.doLogin(11);
  await new Promise(r => setTimeout(r, 200));
  const rejected = E2.TASKS.find(t => t.id === created.id);
  ck(rejected.status === 'rejected', '\u2b50 ADMIN\u2192EMPLOYEE: rejection visible');
  ck(rejected.rejReason.includes('360px'), '  rejection reason carried across');
  ck(E2.NOTIFS.some(n => n.taskId === created.id && n.type === 'rejected'), '  employee notified of rejection');
  ck(E2.TASKS[0].status === 'rejected', '  rejected tasks sorted to the top of the list');

  /* ── 7. Resubmit → approve → milestone/progress rolls up ── */
  await E2.DataAPI.updateDeliverable(created.id, { status: 'IN_PROGRESS', rejectionReason: null, approvalState: null });
  await E2.DataAPI.submitDeliverable(created.id, { notes: 'Breakpoint fixed.' });
  E2.DataAPI.flush();

  const A3 = await boot('admin');
  const beforePct = A3.DataAPI.projectProgress(proj.id);
  await A3.DataAPI.approveDeliverable(created.id);
  A3.syncState();
  A3.DataAPI.flush();
  const approved = A3.STATE.tasks.find(t => t.id === created.id);
  ck(approved.status === 'Done', 'admin approved');
  ck(A3.DataAPI.projectProgress(proj.id) >= beforePct, 'project progress recalculated from real data');

  const E3 = await boot('employee');
  E3.doLogin(11);
  await new Promise(r => setTimeout(r, 200));
  ck(E3.TASKS.find(t => t.id === created.id).status === 'approved', '\u2b50 employee sees it as approved');
  const score = E3.DataAPI.employeeScore(11);
  ck(score.sample > 0 && score.score >= 0 && score.score <= 100, `employee score computed (${score.score}, n=${score.sample})`);

  /* ── 8. Invoice numbering never repeats ── */
  const nums = [];
  for (let i = 0; i < 3; i++) {
    const inv = await A3.DataAPI.createInvoice({
      clientName: 'Test Co', placeOfSupply: '29', projectId: proj.id,
      lines: [{ description: 'Work', qty: 1, ratePaise: 100000 }]
    });
    nums.push(inv.number);
  }
  const draft = A3.DataAPI.raw().invoices.find(i => i.number === nums[1]);
  await A3.DataAPI.deleteInvoice(draft.id);
  const next = await A3.DataAPI.createInvoice({
    clientName: 'Test Co', placeOfSupply: '29', projectId: proj.id,
    lines: [{ description: 'Work', qty: 1, ratePaise: 100000 }]
  });
  ck(!nums.includes(next.number), `invoice number not reused after delete (${nums.join(', ')} \u2192 ${next.number})`);

  /* ── 9. HRM round trip: employee applies, admin approves ── */
  console.log('\n── HRM ──');
  const E4 = await boot('employee');
  E4.doLogin(11);
  await new Promise(r => setTimeout(r, 200));

  let wd = null;
  for (let i = 7; i < 40 && !wd; i++) {
    const c = E4.Utils.isoDate(E4.Utils.daysFromNow(i));
    if (!E4.HRM.isWeekOff(c) && !E4.HRM.holidayOn(c)) wd = c;
  }
  const leave = await E4.HRM.applyLeave({
    employeeId: 11, type: 'CL', fromDate: wd, toDate: wd, reason: 'Cousin\'s wedding'
  });
  E4.DataAPI.flush();
  ck(leave.status === 'PENDING', '\u2b50 employee applied for leave');

  const A4 = await boot('admin');
  const pend = (await A4.HRM.getLeaveRequests({ status: 'PENDING' })).find(r => r.id === leave.id);
  ck(!!pend, '\u2b50 EMPLOYEE\u2192ADMIN: leave request visible to admin');
  const adminLvNotif = A4.DataAPI.raw().notifications.find(n => n.entityId === leave.id);
  ck(!!adminLvNotif, '  approver notified');

  try { await A4.HRM.rejectLeave(leave.id, ''); ck(false, 'empty reason should fail'); }
  catch (e) { ck(e.code === 'VALIDATION', '  rejection reason mandatory'); }

  const balBefore = (await A4.HRM.getBalances(11)).find(b => b.type === 'CL');
  await A4.HRM.approveLeave(leave.id);
  const balAfter = (await A4.HRM.getBalances(11)).find(b => b.type === 'CL');
  ck(balAfter.used === balBefore.used + leave.days, '  balance deducted on approval');
  ck(balAfter.pending === balBefore.pending - leave.days, '  pending released');

  const attRow = A4.DataAPI.raw().attendance.find(a => a.leaveRequestId === leave.id);
  ck(!!attRow && attRow.status === 'ON_LEAVE', '  attendance register marked ON_LEAVE');

  const board = await A4.HRM.getTodayBoard();
  ck(board.rows.length === A4.DataAPI.raw().employees.length, '  today board covers whole team');
  const reg = await A4.HRM.getRegister();
  ck(reg.rows.length > 0 && reg.days.length >= 28, `  register built (${reg.rows.length} people x ${reg.days.length} days)`);
  const util = await A4.HRM.getUtilisation();
  ck(util.rows.length === A4.DataAPI.raw().employees.length, '  utilisation report built for the whole team');
  A4.DataAPI.flush();

  const E5 = await boot('employee');
  E5.doLogin(11);
  await new Promise(r => setTimeout(r, 200));
  const mine = (await E5.HRM.getLeaveRequests({ employeeId: 11 })).find(r => r.id === leave.id);
  ck(mine.status === 'APPROVED', '\u2b50 ADMIN\u2192EMPLOYEE: approval visible to employee');
  ck(E5.DataAPI.raw().notifications.some(n => n.recipientId === 11 && n.entityId === leave.id && n.kind === 'APPROVED'),
     '  employee notified of approval');


  console.log('\n' + (fails === 0 ? '\u2705 CROSS-APP INTEGRATION PASSED' : `\u274C ${fails} FAILURE(S)`));
  process.exit(fails ? 1 : 0);
})();
