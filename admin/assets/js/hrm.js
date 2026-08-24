/* ============================================================================
   HRM MODULE — People operations
   ----------------------------------------------------------------------------
   Pehle admin ke paas attendance ka koi view hi nahi tha — employee apna
   dekh sakta tha, manager kuch nahi. Ab paanch tabs:

     Today       — live team board, kaun kaam kar raha hai, kaun late hai
     Register    — monthly attendance grid, payable days ke saath
     Leave       — requests, approvals, balances
     Timesheets  — project-wise time, billable vs overhead
     Capacity    — utilisation aur load, planning ke liye
   ============================================================================ */

var HR_TAB = 'today';
var HR_REG = { year: new Date().getFullYear(), month: new Date().getMonth() };
var HR_LEAVE_FILTER = 'PENDING';
var HR_TS_EMP = null;

function renderHrm() {
  var v = document.getElementById('view-hrm');
  if (!v) return;

  var tabs = [
    ['today', 'Aaj'],
    ['register', 'Mahine ka record'],
    ['leave', 'Chhutti'],
    ['timesheets', 'Time kahan gaya'],
    ['capacity', 'Kaam ka bojh']
  ];

  var pendingLeave = (DataAPI.raw().leaveRequests || []).filter(function (r) { return r.status === 'PENDING'; }).length;
  var pendingReg = (DataAPI.raw().regularisations || []).filter(function (r) { return r.status === 'PENDING'; }).length;

  v.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px">' +
      '<div>' +
        '<div class="section-title" style="font-size:20px">People</div>' +
        '<div class="section-sub">Attendance, chhutti aur kis pe kitna kaam hai</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-secondary btn-sm" onclick="hrOpenHolidays()">Chhutti ki list</button>' +
        '<button class="btn btn-primary btn-sm" onclick="hrExportRegister()">Excel mein download</button>' +
      '</div>' +
    '</div>' +

    '<div class="tab-bar" style="margin-bottom:18px">' +
      tabs.map(function (t) {
        var badge = '';
        if (t[0] === 'leave' && (pendingLeave + pendingReg) > 0) {
          badge = '<span style="margin-left:6px;background:var(--red);color:#fff;font-size:9.5px;' +
                  'padding:1px 6px;border-radius:99px;font-weight:700">' + (pendingLeave + pendingReg) + '</span>';
        }
        return '<button class="tab-btn' + (HR_TAB === t[0] ? ' active' : '') +
               '" onclick="hrSetTab(\'' + t[0] + '\')">' + t[1] + badge + '</button>';
      }).join('') +
    '</div>' +

    '<div id="hr-pane"></div>';

  hrRenderPane();
}

function hrSetTab(tab) { HR_TAB = tab; renderHrm(); }

function hrRenderPane() {
  var pane = document.getElementById('hr-pane');
  if (!pane) return;
  pane.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t3);font-size:13px">Loading\u2026</div>';

  if (HR_TAB === 'today')      return hrRenderToday(pane);
  if (HR_TAB === 'register')   return hrRenderRegister(pane);
  if (HR_TAB === 'leave')      return hrRenderLeave(pane);
  if (HR_TAB === 'timesheets') return hrRenderTimesheets(pane);
  if (HR_TAB === 'capacity')   return hrRenderCapacity(pane);
}

