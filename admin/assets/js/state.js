/* ============================================================================
   ADMIN — STATE PROJECTION
   ----------------------------------------------------------------------------
   Pehle ye file 203 lines ka hardcoded dataset thi, jo employee app se
   bilkul disconnected thi.

   Ab ye ek PROJECTION hai. Asli data shared/data.js (DataAPI) mein hai —
   jo employee app bhi padhti hai. Ye file usko admin ke expected shapes mein
   translate karti hai, taaki purana render code (8000+ lines) bina badle
   chalta rahe.

   Koi bhi mutation ke baad syncState() call karo — STATE rebuild ho jaayegi.
   Naye code mein seedha DataAPI use karo, STATE ko mutate mat karo.
   ============================================================================ */

var STATE = {
  /* UI-only state — ye DataAPI mein nahi jaata */
  currentModule: 'dashboard',
  currentProject: null,
  currentConversation: null,
  currentEmployee: null,
  empStatusFilter: '',
  invoiceFilter: 'All',
  moduleHistory: [],
  noticeDetailOpen: false,
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  currentNotice: null,
  noticeFilter: 'All',
  settingsTab: 'company',
  phoneInput: '',
  eenChats: [],

  /* Projections — syncState() se bharte hain */
  company: {}, adminUser: {},
  employees: [], departments: [], projects: [], tasks: [],
  invoices: [], messages: [], notifications: [],
  activityFeed: [], calendarEvents: [], notices: [], callLogs: [],
  settings: {}
};

