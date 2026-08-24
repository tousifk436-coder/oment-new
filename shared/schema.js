/* ============================================================================
   OMENT CRM — CANONICAL DATA CONTRACT
   ----------------------------------------------------------------------------
   Ye file dono apps (admin "oment" aur employee "WorkSpace") mein SABSE PEHLE
   load honi chahiye — state.js se bhi pehle.

     <script src="shared/schema.js"></script>
     <script src="shared/utils.js"></script>
     <script src="assets/js/state.js"></script>   <!-- ya js/state.js -->

   Purpose: abhi dono apps ke IDs, project names, status words, priority casing
   aur time units alag hain — isliye wo ek doosre se baat nahi kar sakte.
   Ye file EK source of truth deti hai. Backend banane se pehle ye lock karo.
   ============================================================================ */

(function (root) {
  'use strict';

  /* ==========================================================================
     1. STATUS VOCABULARY
     Store hamesha machine value (SCREAMING_SNAKE). Display ke waqt label lo.
     ========================================================================== */

  var WORK_STATUS = {
    TODO:        { key: 'TODO',        label: 'To Do',        order: 1, tone: 'grey'   },
    IN_PROGRESS: { key: 'IN_PROGRESS', label: 'In Progress',  order: 2, tone: 'blue'   },
    IN_REVIEW:   { key: 'IN_REVIEW',   label: 'In Review',    order: 3, tone: 'purple' },
    REJECTED:    { key: 'REJECTED',    label: 'Rejected',     order: 4, tone: 'red'    },
    DONE:        { key: 'DONE',        label: 'Done',         order: 5, tone: 'green'  }
  };

  /* Legacy vocab -> canonical. Migration ke liye, aur kisi bhi purane
     seed data ko safely normalize karne ke liye. */
  var WORK_STATUS_ALIASES = {
    // employee app
    'todo': 'TODO', 'inprogress': 'IN_PROGRESS', 'in progress': 'IN_PROGRESS',
    'submitted': 'IN_REVIEW', 'approved': 'DONE', 'rejected': 'REJECTED',
    // admin app
    'In Progress': 'IN_PROGRESS', 'In Review': 'IN_REVIEW', 'Done': 'DONE',
    'Not Started': 'TODO', 'Upcoming': 'TODO', 'Overdue': 'IN_PROGRESS'
  };

  var MILESTONE_STATUS = {
    UPCOMING:    { key: 'UPCOMING',    label: 'Not Started', tone: 'grey'  },
    IN_PROGRESS: { key: 'IN_PROGRESS', label: 'In Progress', tone: 'blue'  },
    BLOCKED:     { key: 'BLOCKED',     label: 'Blocked',     tone: 'red'   },
    CANCELLED:   { key: 'CANCELLED',   label: 'Cancelled',   tone: 'grey'  },
    DONE:        { key: 'DONE',        label: 'Completed',   tone: 'green' }
  };
  /* OVERDUE kabhi store nahi hota — deadline se DERIVE hota hai (SisOps.signal).
     Isse "status update karna bhool gaye" wala stale-overdue bug ho hi nahi sakta. */

  var PROJECT_STATUS = {
    PLANNING:  { key: 'PLANNING',  label: 'Planning',  tone: 'amber' },
    ACTIVE:    { key: 'ACTIVE',    label: 'Active',    tone: 'green' },
    ON_HOLD:   { key: 'ON_HOLD',   label: 'On Hold',   tone: 'grey'  },
    COMPLETED: { key: 'COMPLETED', label: 'Completed', tone: 'blue'  }
  };

  var PRIORITY = {
    LOW:      { key: 'LOW',      label: 'Low',      order: 1, tone: 'green', emoji: '\uD83D\uDFE2' },
    MEDIUM:   { key: 'MEDIUM',   label: 'Medium',   order: 2, tone: 'amber', emoji: '\uD83D\uDFE1' },
    HIGH:     { key: 'HIGH',     label: 'High',     order: 3, tone: 'red',   emoji: '\uD83D\uDFE0' },
    CRITICAL: { key: 'CRITICAL', label: 'Critical', order: 4, tone: 'red',   emoji: '\uD83D\uDD34' }
  };

  /* SIS — grouped immigration service catalogue (spec §11) */
  var SERVICE_GROUPS = [
    { group: 'Permanent Residence', services: ['Express Entry', 'Provincial Nominee Program', 'Rural Immigration', 'Family Sponsorship', 'Other PR Pathway'] },
    { group: 'Temporary Residence', services: ['Visitor Visa / TRV', 'Super Visa', 'Study Permit', 'Work Permit'] },
    { group: 'Protection & Enforcement', services: ['Refugee Claim', 'Refugee Appeal', 'Detention Review'] },
    { group: 'Other Immigration Services', services: ['Refusal Review', 'Status / Restoration', 'Consultation', 'Complex Case', 'Other'] }
  ];

  /* Flat list (back-compat) */
  var SIS_SERVICES = [
    'Visitor Visa / TRV', 'Express Entry', 'Spousal Sponsorship', 'PR Application',
    'Work Permit', 'Study Permit', 'RCIP', 'H&C Application', 'Refugee Claim',
    'Citizenship', 'Other'
  ];

  var ATTENDANCE_STATUS = {
    PRESENT:  { key: 'PRESENT',  label: 'Present',  tone: 'green' },
    HALF_DAY: { key: 'HALF_DAY', label: 'Half Day', tone: 'amber' },
    ABSENT:   { key: 'ABSENT',   label: 'Absent',   tone: 'red'   },
    ON_LEAVE: { key: 'ON_LEAVE', label: 'On Leave', tone: 'grey'  }
  };

  var INVOICE_STATUS = {
    DRAFT:          { key: 'DRAFT',          label: 'Draft',          tone: 'grey'  },
    SENT:           { key: 'SENT',           label: 'Sent',           tone: 'blue'  },
    PARTIALLY_PAID: { key: 'PARTIALLY_PAID', label: 'Partially Paid', tone: 'amber' },
    PAID:           { key: 'PAID',           label: 'Paid',           tone: 'green' },
    OVERDUE:        { key: 'OVERDUE',        label: 'Overdue',        tone: 'red'   },
    CANCELLED:      { key: 'CANCELLED',      label: 'Cancelled',      tone: 'grey'  }
  };

  var LEAD_STAGE = {
    NEW:           { key: 'NEW',           label: 'New',           order: 1 },
    CONTACTED:     { key: 'CONTACTED',     label: 'Contacted',     order: 2 },
    PROPOSAL_SENT: { key: 'PROPOSAL_SENT', label: 'Proposal Sent', order: 3 },
    NEGOTIATION:   { key: 'NEGOTIATION',   label: 'Negotiation',   order: 4 },
    WON:           { key: 'WON',           label: 'Won',           order: 5 },
    LOST:          { key: 'LOST',          label: 'Lost',          order: 6 }
  };

  /* ==========================================================================
     2. NORMALIZERS
     Purane data ko canonical form mein laane ke liye. Idempotent hain —
     already-canonical value doobara pass karne se kuch nahi bigadta.
     ========================================================================== */

  function normStatus(v) {
    if (!v) return WORK_STATUS.TODO.key;
    var s = String(v).trim();
    if (WORK_STATUS[s]) return s;                       // already canonical
    if (WORK_STATUS_ALIASES[s]) return WORK_STATUS_ALIASES[s];
    var lower = s.toLowerCase();
    if (WORK_STATUS_ALIASES[lower]) return WORK_STATUS_ALIASES[lower];
    var snake = lower.replace(/[\s-]+/g, '_').toUpperCase();
    return WORK_STATUS[snake] ? snake : WORK_STATUS.TODO.key;
  }

  function normPriority(v) {
    if (!v) return PRIORITY.MEDIUM.key;
    var s = String(v).trim().toUpperCase();
    if (s === 'MED') s = 'MEDIUM';
    return PRIORITY[s] ? s : PRIORITY.MEDIUM.key;
  }

  function normProjectStatus(v) {
    var s = String(v || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
    return PROJECT_STATUS[s] ? s : PROJECT_STATUS.PLANNING.key;
  }

  function normMilestoneStatus(v) {
    var s = String(v || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
    return MILESTONE_STATUS[s] ? s : MILESTONE_STATUS.UPCOMING.key;
  }

  function normAttendance(v) {
    var s = String(v || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
    return ATTENDANCE_STATUS[s] ? s : ATTENDANCE_STATUS.ABSENT.key;
  }

  function normInvoiceStatus(v) {
    var s = String(v || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
    return INVOICE_STATUS[s] ? s : INVOICE_STATUS.DRAFT.key;
  }

  function normLeadStage(v) {
    var s = String(v || '').trim().replace(/[\s-]+/g, '_').toUpperCase();
    return LEAD_STAGE[s] ? s : LEAD_STAGE.NEW.key;
  }

  /* Display helper — kabhi bhi raw key user ko mat dikhao. */
  function label(dict, key) {
    var e = dict[key];
    return e ? e.label : '—';
  }
  function tone(dict, key) {
    var e = dict[key];
    return e ? e.tone : 'grey';
  }

  /* ==========================================================================
     3. TIME — EK UNIT: SECONDS
     Employee app seconds mein sochta hai (live timer), admin hours mein
     (estimates, billing). Storage hamesha seconds. Hours sirf display/input.
     ========================================================================== */

  var TIME = {
    hoursToSecs: function (h) { return Math.round((parseFloat(h) || 0) * 3600); },
    secsToHours: function (s) { return (parseInt(s, 10) || 0) / 3600; },

    /* "2h 30m" / "45m" / "0h" */
    fmtShort: function (secs) {
      var s = parseInt(secs, 10) || 0;
      if (s <= 0) return '0h';
      var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
      if (h && m) return h + 'h ' + m + 'm';
      if (h) return h + 'h';
      return m + 'm';
    },

    /* "01:23:45" — live timer ke liye */
    fmtClock: function (secs) {
      var s = Math.max(0, parseInt(secs, 10) || 0);
      return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
        .map(function (v) { return String(v).padStart(2, '0'); }).join(':');
    }
  };

  /* ==========================================================================
     4. CANONICAL ENTITY SHAPES
     Ye factories default-filled object dete hain. Naya record banate waqt
     inhi ka use karo — isse missing-field bugs khatam ho jaate hain.
     ========================================================================== */

  var Shape = {

    /* Ek hi employee registry. Dono apps yahi list use karengi.
       `canLogin` employee-app ke profile picker ke liye. */
    employee: function (o) {
      o = o || {};
      return {
        id:        o.id != null ? o.id : null,   // stable, kabhi reuse mat karo
        name:      o.name || '',
        email:     o.email || '',
        phone:     o.phone || '',
        role:      o.role || '',                 // designation, e.g. "Senior Developer"
        deptId:    o.deptId != null ? o.deptId : null,
        managerId: o.managerId != null ? o.managerId : null,
        accessLevel: o.accessLevel || 'EMPLOYEE', // EMPLOYEE | MANAGER | ADMIN
        attendanceStatus: normAttendance(o.attendanceStatus || o.status),
        joinedAt:  o.joinedAt || null,           // ISO 'YYYY-MM-DD'
        avatarInitials: o.avatarInitials || initialsOf(o.name || ''),
        avatarBg:  o.avatarBg || '#E8E5DF',
        avatarFg:  o.avatarFg || '#3D3B42',
        active:    o.active !== false
      };
    },

    department: function (o) {
      o = o || {};
      return {
        id: o.id != null ? o.id : null,
        name: o.name || '',
        headId: o.headId != null ? o.headId : null,
        description: o.description || '',
        color: o.color || '#2563EB'
      };
    },

    project: function (o) {
      o = o || {};
      return {
        id: o.id != null ? o.id : null,
        code: o.code || '',                      // e.g. 'SWG' — human-safe key
        name: o.name || '',                      // EK naam. Aliases mat rakho.
        clientName: o.clientName || '',
        clientEmail: o.clientEmail || '',
        status: normProjectStatus(o.status),
        priority: normPriority(o.priority),
        deptId: o.deptId != null ? o.deptId : null,
        headId: o.headId != null ? o.headId : null,
        memberIds: o.memberIds || [],
        description: o.description || '',
        startDate: o.startDate || null,          // ISO
        deadline: o.deadline || null,            // ISO
        budgetPaise: o.budgetPaise || 0,         // paise mein — float rupees mat rakho
        spentPaise: o.spentPaise || 0
      };
    },

    milestone: function (o) {
      o = o || {};
      return {
        id: o.id != null ? o.id : null,
        projectId: o.projectId != null ? o.projectId : null,
        title: o.title || '',
        description: o.description || '',
        status: normMilestoneStatus(o.status),
        dueDate: o.dueDate || null,              // ISO
        billable: o.billable !== false,          // invoicing ke liye
        sortOrder: o.sortOrder || 0,
        /* ── immigration ops fields (sab optional — purana code inko ignore karta hai) ── */
        ownerId: o.ownerId != null ? o.ownerId : null,          // legacy single user owner
        ownerRefs: Array.isArray(o.ownerRefs) ? o.ownerRefs : [], // [{type:'user'|'contact', id}]
        startDate: o.startDate || null,
        startTime: o.startTime || null,
        durationHrs: o.durationHrs != null ? o.durationHrs : null,
        priority: o.priority ? normPriority(o.priority) : null,
        dependsOn: o.dependsOn != null ? o.dependsOn : null,     // milestone id
        customFields: Array.isArray(o.customFields) ? o.customFields : [], // [{label,value}]
        calendarEventId: o.calendarEventId || null,
        completedAt: o.completedAt || null,
        completedBy: o.completedBy != null ? o.completedBy : null,
        completionNote: o.completionNote || '',
        blockReason: o.blockReason || null,
        blockedBy: o.blockedBy != null ? o.blockedBy : null,
        blockedAt: o.blockedAt || null,
        blockNotes: o.blockNotes || '',
        prevDueDate: o.prevDueDate || null,
        delayReason: o.delayReason || null
      };
    },

    /* External contact — Oment login NAHI milta (spec §4/§48) */
    contact: function (o) {
      o = o || {};
      return {
        id: o.id != null ? o.id : null,
        name: o.name || '',
        email: (o.email || '').trim().toLowerCase(),
        phone: o.phone || '',
        organization: o.organization || '',
        role: o.role || '',
        type: o.type || 'Other',   // Employee|Consultant|Lawyer|Translator|Client|Vendor|Other
        reusable: o.reusable !== false,
        active: o.active !== false,
        createdAt: o.createdAt || null
      };
    },

    /* Immigration client — ek client ke multiple projects ho sakte hain (spec §8) */
    client: function (o) {
      o = o || {};
      return {
        id: o.id != null ? o.id : null,
        name: o.name || '',
        email: (o.email || '').trim().toLowerCase(),
        phone: o.phone || '',
        countryOfNationality: o.countryOfNationality || '',
        currentAddress: o.currentAddress || '',
        uci: o.uci || '',
        applicationNumber: o.applicationNumber || '',
        rpdFileNumber: o.rpdFileNumber || '',
        dateOfBirth: o.dateOfBirth || null,
        driveLink: o.driveLink || '',
        notes: o.notes || '',
        active: o.active !== false,
        createdAt: o.createdAt || null
      };
    },

    /* Deliverable = admin ka "task", employee ka "assigned task".
       Flat rakho, parent FK ke saath. Nested rendering selector se banao. */
    deliverable: function (o) {
      o = o || {};
      return {
        id: o.id != null ? o.id : null,
        projectId: o.projectId != null ? o.projectId : null,
        milestoneId: o.milestoneId != null ? o.milestoneId : null,
        title: o.title || '',
        description: o.description || '',
        status: normStatus(o.status),
        priority: normPriority(o.priority),
        assigneeIds: o.assigneeIds || [],
        createdById: o.createdById != null ? o.createdById : null,
        origin: o.origin || 'ADMIN',             // ADMIN | SELF
        approvalState: o.approvalState || null,  // null | PENDING | APPROVED | REJECTED
        rejectionReason: o.rejectionReason || null,
        dueAt: o.dueAt || null,                  // ISO datetime — string label mat store karo
        estimateSecs: TIME.hoursToSecs(o.estimateHours || 0) || o.estimateSecs || 0,
        loggedSecs: o.loggedSecs || 0,
        progressPct: o.progressPct || 0,
        briefFiles: o.briefFiles || [],          // manager -> employee
        submissionFiles: o.submissionFiles || [],// employee -> manager
        submissionNotes: o.submissionNotes || '',
        comments: o.comments || [],
        timeline: o.timeline || [],
        createdAt: o.createdAt || null
      };
    },

    /* Subtask = deliverable ke andar ka work breakdown. */
    subtask: function (o) {
      o = o || {};
      return {
        id: o.id != null ? o.id : null,
        deliverableId: o.deliverableId != null ? o.deliverableId : null,
        title: o.title || '',
        description: o.description || '',
        status: normStatus(o.status),
        priority: normPriority(o.priority),
        assigneeId: o.assigneeId != null ? o.assigneeId : null,
        createdById: o.createdById != null ? o.createdById : null,
        estimateSecs: o.estimateSecs || 0,
        loggedSecs: o.loggedSecs || 0,
        approvalState: o.approvalState || null,
        rejectionReason: o.rejectionReason || null,
        createdAt: o.createdAt || null,
        completedAt: o.completedAt || null,
        timeline: o.timeline || []
      };
    },

    /* Ek attendance record per employee per din. */
    attendanceDay: function (o) {
      o = o || {};
      return {
        id: o.id || null,
        employeeId: o.employeeId != null ? o.employeeId : null,
        date: o.date || null,                    // ISO 'YYYY-MM-DD'
        status: normAttendance(o.status),
        firstInAt: o.firstInAt || null,          // ISO datetime
        lastOutAt: o.lastOutAt || null,
        sessionSecs: o.sessionSecs || 0,         // total online
        activeSecs: o.activeSecs || 0,           // timer chal raha tha
        idleSecs: o.idleSecs || 0,
        breaks: o.breaks || [],                  // {type, startAt, endAt, secs}
        perDeliverableSecs: o.perDeliverableSecs || {}  // { deliverableId: secs }
      };
    },

    /* Time entry — audit trail. Timer ke liye counter nahi, timestamps.
       Isse background-tab throttling ka bug bhi khatam hota hai. */
    timeEntry: function (o) {
      o = o || {};
      return {
        id: o.id || null,
        employeeId: o.employeeId != null ? o.employeeId : null,
        deliverableId: o.deliverableId != null ? o.deliverableId : null,
        subtaskId: o.subtaskId != null ? o.subtaskId : null,
        startedAt: o.startedAt || null,          // ISO datetime
        endedAt: o.endedAt || null,              // null = abhi chal raha hai
        source: o.source || 'TIMER'              // TIMER | MANUAL
      };
    },

    invoice: function (o) {
      o = o || {};
      return {
        id: o.id != null ? o.id : null,
        number: o.number || '',                  // NEVER reuse. Counter se lo.
        projectId: o.projectId != null ? o.projectId : null,
        milestoneId: o.milestoneId != null ? o.milestoneId : null,
        clientName: o.clientName || '',
        clientEmail: o.clientEmail || '',
        clientGstin: o.clientGstin || '',
        placeOfSupply: o.placeOfSupply || '',    // state code — IGST vs CGST/SGST
        status: normInvoiceStatus(o.status),
        issueDate: o.issueDate || null,
        dueDate: o.dueDate || null,
        lines: o.lines || [],                    // {description, hsnSac, qty, ratePaise}
        subtotalPaise: o.subtotalPaise || 0,
        cgstPaise: o.cgstPaise || 0,
        sgstPaise: o.sgstPaise || 0,
        igstPaise: o.igstPaise || 0,
        totalPaise: o.totalPaise || 0,
        paidPaise: o.paidPaise || 0,
        notes: o.notes || ''
      };
    },

    lead: function (o) {
      o = o || {};
      return {
        id: o.id != null ? o.id : null,
        company: o.company || '',
        contactName: o.contactName || '',
        email: o.email || '',
        phone: o.phone || '',
        stage: normLeadStage(o.stage),
        priority: normPriority(o.priority),
        valuePaise: o.valuePaise || 0,
        source: o.source || '',
        ownerId: o.ownerId != null ? o.ownerId : null,
        lastActivityAt: o.lastActivityAt || null,
        followUpAt: o.followUpAt || null,
        notes: o.notes || ''
      };
    },

    notification: function (o) {
      o = o || {};
      return {
        id: o.id != null ? o.id : null,
        recipientId: o.recipientId != null ? o.recipientId : null,
        kind: o.kind || 'INFO',                  // ASSIGNED | APPROVED | REJECTED | DUE | INFO
        title: o.title || '',
        body: o.body || '',
        entityType: o.entityType || null,        // DELIVERABLE | SUBTASK | INVOICE | NOTICE
        entityId: o.entityId != null ? o.entityId : null,
        read: !!o.read,
        createdAt: o.createdAt || null
      };
    }
  };

  function initialsOf(name) {
    return String(name).trim().split(/\s+/).map(function (n) { return n[0] || ''; })
      .join('').slice(0, 2).toUpperCase();
  }

  /* ==========================================================================
     5. SELECTORS
     Nested view derive karo, duplicate store mat karo. Employee app ka
     dual-write bug (d.tasks + TASKS dono mein push) isi se khatam hota hai.
     ========================================================================== */

  var Select = {
    deliverablesOfMilestone: function (db, milestoneId) {
      return db.deliverables.filter(function (d) { return d.milestoneId === milestoneId; });
    },
    deliverablesOfProject: function (db, projectId) {
      return db.deliverables.filter(function (d) { return d.projectId === projectId; });
    },
    subtasksOf: function (db, deliverableId) {
      return db.subtasks.filter(function (s) { return s.deliverableId === deliverableId; });
    },
    myDeliverables: function (db, employeeId) {
      return db.deliverables.filter(function (d) {
        return (d.assigneeIds || []).indexOf(employeeId) >= 0;
      });
    },
    /* Employee app ka per-user filtering isi se aayega — abhi wo missing hai. */
    myOpenWork: function (db, employeeId) {
      return Select.myDeliverables(db, employeeId).filter(function (d) {
        return d.status === 'TODO' || d.status === 'IN_PROGRESS' || d.status === 'REJECTED';
      });
    },
    /* Milestone complete tabhi jab uske saare deliverables DONE hon. */
    isMilestoneComplete: function (db, milestoneId) {
      var ds = Select.deliverablesOfMilestone(db, milestoneId);
      return ds.length > 0 && ds.every(function (d) { return d.status === 'DONE'; });
    },
    milestoneProgressPct: function (db, milestoneId) {
      var ds = Select.deliverablesOfMilestone(db, milestoneId);
      if (!ds.length) return 0;
      var done = ds.filter(function (d) { return d.status === 'DONE'; }).length;
      return Math.round(done / ds.length * 100);
    },
    /* Project progress derive karo — abhi dono apps mein hardcoded field hai
       jo kabhi update nahi hoti. */
    projectProgressPct: function (db, projectId) {
      var ds = Select.deliverablesOfProject(db, projectId);
      if (!ds.length) return 0;
      var done = ds.filter(function (d) { return d.status === 'DONE'; }).length;
      return Math.round(done / ds.length * 100);
    },
    presentToday: function (db) {
      return db.employees.filter(function (e) {
        return e.attendanceStatus === 'PRESENT';
      });
    }
  };

  /* ==========================================================================
     6. LEGACY ADAPTERS
     Purane seed data ko canonical mein laane ke liye. Migration ke baad
     inhe delete kar dena.
     ========================================================================== */

  var Adapt = {
    /* Employee app ka TASKS[] -> canonical deliverable */
    fromEmployeeTask: function (t, projectIdByName) {
      return Shape.deliverable({
        id: t.id,
        projectId: projectIdByName ? projectIdByName[t.proj] : null,
        title: t.title,
        description: t.desc,
        status: normStatus(t.status),
        priority: normPriority(t.priority),
        origin: t.self ? 'SELF' : 'ADMIN',
        approvalState: t.saStatus ? String(t.saStatus).toUpperCase() : null,
        rejectionReason: t.rejReason || null,
        dueAt: t.dms ? new Date(t.dms).toISOString() : null,
        estimateSecs: t.exp || 0,
        loggedSecs: t.logged || 0,
        briefFiles: (t.files || []).map(normFile),
        submissionFiles: (t.subFiles || []).map(normFile),
        submissionNotes: t.subNotes || '',
        timeline: t.tl || []
      });
    },

    /* Admin app ka STATE.tasks[] -> canonical deliverable */
    fromAdminTask: function (t) {
      return Shape.deliverable({
        id: t.id,
        projectId: t.projectId,
        milestoneId: t.milestoneId,
        title: t.title,
        description: t.desc,
        /* Admin mein rejection ek alag field thi, status nahi — normalize karo */
        status: t.rejectionReason && t.status !== 'Done' ? 'REJECTED' : normStatus(t.status),
        priority: normPriority(t.priority),
        assigneeIds: t.assignees && t.assignees.length ? t.assignees : (t.assignee ? [t.assignee] : []),
        rejectionReason: t.rejectionReason || null,
        dueAt: t.deadline ? new Date(t.deadline).toISOString() : null,
        estimateHours: t.hours || 0,
        progressPct: t.progress || 0,
        briefFiles: (t.files || []).map(normFile),
        submissionFiles: (t.submissionFiles || []).map(normFile),
        submissionNotes: t.submissionNotes || '',
        comments: t.messages || [],
        timeline: t.timeline || []
      });
    },

    fromAdminSubtask: function (s, deliverableId) {
      return Shape.subtask({
        id: s.id,
        deliverableId: deliverableId,
        title: s.title,
        description: s.desc,
        status: s.rejectionReason && s.status !== 'Done' ? 'REJECTED' : normStatus(s.status),
        priority: normPriority(s.priority),
        assigneeId: s.assignee,
        createdById: s.createdBy,
        estimateSecs: TIME.hoursToSecs(s.estimatedTime),
        loggedSecs: TIME.hoursToSecs(s.timeSpent),
        rejectionReason: s.rejectionReason || null,
        createdAt: s.createdAt || null,
        completedAt: s.completedAt || null,
        timeline: s.timeline || []
      });
    }
  };

  /* File objects dono apps mein 3 alag shapes mein the: {name,size,type},
     {n,s,t}, aur raw File. Ek shape. */
  function normFile(f) {
    if (!f) return null;
    return {
      name: f.name || f.n || '',
      sizeLabel: f.size || f.s || '',
      kind: (f.type || f.t || 'doc').toLowerCase(),
      url: f.url || null
    };
  }

  /* ==========================================================================
     7. EXPORT
     ========================================================================== */

  var Schema = {
    WORK_STATUS: WORK_STATUS,
    MILESTONE_STATUS: MILESTONE_STATUS,
    PROJECT_STATUS: PROJECT_STATUS,
    PRIORITY: PRIORITY,
    SIS_SERVICES: SIS_SERVICES,
    SERVICE_GROUPS: SERVICE_GROUPS,
    ATTENDANCE_STATUS: ATTENDANCE_STATUS,
    INVOICE_STATUS: INVOICE_STATUS,
    LEAD_STAGE: LEAD_STAGE,

    normStatus: normStatus,
    normPriority: normPriority,
    normProjectStatus: normProjectStatus,
    normMilestoneStatus: normMilestoneStatus,
    normAttendance: normAttendance,
    normInvoiceStatus: normInvoiceStatus,
    normLeadStage: normLeadStage,
    normFile: normFile,

    label: label,
    tone: tone,
    initialsOf: initialsOf,

    TIME: TIME,
    Shape: Shape,
    Select: Select,
    Adapt: Adapt
  };

  root.Schema = Schema;
  if (typeof module !== 'undefined' && module.exports) module.exports = Schema;

})(typeof window !== 'undefined' ? window : globalThis);