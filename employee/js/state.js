/* ============================================================================
   EMPLOYEE — STATE PROJECTION (per-user)
   ----------------------------------------------------------------------------
   Pehle problem: TASKS ek global array tha jo har user ko same 8 tasks dikhata
   tha. CU.id poore codebase mein sirf 2 jagah use hua tha. Priya login kare ya
   Alex — dono ko ek hi list dikhti thi.

   Ab: login ke baad syncUserState() chalta hai, jo SIRF us employee ka kaam
   project karta hai. Data shared/data.js se aata hai — wahi jo admin app
   padhti hai. Admin task assign kare -> yahan dikhega. Yahan submit karo ->
   admin ke review queue mein aayega.
   ============================================================================ */

/* ── Runtime / UI state ───────────────────────────────────────────────── */
var CU = null;                        // current user
var ws = false, wsAt = null;          // work session
var tsecs = 0, trun = false, tiv = null, wiv = null;
var onBrk = false, brkAt = null, brkType = null, lastAct = Date.now();
var pv = 'dashboard', cv = 'dashboard', trF = 'all', trQ = '';
var projTab = 'overview', dlgCb = null, _bType = 'Lunch';
var _saPri = 'medium';

/* Timestamp-based stopwatch — setInterval counter nahi.
   Background tab mein browser interval throttle karta hai, jisse logged time
   kam count hota tha. Ab elapsed timestamps se derive hota hai. */
var SW = new Utils.Stopwatch();

/* ── Projections ──────────────────────────────────────────────────────── */
var USERS = [];        // login picker
var TASKS = [];        // is user ke deliverables
var PROJECTS = [];     // is user ke projects (milestone > deliverable nested)
var ATT_LOG = [];      // is user ki attendance
var NOTIFS = [];       // is user ki notifications
var COMPANY = {};

/* ── Display mappers ──────────────────────────────────────────────────── */
var _EMP_STATUS = {
  TODO: 'todo', IN_PROGRESS: 'inprogress', IN_REVIEW: 'submitted',
  REJECTED: 'rejected', DONE: 'approved'
};
var _EMP_PRIORITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };
var _EMP_ATT = { PRESENT: 'Present', HALF_DAY: 'Half Day', ABSENT: 'Absent', ON_LEAVE: 'On Leave' };
var _EMP_MS_STATUS = { UPCOMING: 'Upcoming', IN_PROGRESS: 'In Progress', DONE: 'Done' };
var _EMP_DEL_STATUS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', REJECTED: 'Rejected', DONE: 'Done' };

function _toCanonical(s) {
  var map = { todo: 'TODO', inprogress: 'IN_PROGRESS', submitted: 'IN_REVIEW', rejected: 'REJECTED', approved: 'DONE' };
  return map[s] || Schema.normStatus(s);
}

function _timeLabel(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d)) return String(iso);
  var today = Utils.isoDate(new Date());
  if (Utils.isoDate(d) === today) return 'Today, ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' +
         d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}