/* ══════════════════════════ TODAY BOARD ══════════════════════════ */
function hrRenderToday(pane) {
  HRM.getTodayBoard().then(function (b) {
    var stateStyle = {
      WORKING:      { label: 'Kaam kar raha hai', color: 'var(--green)', bg: '#ECFDF5', dot: 'var(--green)' },
      IN_OFFICE:    { label: 'Aa gaya',       color: 'var(--blue)',  bg: '#EFF6FF', dot: 'var(--blue)' },
      CHECKED_OUT:  { label: 'Ghar chala gaya', color: 'var(--t2)',  bg: 'var(--s2)', dot: 'var(--t4)' },
      ON_LEAVE:     { label: 'Chhutti pe',    color: '#7C3AED',      bg: '#F5F3FF', dot: '#7C3AED' },
      NOT_IN:       { label: 'Abhi nahi aaya', color: 'var(--red)',  bg: '#FEF2F2', dot: 'var(--red)' }
    };

    var banner = '';
    if (b.holiday) {
      banner = '<div style="padding:12px 16px;background:#F5F3FF;border-radius:var(--r10);margin-bottom:16px;' +
        'font-size:13px;color:#5B21B6"><strong>\uD83C\uDF89 ' + esc(b.holiday.name) + '</strong>' +
        (b.holiday.optional ? ' \u00b7 optional holiday' : ' \u00b7 company holiday') + '</div>';
    } else if (b.isWeekOff) {
      banner = '<div style="padding:12px 16px;background:var(--s2);border-radius:var(--r10);margin-bottom:16px;' +
        'font-size:13px;color:var(--t2)">Weekly off \u2014 attendance not expected today.</div>';
    }

    var s = b.summary;
    var stats = [
      ['Abhi kaam pe', s.working, 'var(--green)'],
      ['Office aaye', s.inOffice, 'var(--blue)'],
      ['Chhutti pe', s.onLeave, '#7C3AED'],
      ['Nahi aaye', s.notIn, s.notIn ? 'var(--red)' : 'var(--t3)'],
      ['Late aaye', s.late, s.late ? 'var(--amber)' : 'var(--t3)']
    ];

    pane.innerHTML = banner +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:18px">' +
        stats.map(function (st) {
          return '<div class="stat-card">' +
            '<div class="stat-label">' + st[0] + '</div>' +
            '<div class="stat-value" style="color:' + st[2] + '">' + st[1] + '</div>' +
            '<div class="stat-sub">of ' + s.total + ' people</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      '<div class="card card-pad">' +
        '<div class="section-header"><div class="section-title">Aaj kaun kya kar raha hai</div>' +
        '<div class="section-sub">' + fmtDate(b.date) + '</div></div>' +
        b.rows.map(function (r) {
          var st = stateStyle[r.state];
          var flagChips = r.flags.map(function (f) {
            if (f.type === 'LATE') return chip(f.mins + ' min late', 'var(--amber)', '#FFFBEB');
            if (f.type === 'SHORT') return chip(Schema.TIME.fmtShort(f.secs) + ' kam', 'var(--red)', '#FEF2F2');
            if (f.type === 'UNDER') return chip(Schema.TIME.fmtShort(f.secs) + ' kam', 'var(--amber)', '#FFFBEB');
            if (f.type === 'OVERTIME') return chip(Schema.TIME.fmtShort(f.secs) + ' extra', 'var(--green)', '#ECFDF5');
            if (f.type === 'MISSING_PUNCH') return chip('out time nahi lagaya', 'var(--t2)', 'var(--s2)');
            return '';
          }).join('');

          return '<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--b1)">' +
            '<div class="avatar" style="background:' + r.avatarBg + ';color:' + r.avatarFg + ';flex-shrink:0">' +
              esc(r.avatarInitials) + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;flex-wrap:wrap">' +
                esc(r.name) + flagChips +
              '</div>' +
              '<div style="font-size:11.5px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                (r.workingOn ? '\u25B8 ' + esc(r.workingOn)
                  : r.leaveType ? esc((HRM.LEAVE_TYPES[r.leaveType] || {}).label || 'On leave')
                  : esc(r.role)) +
              '</div>' +
            '</div>' +
            '<div style="text-align:right;flex-shrink:0">' +
              '<div style="font-size:12px;font-weight:700;font-family:var(--mono)">' +
                (r.activeSecs ? Schema.TIME.fmtShort(r.activeSecs) : '\u2014') + '</div>' +
              '<div style="font-size:10.5px;color:var(--t3)">' +
                (r.firstInAt ? 'in ' + new Date(r.firstInAt).toLocaleTimeString('en-IN',
                  { hour: '2-digit', minute: '2-digit', hour12: false }) : '') + '</div>' +
            '</div>' +
            '<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;flex-shrink:0;' +
              'background:' + st.bg + ';color:' + st.color + '">' +
              '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' +
              st.dot + ';margin-right:5px"></span>' + st.label + '</span>' +
          '</div>';
        }).join('') +
      '</div>';
  });
}

function chip(text, color, bg) {
  return '<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:99px;background:' +
    bg + ';color:' + color + '">' + esc(text) + '</span>';
}

/* ══════════════════════════ REGISTER ══════════════════════════ */
function hrRenderRegister(pane) {
  HRM.getRegister(HR_REG.year, HR_REG.month).then(function (reg) {
    var monthName = new Date(reg.year, reg.month, 1)
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    var codeStyle = {
      P:  { bg: '#ECFDF5', fg: '#065F46' },
      HD: { bg: '#FFFBEB', fg: '#92400E' },
      A:  { bg: '#FEF2F2', fg: '#991B1B' },
      W:  { bg: 'var(--s2)', fg: 'var(--t4)' },
      H:  { bg: '#F5F3FF', fg: '#5B21B6' },
      CL: { bg: '#EFF6FF', fg: '#1D4ED8' },
      SL: { bg: '#FFFBEB', fg: '#92400E' },
      EL: { bg: '#ECFDF5', fg: '#065F46' },
      COMP:{ bg: '#F5F3FF', fg: '#5B21B6' },
      LOP:{ bg: '#FEF2F2', fg: '#991B1B' },
      L:  { bg: '#EFF6FF', fg: '#1D4ED8' },
      '': { bg: 'transparent', fg: 'var(--t4)' }
    };

    pane.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<button class="btn btn-secondary btn-sm" onclick="hrRegNav(-1)">\u2039</button>' +
          '<span style="font-size:14px;font-weight:700;min-width:150px;text-align:center">' + monthName + '</span>' +
          '<button class="btn btn-secondary btn-sm" onclick="hrRegNav(1)">\u203A</button>' +
        '</div>' +
        '<div style="display:flex;gap:8px;font-size:11px;color:var(--t3);flex-wrap:wrap;align-items:center">' +
          [['P','Aaya'],['HD','Aadha din'],['A','Nahi aaya'],['CL','Chhutti'],['W','Weekly off'],['H','Holiday']]
            .map(function (c) {
              var st = codeStyle[c[0]];
              return '<span style="display:inline-flex;align-items:center;gap:4px">' +
                '<span style="width:16px;height:16px;border-radius:4px;background:' + st.bg + ';color:' + st.fg +
                ';font-size:8.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center">' +
                c[0] + '</span>' + c[1] + '</span>';
            }).join('') +
        '</div>' +
      '</div>' +

      '<div class="card" style="overflow-x:auto">' +
        '<table style="width:100%;border-collapse:collapse;min-width:' + (260 + reg.days.length * 26) + 'px">' +
          '<thead><tr style="background:var(--s2)">' +
            '<th style="text-align:left;padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;' +
              'letter-spacing:.4px;color:var(--t3);position:sticky;left:0;background:var(--s2);z-index:2;min-width:150px">Employee</th>' +
            reg.days.map(function (d) {
              var col = d.holiday ? '#7C3AED' : d.weekOff ? 'var(--t4)' : 'var(--t3)';
              return '<th title="' + escAttr(d.date + (d.holiday ? ' \u2014 ' + d.holiday.name : '')) + '" ' +
                'style="padding:6px 2px;font-size:9.5px;font-weight:700;color:' + col + ';width:24px">' +
                d.day + '<div style="font-size:8px;font-weight:500;opacity:.7">' + d.weekday[0] + '</div></th>';
            }).join('') +
            '<th style="padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;' +
              'color:var(--t3);text-align:right;min-width:90px">Payable' + Glossary.helpIcon('payableDays', 11) + '</th>' +
            '<th style="padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;' +
              'color:var(--t3);text-align:right;min-width:70px">Hours</th>' +
          '</tr></thead><tbody>' +
          reg.rows.map(function (r) {
            return '<tr style="border-bottom:1px solid var(--b1)">' +
              '<td style="padding:8px 10px;position:sticky;left:0;background:var(--surface);z-index:1">' +
                '<div style="display:flex;align-items:center;gap:8px">' +
                  '<div class="avatar avatar-sm" style="background:' + r.avatarBg + ';color:' + r.avatarFg + '">' +
                    esc(r.avatarInitials) + '</div>' +
                  '<span style="font-size:12.5px;font-weight:600">' + esc(r.name) + '</span>' +
                '</div></td>' +
              r.cells.map(function (c) {
                var st = codeStyle[c.code] || codeStyle[''];
                var ring = c.late ? ';box-shadow:inset 0 0 0 1.5px var(--amber)' :
                           c.missingPunch ? ';box-shadow:inset 0 0 0 1.5px var(--t3)' : '';
                var title = c.label + (c.hours ? ' \u00b7 ' + Schema.TIME.fmtShort(c.hours) : '') +
                            (c.late ? ' \u00b7 late' : '');
                return '<td style="padding:2px;text-align:center">' +
                  '<div title="' + escAttr(c.date + ' \u2014 ' + title) + '" ' +
                  'style="width:22px;height:22px;margin:0 auto;border-radius:5px;font-size:8.5px;font-weight:700;' +
                  'display:flex;align-items:center;justify-content:center;background:' + st.bg + ';color:' + st.fg + ring + '">' +
                  esc(c.code) + '</div></td>';
              }).join('') +
              '<td style="padding:8px 10px;text-align:right;font-family:var(--mono);font-size:12.5px;font-weight:700">' +
                r.summary.payableDays + ' / ' + r.summary.workingDays +
                '<div style="font-size:10px;color:' + (r.summary.attendancePct >= 90 ? 'var(--green)' :
                  r.summary.attendancePct >= 75 ? 'var(--amber)' : 'var(--red)') + ';font-weight:600">' +
                  r.summary.attendancePct + '%</div></td>' +
              '<td style="padding:8px 10px;text-align:right;font-family:var(--mono);font-size:12px">' +
                Schema.TIME.fmtShort(r.summary.totalSecs) +
                (r.summary.late ? '<div style="font-size:10px;color:var(--amber)">' + r.summary.late + ' late</div>' : '') +
              '</td>' +
            '</tr>';
          }).join('') +
        '</tbody></table>' +
      '</div>';
  });
}

function hrRegNav(delta) {
  var m = HR_REG.month + delta, y = HR_REG.year;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  HR_REG = { year: y, month: m };
  hrRenderPane();
}

/* ══════════════════════════ LEAVE ══════════════════════════ */
function hrRenderLeave(pane) {
  Promise.all([
    HRM.getLeaveRequests(),
    HRM.getBalances(),
    HRM.getRegularisations()
  ]).then(function (res) {
    var reqs = res[0], balances = res[1], regs = res[2];
    var filtered = HR_LEAVE_FILTER === 'ALL' ? reqs : reqs.filter(function (r) { return r.status === HR_LEAVE_FILTER; });
    var pendingRegs = regs.filter(function (r) { return r.status === 'PENDING'; });

    var filters = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];
    var counts = { PENDING: reqs.filter(function (r) { return r.status === 'PENDING'; }).length,
                   APPROVED: reqs.filter(function (r) { return r.status === 'APPROVED'; }).length,
                   REJECTED: reqs.filter(function (r) { return r.status === 'REJECTED'; }).length,
                   ALL: reqs.length };

    var regBlock = pendingRegs.length ? (
      '<div class="card card-pad" style="margin-bottom:16px;border-left:3px solid var(--amber)">' +
        '<div class="section-header"><div>' +
          '<div class="section-title">Attendance correction' + Glossary.helpIcon('regularisation') + '</div>' +
          '<div class="section-sub">Missed punches waiting on you</div></div></div>' +
        pendingRegs.map(function (r) {
          var e = STATE.employees.find(function (x) { return x.id === r.employeeId; }) || {};
          return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--b1)">' +
            '<div class="avatar avatar-sm" style="background:' + (e.color || '#ccc') + '">' + esc(e.avatar || '?') + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:12.5px;font-weight:600">' + esc(e.name || 'Unknown') + ' \u00b7 ' + fmtDate(r.date) + '</div>' +
              '<div style="font-size:11.5px;color:var(--t3)">' +
                (r.proposedInAt ? 'in ' + esc(r.proposedInAt) : '') +
                (r.proposedOutAt ? ' \u2192 out ' + esc(r.proposedOutAt) : '') +
                ' \u00b7 ' + esc(r.reason) + '</div>' +
            '</div>' +
            '<button class="btn btn-sm btn-secondary" onclick="hrRejectReg(\'' + r.id + '\')">Decline</button>' +
            '<button class="btn btn-sm btn-primary" onclick="hrApproveReg(\'' + r.id + '\')">Approve</button>' +
          '</div>';
        }).join('') +
      '</div>') : '';

    pane.innerHTML = regBlock +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px">' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          filters.map(function (f) {
            return '<button class="btn btn-sm ' + (HR_LEAVE_FILTER === f ? 'btn-primary' : 'btn-secondary') +
              '" onclick="hrSetLeaveFilter(\'' + f + '\')">' +
              f.charAt(0) + f.slice(1).toLowerCase() +
              (counts[f] ? ' (' + counts[f] + ')' : '') + '</button>';
          }).join('') +
        '</div>' +
        '<button class="btn btn-primary btn-sm" onclick="hrOpenApplyLeave()">Apply on behalf</button>' +
      '</div>' +

      '<div class="card" style="margin-bottom:18px">' +
        (filtered.length ? filtered.map(function (r) {
          var e = STATE.employees.find(function (x) { return x.id === r.employeeId; }) || {};
          var lt = HRM.LEAVE_TYPES[r.type] || { label: r.type, color: 'var(--t3)' };
          var stTone = { PENDING: ['var(--amber)', '#FFFBEB'], APPROVED: ['var(--green)', '#ECFDF5'],
                         REJECTED: ['var(--red)', '#FEF2F2'], CANCELLED: ['var(--t3)', 'var(--s2)'] }[r.status];
          return '<div style="padding:13px 16px;border-bottom:1px solid var(--b1)">' +
            '<div style="display:flex;align-items:flex-start;gap:12px">' +
              '<div class="avatar avatar-sm" style="background:' + (e.color || '#ccc') + ';flex-shrink:0">' +
                esc(e.avatar || '?') + '</div>' +
              '<div style="flex:1;min-width:0">' +
                '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">' +
                  '<span style="font-size:13px;font-weight:600">' + esc(e.name || 'Unknown') + '</span>' +
                  '<span style="font-size:10.5px;font-weight:600;padding:1px 8px;border-radius:99px;' +
                    'background:' + lt.color + '18;color:' + lt.color + '">' + esc(lt.label) + '</span>' +
                  '<span style="font-size:10.5px;font-weight:600;padding:1px 8px;border-radius:99px;' +
                    'background:' + stTone[1] + ';color:' + stTone[0] + '">' +
                    esc(HRM.LEAVE_STATUS[r.status].label) + '</span>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--t2);margin-bottom:3px">' +
                  fmtDate(r.fromDate) + (r.fromDate !== r.toDate ? ' \u2192 ' + fmtDate(r.toDate) : '') +
                  ' \u00b7 <strong>' + r.days + ' day' + (r.days === 1 ? '' : 's') + '</strong>' +
                  (r.halfDay !== 'FULL' ? ' (half)' : '') + '</div>' +
                '<div style="font-size:12px;color:var(--t3)">' + esc(r.reason) + '</div>' +
                (r.decisionNote ? '<div style="font-size:11.5px;color:' + stTone[0] +
                  ';margin-top:5px;padding:6px 9px;background:' + stTone[1] + ';border-radius:var(--r6)">' +
                  esc(r.decisionNote) + '</div>' : '') +
              '</div>' +
              (r.status === 'PENDING' ?
                '<div style="display:flex;gap:6px;flex-shrink:0">' +
                  '<button class="btn btn-sm btn-secondary" onclick="hrRejectLeave(\'' + r.id + '\')">Decline</button>' +
                  '<button class="btn btn-sm btn-primary" onclick="hrApproveLeave(\'' + r.id + '\')">Approve</button>' +
                '</div>' : '') +
            '</div>' +
          '</div>';
        }).join('')
        : '<div class="empty-teach"><div class="empty-teach-icon">\uD83C\uDFD6\uFE0F</div>' +
          '<div class="empty-teach-title">No ' + HR_LEAVE_FILTER.toLowerCase() + ' requests</div>' +
          '<div class="empty-teach-body">Employees apne app se leave apply karte hain \u2014 wo yahan ' +
          'approval ke liye aata hai. Aap unki taraf se bhi apply kar sakte ho.</div>' +
          '<button class="btn btn-primary btn-sm" onclick="hrOpenApplyLeave()">Apply on behalf</button></div>') +
      '</div>' +

      '<div class="card card-pad">' +
        '<div class="section-header"><div class="section-title">Kiski kitni chhutti bachi hai</div>' +
        '<div class="section-sub">' + new Date().getFullYear() + '</div></div>' +
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:520px">' +
          '<thead><tr style="background:var(--s2)">' +
            '<th style="text-align:left;padding:8px 10px;font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase">Employee</th>' +
            Object.keys(HRM.LEAVE_TYPES).filter(function (t) { return t !== 'LOP'; }).map(function (t) {
              return '<th style="padding:8px 10px;font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase;text-align:center">' +
                esc(HRM.LEAVE_TYPES[t].label.split(' ')[0]) + '</th>';
            }).join('') +
          '</tr></thead><tbody>' +
          STATE.employees.map(function (e) {
            return '<tr style="border-bottom:1px solid var(--b1)">' +
              '<td style="padding:8px 10px;font-size:12.5px;font-weight:600">' + esc(e.name) + '</td>' +
              Object.keys(HRM.LEAVE_TYPES).filter(function (t) { return t !== 'LOP'; }).map(function (t) {
                var b = balances.find(function (x) { return x.employeeId === e.id && x.type === t; });
                if (!b) return '<td style="text-align:center;font-size:12px;color:var(--t4)">\u2014</td>';
                var avail = b.entitled - b.used - b.pending;
                return '<td style="text-align:center;padding:8px 10px">' +
                  '<span style="font-family:var(--mono);font-size:12.5px;font-weight:700;color:' +
                    (avail <= 0 ? 'var(--red)' : avail <= 2 ? 'var(--amber)' : 'var(--t1)') + '">' + avail + '</span>' +
                  '<span style="font-size:10.5px;color:var(--t3)"> / ' + b.entitled + '</span>' +
                  (b.pending ? '<div style="font-size:9.5px;color:var(--amber)">' + b.pending + ' pending</div>' : '') +
                '</td>';
              }).join('') +
            '</tr>';
          }).join('') +
        '</tbody></table></div>' +
      '</div>';
  });
}