/* ── Display mappers: canonical -> admin ke purane strings ─────────────── */
var _ADMIN_TASK_STATUS = {
  TODO: 'Not Started', IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review', REJECTED: 'In Progress', DONE: 'Done'
};
var _ADMIN_MS_STATUS  = { UPCOMING: 'Upcoming', IN_PROGRESS: 'In Progress', DONE: 'Done' };
var _ADMIN_PRJ_STATUS = { PLANNING: 'Planning', ACTIVE: 'Active', ON_HOLD: 'On Hold', COMPLETED: 'Completed' };
var _ADMIN_PRIORITY   = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
var _ADMIN_ATTENDANCE = { PRESENT: 'Present', HALF_DAY: 'Half Day', ABSENT: 'Absent', ON_LEAVE: 'On Leave' };
var _ADMIN_INV_STATUS = { DRAFT: 'Draft', SENT: 'Sent', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid', OVERDUE: 'Overdue', CANCELLED: 'Cancelled' };
var _ADMIN_LEAD_STAGE = { NEW: 'New', CONTACTED: 'Contacted', PROPOSAL_SENT: 'Proposal Sent', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost' };

/* Reverse — jab UI purana string bhejta hai */
function _toCanonicalTaskStatus(s) {
  var map = { 'Not Started': 'TODO', 'In Progress': 'IN_PROGRESS', 'In Review': 'IN_REVIEW', 'Done': 'DONE', 'Rejected': 'REJECTED' };
  return map[s] || Schema.normStatus(s);
}
function _toCanonicalPriority(p) { return Schema.normPriority(p); }

/* ── Formatters ───────────────────────────────────────────────────────── */
function _fmtDay(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function _fmtTime(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function _relTime(iso) {
  if (!iso) return '';
  var diff = Date.now() - new Date(iso).getTime();
  var mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + ' min ago';
  var hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
  var days = Math.round(hrs / 24);
  if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
  return _fmtDay(iso);
}
function _durLabel(secs) {
  if (!secs) return '\u2014';
  var m = Math.floor(secs / 60), s = secs % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/* ── Main projection ──────────────────────────────────────────────────── */
function syncState() {
  var DB = DataAPI.raw();
  if (!DB) return;

  var today = Utils.isoDate(new Date());
  var attToday = {};
  DB.attendance.forEach(function (a) { if (a.date === today) attToday[a.employeeId] = a; });

  var deptById = {};
  DB.departments.forEach(function (d) { deptById[d.id] = d; });
  var empById = {};
  DB.employees.forEach(function (e) { empById[e.id] = e; });

  STATE.company   = DB.company;
  STATE.adminUser = DB.adminUser;
  STATE.settings  = DB.settings;

  /* ── employees ── */
  STATE.employees = DB.employees.map(function (e) {
    var att = attToday[e.id];
    var openTasks = DB.deliverables.filter(function (d) {
      return (d.assigneeIds || []).indexOf(e.id) >= 0 && d.status !== 'DONE';
    }).length;
    var scored = DataAPI.employeeScore(e.id);
    return {
      id: e.id, name: e.name, role: e.role,
      dept: deptById[e.deptId] ? deptById[e.deptId].name : 'Unassigned',
      deptId: e.deptId,
      email: e.email, phone: e.phone,
      status: _ADMIN_ATTENDANCE[att ? att.status : e.attendanceStatus] || 'Absent',
      score: scored.sample ? scored.score : (e.score || 0),
      scoreDetail: scored,
      tasks: openTasks,
      joined: _fmtDay(e.joinedAt),
      manager: empById[e.managerId] ? empById[e.managerId].name : '\u2014',
      managerId: e.managerId,
      avatar: e.avatarInitials, color: e.color || e.avatarBg,
      accessLevel: e.accessLevel
    };
  });

  /* ── departments ── */
  STATE.departments = DB.departments.map(function (d) {
    var members = DB.employees.filter(function (e) { return e.deptId === d.id; });
    var memberIds = members.map(function (e) { return e.id; });
    var activeTasks = DB.deliverables.filter(function (t) {
      return t.status !== 'DONE' && (t.assigneeIds || []).some(function (a) { return memberIds.indexOf(a) >= 0; });
    }).length;
    var scores = members.map(function (e) {
      var s = DataAPI.employeeScore(e.id);
      return s.sample ? s.score : (e.score || 0);
    });
    return {
      id: d.id, name: d.name,
      head: empById[d.headId] ? empById[d.headId].name : '\u2014',
      headId: d.headId,
      desc: d.description, color: d.color,
      activeTasks: activeTasks,
      memberCount: members.length,
      score: scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0
    };
  });

  /* ── projects (milestones nested — admin render code isi shape ki ummeed karta hai) ── */
  var prevExpanded = {};
  (STATE.projects || []).forEach(function (p) { prevExpanded[p.id] = p._expandedMs || []; });

  STATE.projects = DB.projects.map(function (p) {
    return {
      id: p.id, name: p.name, code: p.code,
      client: p.clientName, clientEmail: p.clientEmail, clientStateCode: p.clientStateCode,
      status: _ADMIN_PRJ_STATUS[p.status] || 'Planning',
      priority: _ADMIN_PRIORITY[p.priority] || 'Medium',
      progress: DataAPI.projectProgress(p.id),
      dept: deptById[p.deptId] ? deptById[p.deptId].name : '\u2014',
      deptId: p.deptId,
      startDate: _fmtDay(p.startDate), deadline: p.deadline,
      deadlineLabel: _fmtDay(p.deadline),
      budget: Utils.paiseToRupees(p.budgetPaise),
      spent: Utils.paiseToRupees(p.spentPaise),
      team: (p.memberIds || []).slice(), headId: p.headId,
      desc: p.description,
      milestones: DB.milestones
        .filter(function (m) { return m.projectId === p.id; })
        .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); })
        .map(function (m) {
          var prog = DataAPI.milestoneProgress(m.id);
          return {
            id: m.id, title: m.title,
            date: _fmtDay(m.dueDate), dueDate: m.dueDate,
            desc: m.description,
            status: _ADMIN_MS_STATUS[m.status] || 'Upcoming',
            billable: m.billable,
            progress: prog
          };
        }),
      _expandedMs: prevExpanded[p.id] || []
    };
  });

  /* ── tasks (= deliverables, subtasks nested) ── */
  STATE.tasks = DB.deliverables.map(function (d) {
    var isRejected = d.status === 'REJECTED';
    return {
      id: d.id, projectId: d.projectId, milestoneId: d.milestoneId,
      title: d.title, desc: d.description,
      status: _ADMIN_TASK_STATUS[d.status] || 'In Progress',
      canonicalStatus: d.status,
      priority: _ADMIN_PRIORITY[d.priority] || 'Medium',
      assignee: (d.assigneeIds || [])[0] || null,
      assignees: (d.assigneeIds || []).slice(),
      origin: d.origin,
      deadline: d.dueAt ? Utils.isoDate(d.dueAt) : null,
      hours: Math.round(Schema.TIME.secsToHours(d.estimateSecs) * 10) / 10,
      loggedHours: Math.round(Schema.TIME.secsToHours(d.loggedSecs) * 10) / 10,
      progress: d.progressPct,
      files: (d.briefFiles || []).slice(),
      submissionFiles: (d.submissionFiles || []).slice(),
      submissionNotes: d.submissionNotes,
      rejectionReason: isRejected ? d.rejectionReason : null,
      approvalState: d.approvalState,
      messages: (d.comments || []).map(function (c) {
        return {
          from: c.fromId,
          fromName: empById[c.fromId] ? empById[c.fromId].name : (c.fromId === DB.adminUser.id ? DB.adminUser.name : 'Unknown'),
          text: c.text,
          time: _fmtTime(c.time) || c.time
        };
      }),
      timeline: (d.timeline || []).map(function (t) {
        return { type: t.type, text: t.text, time: /^\d{4}-/.test(String(t.time)) ? _fmtDay(t.time) : t.time };
      }),
      subtasks: DB.subtasks.filter(function (s) { return s.deliverableId === d.id; }).map(function (s) {
        return {
          id: s.id, title: s.title, desc: s.description,
          createdBy: s.createdById,
          createdByName: empById[s.createdById] ? empById[s.createdById].name : 'Admin',
          assignee: s.assigneeId, assignees: [s.assigneeId],
          status: _ADMIN_TASK_STATUS[s.status] || 'In Progress',
          canonicalStatus: s.status,
          priority: _ADMIN_PRIORITY[s.priority] || 'Medium',
          timeSpent: Math.round(Schema.TIME.secsToHours(s.loggedSecs) * 10) / 10,
          estimatedTime: Math.round(Schema.TIME.secsToHours(s.estimateSecs) * 10) / 10,
          createdAt: s.createdAt ? Utils.isoDate(s.createdAt) : null,
          completedAt: s.completedAt ? Utils.isoDate(s.completedAt) : null,
          rejectionReason: s.status === 'REJECTED' ? s.rejectionReason : null,
          approvalState: s.approvalState,
          timeline: (s.timeline || []).map(function (t) {
            return { type: t.type, text: t.text, time: /^\d{4}-/.test(String(t.time)) ? _fmtDay(t.time) : t.time };
          })
        };
      })
    };
  });

  /* ── invoices ── */
  var projById = {};
  DB.projects.forEach(function (p) { projById[p.id] = p; });
  STATE.invoices = DB.invoices.map(function (i) {
    var overdue = i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' &&
                  i.dueDate && i.dueDate < today;
    return {
      id: i.id, num: i.number,
      projectId: i.projectId, milestoneId: i.milestoneId,
      project: projById[i.projectId] ? projById[i.projectId].name : '\u2014',
      client: i.clientName, clientEmail: i.clientEmail, clientGstin: i.clientGstin,
      placeOfSupply: i.placeOfSupply,
      amount: Utils.paiseToRupees(i.totalPaise),
      subtotal: Utils.paiseToRupees(i.subtotalPaise),
      cgst: Utils.paiseToRupees(i.cgstPaise),
      sgst: Utils.paiseToRupees(i.sgstPaise),
      igst: Utils.paiseToRupees(i.igstPaise),
      paidAmount: Utils.paiseToRupees(i.paidPaise),
      balance: Utils.paiseToRupees(i.totalPaise - i.paidPaise),
      lines: (i.lines || []).slice(),
      date: _fmtDay(i.issueDate), issueDate: i.issueDate,
      due: _fmtDay(i.dueDate), dueDate: i.dueDate,
      status: overdue ? 'Overdue' : (_ADMIN_INV_STATUS[i.status] || 'Draft'),
      canonicalStatus: i.status,
      notes: i.notes
    };
  });

  /* ── messages ── */
  STATE.messages = DB.conversations.map(function (c) {
    var withEmp = empById[c.withId] || { name: 'Unknown', avatarInitials: '??', color: '#9B9899' };
    var last = c.msgs[c.msgs.length - 1];
    return {
      id: c.id, withId: c.withId,
      name: withEmp.name, avatar: withEmp.avatarInitials, color: withEmp.color || withEmp.avatarBg,
      isOnline: withEmp.attendanceStatus === 'PRESENT',
      unread: c.unread || 0,
      preview: last ? last.text : '',
      time: last ? _fmtTime(last.at) : '',
      msgs: c.msgs.map(function (m) {
        return { text: m.text, sent: m.fromId === DB.adminUser.id, time: _fmtTime(m.at) };
      })
    };
  });

  /* ── notifications (admin ke) ── */
  STATE.notifications = DB.notifications
    .filter(function (n) { return n.recipientId === DB.adminUser.id; })
    .map(function (n) {
      return { id: n.id, text: n.title, sub: n.body, read: n.read, kind: n.kind,
               entityType: n.entityType, entityId: n.entityId, time: _relTime(n.createdAt) };
    });

  /* ── activity ── */
  STATE.activityFeed = DB.activity.map(function (a) {
    return { icon: a.icon, color: a.color, text: a.text, time: _relTime(a.at) };
  });

  /* ── calendar ── */
  STATE.calendarEvents = DB.calendarEvents.slice();

  /* ── notices (readBy names — admin UI naam dikhata hai) ── */
  STATE.notices = DB.notices.map(function (n) {
    return {
      id: n.id, title: n.title, content: n.content,
      date: _fmtDay(n.date), rawDate: n.date,
      recipients: n.recipients, priority: n.priority, status: n.status,
      readBy: (n.readBy || []).map(function (id) { return empById[id] ? empById[id].name : 'Unknown'; }),
      notReadBy: (n.notReadBy || []).map(function (id) { return empById[id] ? empById[id].name : 'Unknown'; }),
      readByIds: (n.readBy || []).slice(), notReadByIds: (n.notReadBy || []).slice(),
      attachments: (n.attachments || []).slice()
    };
  });
  if (STATE.currentNotice == null && STATE.notices.length) STATE.currentNotice = STATE.notices[0].id;

  /* ── call logs ── */
  STATE.callLogs = DB.callLogs.map(function (c) {
    return {
      id: c.id, name: c.name, number: c.number,
      duration: _durLabel(c.durationSecs),
      type: c.type, date: _fmtDay(c.at) + ', ' + _fmtTime(c.at),
      status: c.status
    };
  });
}

/* Convenience — mutation ke baad ek hi call */
function refresh(renderFn) {
  syncState();
  if (typeof renderFn === 'function') renderFn();
}