function _relLabel(iso) {
  if (!iso) return '';
  var mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + ' min ago';
  var h = Math.round(mins / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  var d = Math.round(h / 24);
  return d + (d === 1 ? ' day ago' : ' days ago');
}

/* ── Login roster ─────────────────────────────────────────────────────── */
function syncUsers() {
  var DB = DataAPI.raw();
  COMPANY = DB.company;
  USERS = DB.employees.filter(function (e) { return e.canLogin !== false && e.active !== false; })
    .map(function (e) {
      var dept = DB.departments.find(function (d) { return d.id === e.deptId; });
      return {
        id: e.id, name: e.name, role: e.role,
        dept: dept ? dept.name : 'Unassigned',
        email: e.email,
        ini: e.avatarInitials, initials: e.avatarInitials,
        avBg: e.avatarBg, avFg: e.avatarFg
      };
    });
}

/* ── Per-user projection ──────────────────────────────────────────────── */
function syncUserState() {
  if (!CU) return;
  var DB = DataAPI.raw();
  var uid = CU.id;

  var empById = {};
  DB.employees.forEach(function (e) { empById[e.id] = e; });
  var projById = {};
  DB.projects.forEach(function (p) { projById[p.id] = p; });
  var msById = {};
  DB.milestones.forEach(function (m) { msById[m.id] = m; });

  /* ── TASKS — sirf is user ke ─────────────────────────────────────────── */
  var mine = DB.deliverables.filter(function (d) {
    return (d.assigneeIds || []).indexOf(uid) >= 0;
  });

  TASKS = mine.map(function (d) {
    var creator = empById[d.createdById] ||
      (d.createdById === DB.adminUser.id ? DB.adminUser : null) ||
      { name: 'Admin', avatarInitials: 'AD', avatarBg: '#18171A', avatarFg: '#fff' };
    var proj = projById[d.projectId];
    var ms = d.milestoneId ? msById[d.milestoneId] : null;

    return {
      id: d.id,
      title: d.title,
      desc: d.description,
      priority: _EMP_PRIORITY[d.priority] || 'medium',
      status: _EMP_STATUS[d.status] || 'todo',
      canonicalStatus: d.status,
      dms: d.dueAt ? new Date(d.dueAt).getTime() : null,
      dlabel: d.dueAt ? _timeLabel(d.dueAt) : 'No deadline',
      deadlineLabel: d.dueAt ? _timeLabel(d.dueAt) : 'No deadline',
      by: creator.name,
      byIni: creator.avatarInitials || Schema.initialsOf(creator.name),
      byBg: creator.avatarBg || '#18171A',
      byFg: creator.avatarFg || '#ffffff',
      assignedDate: d.createdAt ? Utils.isoDate(d.createdAt) : '',
      exp: d.estimateSecs || 0,
      logged: d.loggedSecs || 0,
      active: false,
      timerId: null,
      timerStatus: 'STOPPED',
      timerStartedAt: null,
      self: d.origin === 'SELF',
      saStatus: d.approvalState ? d.approvalState.toLowerCase() : null,
      saRejReason: d.status === 'REJECTED' ? d.rejectionReason : null,
      proj: proj ? proj.name : null,
      projId: d.projectId,
      ms: ms ? ms.title : null,
      msId: d.milestoneId,
      deliverableId: d.id,
      files: (d.briefFiles || []).slice(),
      subFiles: (d.submissionFiles || []).slice(),
      subNotes: d.submissionNotes || '',
      msgs: (d.comments || []).map(function (c) {
        var f = empById[c.fromId] || (c.fromId === DB.adminUser.id ? DB.adminUser : null) ||
                { name: 'Unknown', avatarInitials: '??', avatarBg: '#E8E5DF', avatarFg: '#333' };
        return {
          from: f.name,
          ini: f.avatarInitials, initials: f.avatarInitials,
          bg: f.avatarBg, fg: f.avatarFg, fc: f.avatarFg,
          time: _timeLabel(c.time) || c.time,
          text: c.text
        };
      }),
      tl: (d.timeline || []).map(function (t) {
        return { type: t.type, text: t.text, time: /^\d{4}-/.test(String(t.time)) ? _timeLabel(t.time) : t.time };
      }),
      rejReason: d.status === 'REJECTED' ? d.rejectionReason : null,
      subtasks: DB.subtasks.filter(function (s) { return s.deliverableId === d.id; }).map(function (s) {
        return {
          id: s.id, title: s.title, desc: s.description,
          done: s.status === 'DONE',
          status: _EMP_STATUS[s.status] || 'todo',
          canonicalStatus: s.status,
          priority: _EMP_PRIORITY[s.priority] || 'medium',
          estimateSecs: s.estimateSecs, loggedSecs: s.loggedSecs,
          adminStatus: s.approvalState ? s.approvalState.toLowerCase() : null,
          adminNote: s.rejectionReason || null
        };
      }),
      createdAt: d.createdAt
    };
  });

  var openEntries=(DB.timeEntries||[]).filter(function(t){return String(t.employeeId)===String(uid)&&(t.status==='RUNNING'||t.status==='PAUSED');});
  openEntries.forEach(function(entry){
    var current=TASKS.find(function(task){return String(task.id)===String(entry.deliverableId);});
    if(!current)return;
    current.timerId=entry.id;
    current.timerStatus=entry.status;
    current.timerStartedAt=entry.activeStartedAt||null;
    current.active=entry.status==='RUNNING';
  });

  /* Sort: rejected pehle, phir active, phir deadline ke hisaab se */
  TASKS.sort(function (a, b) {
    var rank = { rejected: 0, inprogress: 1, todo: 2, submitted: 3, approved: 4 };
    var ra = rank[a.status], rb = rank[b.status];
    if (ra !== rb) return ra - rb;
    return (a.dms || Infinity) - (b.dms || Infinity);
  });

  /* ── PROJECTS — sirf jinme user member hai ──────────────────────────── */
  PROJECTS = DB.projects
    .filter(function (p) { return (p.memberIds || []).indexOf(uid) >= 0; })
    .map(function (p) {
      var head = empById[p.headId];
      return {
        id: p.id, name: p.name, client: p.clientName,
        status: { PLANNING: 'Planning', ACTIVE: 'Active', ON_HOLD: 'On Hold', COMPLETED: 'Completed' }[p.status] || 'Planning',
        priority: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }[p.priority] || 'Medium',
        head: p.headId, headName: head ? head.name : 'Unknown',
        team: (p.memberIds || []).slice(),
        progress: DataAPI.projectProgress(p.id),
        deadline: p.deadline,
        dept: p.deptId,
        desc: p.description,
        milestones: DB.milestones
          .filter(function (m) { return m.projectId === p.id; })
          .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); })
          .map(function (m) {
            var prog = DataAPI.milestoneProgress(m.id);
            return {
              id: m.id, title: m.title,
              status: _EMP_MS_STATUS[m.status] || 'Upcoming',
              date: m.dueDate, desc: m.description,
              progress: prog,
              deliverables: DB.deliverables
                .filter(function (d) { return d.milestoneId === m.id; })
                .map(function (d) {
                  return {
                    id: d.id, title: d.title, desc: d.description,
                    priority: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }[d.priority] || 'Medium',
                    status: _EMP_DEL_STATUS[d.status] || 'To Do',
                    canonicalStatus: d.status,
                    deadline: d.dueAt ? Utils.isoDate(d.dueAt) : null,
                    hours: Math.round(Schema.TIME.secsToHours(d.estimateSecs) * 10) / 10,
                    loggedHours: Math.round(Schema.TIME.secsToHours(d.loggedSecs) * 10) / 10,
                    progress: d.progressPct,
                    assignees: (d.assigneeIds || []).slice(),
                    isMine: (d.assigneeIds || []).indexOf(uid) >= 0,
                    origin: d.origin,
                    approvalState: d.approvalState,
                    rejectionReason: d.status === 'REJECTED' ? d.rejectionReason : null,
                    /* Employee app "selfTasks" ko alag dikhata tha — ab wo
                       subtasks hain, ek hi jagah se aate hain */
                    selfTasks: DB.subtasks
                      .filter(function (s) { return s.deliverableId === d.id && s.createdById === s.assigneeId; })
                      .map(function (s) { return _mapSub(s, empById); }),
                    tasks: DB.subtasks
                      .filter(function (s) { return s.deliverableId === d.id && s.createdById !== s.assigneeId; })
                      .map(function (s) { return _mapSub(s, empById); })
                  };
                })
            };
          })
      };
    });

  /* ── ATTENDANCE ──────────────────────────────────────────────────────── */
  ATT_LOG = DB.attendance
    .filter(function (a) { return a.employeeId === uid; })
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; })
    .map(function (a) {
      return {
        id: a.id, date: a.date,
        login: a.firstInAt ? new Date(a.firstInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
        logout: a.lastOutAt ? new Date(a.lastOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        total: a.sessionSecs, active: a.activeSecs, idle: a.idleSecs,
        breaks: (a.breaks || []).map(function (b) {
          return {
            type: b.type,
            start: b.startAt ? new Date(b.startAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
            end: b.endAt ? new Date(b.endAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
            dur: Math.round((b.secs || 0) / 60)
          };
        }),
        tasks: Object.keys(a.perDeliverableSecs || {}).map(Number),
        taskTime: a.perDeliverableSecs || {},
        status: _EMP_ATT[a.status] || 'Absent'
      };
    });

  /* ── NOTIFICATIONS ───────────────────────────────────────────────────── */
  var ICONS = {
    ASSIGNED: { icon: 'clipboard',   bg: '#EFF6FF' },
    APPROVED: { icon: 'check-circle', bg: '#ECFDF5' },
    REJECTED: { icon: 'x-circle',    bg: '#FEF2F2' },
    DUE:      { icon: 'clock',       bg: '#FFFBEB' },
    REVIEW:   { icon: 'eye',         bg: '#F5F3FF' },
    EEN:      { icon: 'lightbulb',   bg: '#EFF6FF' },
    INFO:     { icon: 'info',        bg: '#F0EEE9' }
  };
  NOTIFS = DB.notifications
    .filter(function (n) { return n.recipientId === uid; })
    .map(function (n) {
      var look = ICONS[n.kind] || ICONS.INFO;
      return {
        id: n.id, type: n.kind.toLowerCase(),
        icon: look.icon, iconBg: look.bg,
        text: n.title, sub: n.body,
        time: _relLabel(n.createdAt),
        unread: !n.read,
        taskId: n.entityType === 'DELIVERABLE' ? n.entityId : null
      };
    });
}

function _mapSub(s, empById) {
  var emp = empById[s.assigneeId] || { name: 'Team', avatarInitials: '??', avatarBg: '#ccc', avatarFg: '#fff' };
  return {
    id: s.id, employeeId: s.assigneeId, assignee: s.assigneeId, createdById: s.createdById,
    employeeName: emp.name,
    title: s.title, desc: s.description,
    priority: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' }[s.priority] || 'Medium',
    status: _EMP_DEL_STATUS[s.status] || 'To Do',
    canonicalStatus: s.status,
    hoursLogged: Math.round(Schema.TIME.secsToHours(s.loggedSecs) * 10) / 10,
    estHours: Math.round(Schema.TIME.secsToHours(s.estimateSecs) * 10) / 10,
    date: s.createdAt ? Utils.isoDate(s.createdAt) : null,
    adminStatus: s.approvalState ? s.approvalState.toLowerCase() : null,
    adminNote: s.rejectionReason || null
  };
}

/* Mutation ke baad — projection refresh + re-render */
function syncAndRender(fn) {
  syncUserState();
  if (typeof fn === 'function') fn();
  else if (typeof rAll === 'function') rAll();
}