function hrSetLeaveFilter(f) { HR_LEAVE_FILTER = f; hrRenderPane(); }

function hrApproveLeave(id) {
  HRM.approveLeave(id).then(function () {
    syncState(); hrRenderPane(); renderNotifications();
    toast('Leave approved', 'success');
  }).catch(function (e) { toast(e.message, 'error'); });
}

function hrRejectLeave(id) {
  openModal('Decline leave request',
    '<div class="form-group"><label class="form-label">Reason *</label>' +
    '<textarea class="form-textarea" id="hr-rej" rows="3" placeholder="Employee ko yahi dikhega"></textarea>' +
    '<div class="form-error" id="hr-rej-err">A reason is required</div></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-danger" onclick="hrConfirmRejectLeave(\'' + id + '\')">Decline</button>');
}
function hrConfirmRejectLeave(id) {
  var reason = (document.getElementById('hr-rej') || {}).value;
  HRM.rejectLeave(id, reason).then(function () {
    closeModal(); syncState(); hrRenderPane(); renderNotifications();
    toast('Request declined', 'success');
  }).catch(function (e) {
    if (e.code === 'VALIDATION') document.getElementById('hr-rej-err').classList.add('show');
    else toast(e.message, 'error');
  });
}

function hrApproveReg(id) {
  HRM.approveRegularisation(id).then(function () {
    syncState(); hrRenderPane(); toast('Attendance regularised', 'success');
  }).catch(function (e) { toast(e.message, 'error'); });
}
function hrRejectReg(id) {
  openModal('Decline regularisation',
    '<div class="form-group"><label class="form-label">Reason *</label>' +
    '<textarea class="form-textarea" id="hr-rreg" rows="3"></textarea>' +
    '<div class="form-error" id="hr-rreg-err">A reason is required</div></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-danger" onclick="hrConfirmRejectReg(\'' + id + '\')">Decline</button>');
}
function hrConfirmRejectReg(id) {
  HRM.rejectRegularisation(id, (document.getElementById('hr-rreg') || {}).value).then(function () {
    closeModal(); syncState(); hrRenderPane(); toast('Request declined', 'success');
  }).catch(function (e) {
    if (e.code === 'VALIDATION') document.getElementById('hr-rreg-err').classList.add('show');
    else toast(e.message, 'error');
  });
}

