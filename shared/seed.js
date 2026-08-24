/* ============================================================================
   OMENT CRM — UNIFIED SEED DATA
   ----------------------------------------------------------------------------
   YE DONO APPS KA SINGLE SOURCE OF TRUTH HAI.

   Pehle problem ye thi: admin app mein employee id=1 Priya Sharma thi, employee
   app mein id=1 Alex Chen tha. Project "Swiggy Clone" vs "Swiggy App Redesign".
   Status 'todo' vs 'In Progress'. Isliye dono apps ek doosre se baat nahi kar
   sakte the.

   Ab dono apps YAHI file padhti hain. Har app apna view adapters se banati hai
   (admin/assets/js/state.js aur employee/js/state.js dekho) — isse purana
   render code bina rewrite ke chalta rehta hai.

   Dates relative hain (Utils.daysFromNow) — isliye demo kabhi stale nahi hoga.
   ============================================================================ */

(function (root) {
  'use strict';

  var U = root.Utils;
  var d = U.daysFromNow;          // ISO datetime, n din baad
  var iso = U.isoDate;            // 'YYYY-MM-DD'
  var P = U.rupeesToPaise;

  /* ── Company / tenant ────────────────────────────────────────────────── */
  var COMPANY = {
    name: 'Stanstead Immigration Services',
    legalName: 'Stanstead Immigration Services',
    gstin: '27AABCO1234F1Z5',
    stateCode: '27',                    // Maharashtra — GST split ke liye
    address: '4th Floor, Trade Centre, Bandra Kurla Complex, Mumbai 400051',
    email: 'humera@stansteadimmigration.com',
    phone: '+91 22 4000 1234',
    workdayTargetSecs: 8 * 3600
  };

  /* ── Departments ─────────────────────────────────────────────────────── */
  var DEPARTMENTS = [
    { id: 3, name: 'Immigration Operations', headId: 10, description: 'Client cases, applications and operational delivery', color: '#059669' }
  ];

  /* ── Employees — EK registry, stable IDs ─────────────────────────────────
     Pehle do alag rosters the. Ab ek. Alex Chen (jo sirf employee app mein
     tha) ab id=9 pe hai. Admin ke IDs 1-8 preserve kiye hain taaki uske
     seed references (team:[1,3,6,8], assignee:1) na tootein.
     ───────────────────────────────────────────────────────────────────── */
  var EMPLOYEES = [
    { id:10, name:'Humera Khan', role:'CEO',              deptId:3, email:'humera@stansteadimmigration.com', phone:'', managerId:null, accessLevel:'MANAGER', attendanceStatus:'PRESENT', score:98, joinedAt:'2024-01-01', avatarInitials:'HK', avatarBg:'#18171A', avatarFg:'#FFFFFF', color:'#18171A', canLogin:true, costPerHourPaise:90000, billRatePaise:250000 },
    { id:11, name:'Nabeel Ali',  role:'Operations Manager', deptId:3, email:'alinabeelauctech@gmail.com',    phone:'', managerId:10,   accessLevel:'MANAGER', attendanceStatus:'PRESENT', score:95, joinedAt:'2024-01-01', avatarInitials:'NA', avatarBg:'#ECFDF5', avatarFg:'#065F46', color:'#059669', canLogin:true, costPerHourPaise:70000, billRatePaise:200000 },
    { id:12, name:'Nancy',       role:'Case Manager',      deptId:3, email:'nancy@stansteadimmigration.com', phone:'', managerId:10,   accessLevel:'EMPLOYEE', attendanceStatus:'PRESENT', score:92, joinedAt:'2025-03-01', avatarInitials:'NC', avatarBg:'#EFF6FF', avatarFg:'#1D4ED8', color:'#2563EB', canLogin:true, costPerHourPaise:50000, billRatePaise:150000 }
  ];

  /* Admin ka logged-in user (pehle 'RK' hardcoded tha init.js mein) */
  var ADMIN_USER = {
    id: 100, name: 'Humera Khan', role: 'CEO', email: 'humera@stansteadimmigration.com',
    accessLevel: 'ADMIN', avatarInitials: 'HK', avatarBg: '#18171A', avatarFg: '#FFFFFF', color: '#18171A'
  };

  /* ── Projects — EK canonical naam per project ────────────────────────── */
  var PROJECTS = [
  ];

  /* ── Milestones — flat, projectId ke saath ───────────────────────────── */
  var MILESTONES = [
  ];

  /* ── Deliverables — flat. Employee app inhi ko "tasks" bolti hai. ────────
     Ab dono apps ek hi records dekhti hain. Admin assign kare -> employee ko
     dikhega. Employee submit kare -> admin ko review queue mein aayega.
     ───────────────────────────────────────────────────────────────────── */
  var H = 3600;
  var DELIVERABLES = [
  ];

  /* ── Subtasks — deliverable ke andar work breakdown ──────────────────── */
  var SUBTASKS = [
  ];

  /* ── Attendance — per employee per din ───────────────────────────────── */
  /* Ek din ka active time employee ke deliverables pe distribute karo.
     ~85% tagged, baaki untagged overhead (meetings, admin) — realistic hai. */
  function spreadTime(empId, activeSecs, seedNum) {
    if (!activeSecs) return {};
    var mine = DELIVERABLES.filter(function (d) {
      return (d.assigneeIds || []).indexOf(empId) >= 0;
    });
    if (!mine.length) return {};
    var taggable = Math.round(activeSecs * 0.85);
    var picks = mine.length === 1 ? mine : [mine[seedNum % mine.length], mine[(seedNum + 1) % mine.length]];
    var out = {};
    if (picks.length === 1) { out[picks[0].id] = taggable; return out; }
    var split = Math.round(taggable * 0.62);
    out[picks[0].id] = split;
    out[picks[1].id] = taggable - split;
    return out;
  }

  function buildAttendance() {
    var out = [], today = new Date();
    EMPLOYEES.forEach(function (e) {
      for (var i = 0; i < 21; i++) {
        var day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        var dow = day.getDay();
        if (dow === 0 || dow === 6) continue;            // weekend skip
        var seed = (e.id * 31 + i * 17) % 100;
        var status = seed < 6 ? 'ABSENT' : seed < 11 ? 'HALF_DAY' : 'PRESENT';
        if (i === 0 && e.attendanceStatus !== 'PRESENT') status = e.attendanceStatus;
        var active = status === 'ABSENT' ? 0 : status === 'HALF_DAY' ? 13500 + seed * 10 : 25200 + seed * 60;
        var idle   = status === 'ABSENT' ? 0 : Math.round(active * 0.16);
        out.push({
          id: 'att_' + e.id + '_' + i,
          employeeId: e.id,
          date: iso(day),
          status: status,
          firstInAt: status === 'ABSENT' ? null : iso(day) + 'T09:' + String(5 + (seed % 25)).padStart(2, '0') + ':00',
          lastOutAt: status === 'ABSENT' || i === 0 ? null : iso(day) + 'T18:' + String(seed % 55).padStart(2, '0') + ':00',
          sessionSecs: active + idle,
          activeSecs: active,
          idleSecs: idle,
          breaks: status === 'ABSENT' ? [] : [{ type: 'Lunch', startAt: iso(day) + 'T13:00:00', endAt: iso(day) + 'T14:00:00', secs: 3600 }],
          /* Active time ko us din ke deliverables pe baant do — warna
             timesheets aur utilisation dono khaali dikhte hain */
          perDeliverableSecs: spreadTime(e.id, active, seed)
        });
      }
    });
    return out;
  }
  var ATTENDANCE = buildAttendance();

  /* ── Invoices ────────────────────────────────────────────────────────── */
  function inv(o) {
    var sub = o.subtotalPaise;
    var gst = U.computeGst(sub, 18, COMPANY.stateCode, o.placeOfSupply);
    return {
      id: o.id, number: o.number, projectId: o.projectId, milestoneId: o.milestoneId || null,
      clientName: o.clientName, clientEmail: o.clientEmail, clientGstin: o.clientGstin || '',
      placeOfSupply: o.placeOfSupply, status: o.status,
      issueDate: o.issueDate, dueDate: o.dueDate,
      lines: o.lines,
      subtotalPaise: sub,
      cgstPaise: gst.cgstPaise, sgstPaise: gst.sgstPaise, igstPaise: gst.igstPaise,
      totalPaise: gst.totalPaise, paidPaise: o.paidPaise || 0, notes: o.notes || ''
    };
  }
  var INVOICES = [
  ];

  /* ── Notices ─────────────────────────────────────────────────────────── */
  var NOTICES = [
  ];

  /* ── Conversations ───────────────────────────────────────────────────── */
  var CONVERSATIONS = [
  ];

  /* ── Calendar ────────────────────────────────────────────────────────── */
  var CALENDAR_EVENTS = [
  ];

  /* ── Call logs ───────────────────────────────────────────────────────── */
  var CALL_LOGS = [
  ];

  /* ── Notifications — recipientId ke saath ────────────────────────────── */
  var NOTIFICATIONS = [
  ];

  /* ── Activity feed ───────────────────────────────────────────────────── */
  var ACTIVITY = [
  ];

  /* Immigration demo data (spec 51 example) */
  var CONTACTS = [
  ];
  var CLIENTS = [
  ];

  root.SEED = {
    COMPANY: COMPANY,
    ADMIN_USER: ADMIN_USER,
    DEPARTMENTS: DEPARTMENTS,
    EMPLOYEES: EMPLOYEES,
    PROJECTS: PROJECTS,
    MILESTONES: MILESTONES,
    DELIVERABLES: DELIVERABLES,
    SUBTASKS: SUBTASKS,
    ATTENDANCE: ATTENDANCE,
    INVOICES: INVOICES,
    NOTICES: NOTICES,
    CONVERSATIONS: CONVERSATIONS,
    CALENDAR_EVENTS: CALENDAR_EVENTS,
    CALL_LOGS: CALL_LOGS,
    NOTIFICATIONS: NOTIFICATIONS,
    ACTIVITY: ACTIVITY,
    CONTACTS: CONTACTS,
    CLIENTS: CLIENTS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.SEED;

})(typeof window !== 'undefined' ? window : globalThis);