function hrOpenApplyLeave() {
  var types = Object.keys(HRM.LEAVE_TYPES);
  openModal('Apply leave on behalf',
    '<div class="form-group"><label class="form-label">Employee *</label>' +
      '<select class="form-select" id="al-emp">' +
        STATE.employees.map(function (e) { return '<option value="' + e.id + '">' + esc(e.name) + '</option>'; }).join('') +
      '</select></div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">Leave type *</label>' +
        '<select class="form-select" id="al-type">' +
          types.map(function (t) { return '<option value="' + t + '">' + esc(HRM.LEAVE_TYPES[t].label) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Duration</label>' +
        '<select class="form-select" id="al-half">' +
          '<option value="FULL">Full day(s)</option>' +
          '<option value="FIRST_HALF">First half</option>' +
          '<option value="SECOND_HALF">Second half</option>' +
        '</select></div>' +
    '</div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">From *</label>' +
        '<input class="form-input" type="date" id="al-from" value="' + Utils.isoDate(new Date()) + '"></div>' +
      '<div class="form-group"><label class="form-label">To *</label>' +
        '<input class="form-input" type="date" id="al-to" value="' + Utils.isoDate(new Date()) + '"></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Reason *</label>' +
      '<textarea class="form-textarea" id="al-reason" rows="2"></textarea></div>',
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="hrSubmitLeave()">Apply</button>');
}

function hrSubmitLeave() {
  HRM.applyLeave({
    employeeId: parseInt((document.getElementById('al-emp') || {}).value),
    type: (document.getElementById('al-type') || {}).value,
    halfDay: (document.getElementById('al-half') || {}).value,
    fromDate: (document.getElementById('al-from') || {}).value,
    toDate: (document.getElementById('al-to') || {}).value,
    reason: (document.getElementById('al-reason') || {}).value
  }).then(function (req) {
    return HRM.approveLeave(req.id, 'Applied and approved by admin');
  }).then(function () {
    closeModal(); syncState(); hrRenderPane();
    toast('Leave applied and approved', 'success');
  }).catch(function (e) { toast(e.message, 'error'); });
}

/* ══════════════════════════ TIMESHEETS ══════════════════════════ */
function hrRenderTimesheets(pane) {
  var empId = HR_TS_EMP;
  HRM.getTimesheet(empId).then(function (ts) {
    var who = empId ? (STATE.employees.find(function (e) { return e.id === empId; }) || {}).name : 'Whole team';

    pane.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">' +
        '<select class="form-select" style="width:auto;min-width:190px" onchange="hrSetTsEmp(this.value)">' +
          '<option value="">Whole team</option>' +
          STATE.employees.map(function (e) {
            return '<option value="' + e.id + '"' + (empId === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>';
          }).join('') +
        '</select>' +
        '<span style="font-size:12px;color:var(--t3)">' + fmtDate(ts.from) + ' \u2192 ' + fmtDate(ts.to) + '</span>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px">' +
        [['Kul time', Schema.TIME.fmtShort(ts.totalSecs), 'var(--t1)'],
         ['Client ka kaam', Schema.TIME.fmtShort(ts.billableSecs), 'var(--green)'],
         ['Andar ka kaam', Schema.TIME.fmtShort(ts.nonBillableSecs), 'var(--amber)'],
         ['Kisi kaam pe nahi laga', Schema.TIME.fmtShort(ts.overheadSecs), 'var(--t2)'],
         ['Client kaam ka hissa' + Glossary.helpIcon('utilisation'), ts.utilisationPct + '%',
          ts.utilisationPct >= 70 ? 'var(--green)' : ts.utilisationPct >= 50 ? 'var(--amber)' : 'var(--red)']
        ].map(function (s) {
          return '<div class="stat-card"><div class="stat-label">' + s[0] + '</div>' +
            '<div class="stat-value" style="font-size:19px;color:' + s[2] + '">' + s[1] + '</div></div>';
        }).join('') +
      '</div>' +

      '<div class="card card-pad">' +
        '<div class="section-header"><div><div class="section-title">Time kahan gaya</div>' +
        '<div class="section-sub">' + esc(who) + '</div></div></div>' +
        (ts.projects.length ? ts.projects.map(function (p) {
          var pct = ts.totalSecs ? Math.round(p.secs / ts.totalSecs * 100) : 0;
          return '<div style="padding:12px 0;border-bottom:1px solid var(--b1)">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">' +
              '<div style="flex:1;min-width:0">' +
                '<div style="font-size:13px;font-weight:600">' + esc(p.projectName) +
                  (p.billable ? '' : '<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:99px;' +
                    'background:var(--s2);color:var(--t3);margin-left:6px">non-billable</span>') + '</div>' +
                '<div style="font-size:11.5px;color:var(--t3)">' + esc(p.clientName || '\u2014') + '</div>' +
              '</div>' +
              '<span style="font-family:var(--mono);font-size:13px;font-weight:700">' +
                Schema.TIME.fmtShort(p.secs) + '</span>' +
              '<span style="font-size:11px;color:var(--t3);width:34px;text-align:right">' + pct + '%</span>' +
            '</div>' +
            '<div style="height:5px;background:var(--s2);border-radius:99px;overflow:hidden;margin-bottom:8px">' +
              '<div style="height:100%;width:' + pct + '%;background:' +
                (p.billable ? 'var(--green)' : 'var(--t4)') + ';border-radius:99px"></div></div>' +
            p.deliverables.slice(0, 4).map(function (d) {
              var over = d.estimateSecs && d.secs > d.estimateSecs;
              return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0 3px 12px;font-size:11.5px">' +
                '<span style="color:var(--t3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                  esc(d.title) + '</span>' +
                '<span style="font-family:var(--mono);color:' + (over ? 'var(--red)' : 'var(--t2)') + '">' +
                  Schema.TIME.fmtShort(d.secs) +
                  (d.estimateSecs ? ' / ' + Schema.TIME.fmtShort(d.estimateSecs) : '') + '</span>' +
              '</div>';
            }).join('') +
          '</div>';
        }).join('')
        : '<div class="empty-teach"><div class="empty-teach-icon">\u23F1\uFE0F</div>' +
          '<div class="empty-teach-title">No time tracked yet</div>' +
          '<div class="empty-teach-body">Employee jab apne app mein kisi task ka timer chalata hai, ' +
          'wo time yahan project-wise dikhta hai \u2014 aur wahi profitability ka cost banta hai.</div></div>') +
      '</div>';
  });
}
function hrSetTsEmp(v) { HR_TS_EMP = v ? parseInt(v) : null; hrRenderPane(); }

/* ══════════════════════════ CAPACITY ══════════════════════════ */
function hrRenderCapacity(pane) {
  HRM.getUtilisation().then(function (u) {
    var loadTone = {
      OVERLOADED: ['var(--red)', '#FEF2F2', 'Bahut kaam hai'],
      BUSY:       ['var(--amber)', '#FFFBEB', 'Busy hai'],
      AVAILABLE:  ['var(--green)', '#ECFDF5', 'Thoda kaam de sakte ho'],
      FREE:       ['var(--t3)', 'var(--s2)', 'Khali hai']
    };
    var over = u.rows.filter(function (r) { return r.load === 'OVERLOADED'; });
    var free = u.rows.filter(function (r) { return r.load === 'FREE' || r.load === 'AVAILABLE'; });

    pane.innerHTML =
      '<div style="font-size:12px;color:var(--t3);margin-bottom:14px">' +
        'Last ' + u.workingDays + ' working days \u00b7 ' + fmtDate(u.from) + ' \u2192 ' + fmtDate(u.to) +
      '</div>' +

      (over.length ?
        '<div style="padding:12px 16px;background:#FEF2F2;border-radius:var(--r10);margin-bottom:16px;font-size:13px;color:#991B1B">' +
          '<strong>' + esc(over.map(function (r) { return r.name.split(' ')[0]; }).join(', ')) +
          ' pe zyada kaam hai</strong> \u2014 jitna time hai usse zyada kaam de diya gaya hai.' +
          (free.length ? ' Inko de sakte ho: ' +
            esc(free.slice(0, 3).map(function (r) { return r.name.split(' ')[0]; }).join(', ')) + '.' : '') +
        '</div>' : '') +

      '<div class="card card-pad">' +
        '<div class="section-header"><div><div class="section-title">Kis pe kitna kaam hai</div>' +
        '<div class="section-sub">Billable utilisation' + Glossary.helpIcon('utilisation', 11) +
        ' and committed work' + Glossary.helpIcon('committedAhead', 11) + '</div></div></div>' +
        u.rows.map(function (r) {
          var lt = loadTone[r.load];
          var utilPct = Math.min(100, r.utilisationPct);
          var commitPct = r.capacitySecs ? Math.min(140, Math.round(r.committedSecs / r.capacitySecs * 100)) : 0;
          return '<div style="padding:12px 0;border-bottom:1px solid var(--b1)">' +
            '<div style="display:flex;align-items:center;gap:11px;margin-bottom:8px">' +
              '<div class="avatar avatar-sm" style="background:' + r.avatarBg + ';color:' + r.avatarFg + '">' +
                esc(r.avatarInitials) + '</div>' +
              '<div style="flex:1;min-width:0">' +
                '<div style="font-size:13px;font-weight:600">' + esc(r.name) + '</div>' +
                '<div style="font-size:11.5px;color:var(--t3)">' + esc(r.role) + ' \u00b7 ' +
                  r.openDeliverables + ' open</div>' +
              '</div>' +
              '<span style="font-size:11px;font-weight:600;padding:2px 9px;border-radius:99px;' +
                'background:' + lt[1] + ';color:' + lt[0] + ';flex-shrink:0">' + lt[2] + '</span>' +
            '</div>' +
            '<div style="display:flex;gap:14px;font-size:11px;color:var(--t3);margin-bottom:5px">' +
              '<span>Client kaam mein <strong style="color:' +
                (utilPct >= 70 ? 'var(--green)' : utilPct >= 50 ? 'var(--amber)' : 'var(--red)') +
                '">' + r.utilisationPct + '%</strong> time</span>' +
              '<span>Aage <strong style="color:var(--t1)">' + r.committedDays + ' din</strong> ka kaam pada hai</span>' +
            '</div>' +
            '<div style="display:flex;gap:6px;align-items:center">' +
              '<div style="flex:1;height:6px;background:var(--s2);border-radius:99px;overflow:hidden">' +
                '<div style="height:100%;width:' + utilPct + '%;background:' +
                  (utilPct >= 70 ? 'var(--green)' : utilPct >= 50 ? 'var(--amber)' : 'var(--red)') +
                  ';border-radius:99px"></div></div>' +
              '<div style="flex:1;height:6px;background:var(--s2);border-radius:99px;overflow:hidden">' +
                '<div style="height:100%;width:' + Math.min(100, commitPct) + '%;background:' + lt[0] +
                  ';border-radius:99px"></div></div>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
  });
}

/* ══════════════════════════ HOLIDAYS ══════════════════════════ */
function hrOpenHolidays() {
  HRM.getHolidays().then(function (list) {
    openPanel('Holiday calendar',
      '<div style="margin-bottom:16px">' +
        list.map(function (h) {
          return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--b1)">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:13px;font-weight:600">' + esc(h.name) +
                (h.optional ? '<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:99px;' +
                  'background:var(--s2);color:var(--t3);margin-left:6px">optional</span>' : '') + '</div>' +
              '<div style="font-size:11.5px;color:var(--t3)">' + fmtDate(h.date) + ' \u00b7 ' +
                new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' }) + '</div>' +
            '</div>' +
            '<button class="icon-btn" style="color:var(--red)" onclick="hrDeleteHoliday(\'' + h.id + '\')">\u2715</button>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div style="border-top:1px solid var(--b1);padding-top:14px">' +
        '<div class="form-group"><label class="form-label">Holiday name</label>' +
          '<input class="form-input" id="hol-name" placeholder="e.g. Ganesh Chaturthi"></div>' +
        '<div class="form-group"><label class="form-label">Date</label>' +
          '<input class="form-input" type="date" id="hol-date"></div>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer">' +
          '<input type="checkbox" id="hol-opt"> Optional (employees may choose to work)</label>' +
      '</div>',
      '<button class="btn btn-secondary" onclick="closePanel()">Close</button>' +
      '<button class="btn btn-primary" onclick="hrAddHoliday()">Add holiday</button>');
  });
}
function hrAddHoliday() {
  HRM.addHoliday({
    name: (document.getElementById('hol-name') || {}).value,
    date: (document.getElementById('hol-date') || {}).value,
    optional: !!(document.getElementById('hol-opt') || {}).checked
  }).then(function () {
    hrOpenHolidays(); hrRenderPane(); toast('Holiday added', 'success');
  }).catch(function (e) { toast(e.message, 'error'); });
}
function hrDeleteHoliday(id) {
  HRM.deleteHoliday(id).then(function () { hrOpenHolidays(); hrRenderPane(); });
}

/* ══════════════════════════ EXPORT ══════════════════════════ */
function hrExportRegister() {
  HRM.getRegister(HR_REG.year, HR_REG.month).then(function (reg) {
    var head = ['Employee'].concat(reg.days.map(function (d) { return d.day; }))
      .concat(['Payable days', 'Working days', 'Attendance %', 'Total hours', 'Late days']);
    var rows = reg.rows.map(function (r) {
      return [r.name].concat(r.cells.map(function (c) { return c.code || '-'; }))
        .concat([r.summary.payableDays, r.summary.workingDays, r.summary.attendancePct + '%',
                 (r.summary.totalSecs / 3600).toFixed(1), r.summary.late]);
    });
    var csv = [head].concat(rows)
      .map(function (r) {
        return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
      }).join('\n');

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'attendance-' + reg.year + '-' + String(reg.month + 1).padStart(2, '0') + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Register exported', 'success');
  });
}
