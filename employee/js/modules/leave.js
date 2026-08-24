// ══════════════════════════════════════════════
// LEAVE & REGULARISATION (employee side)
// ══════════════════════════════════════════════
// Employee apna leave apply karta hai, balance dekhta hai, aur missed punch
// regularise karta hai. Approval admin ke People module mein jaata hai —
// dono ek hi shared/hrm.js use karte hain.

var _lvType = 'CL';
var _lvHalf = 'FULL';

function rLeave(){
  var el = document.getElementById('leave-body');
  if(!el || !CU) return;
  el.innerHTML = '<div class="empty">Loading…</div>';

  Promise.all([
    HRM.getBalances(CU.id),
    HRM.getLeaveRequests({employeeId: CU.id}),
    HRM.getRegularisations({employeeId: CU.id}),
    HRM.getHolidays()
  ]).then(function(res){
    var balances = res[0], reqs = res[1], regs = res[2], holidays = res[3];
    var todayIso = Utils.isoDate(new Date());
    var upcoming = holidays.filter(function(h){ return h.date >= todayIso; }).slice(0,3);

    var html = '<div class="shd"><div><div class="stitle">Leave</div>' +
      '<div class="ssub">Balances, requests and attendance corrections</div></div>' +
      '<button class="btn btn-solid btn-sm" onclick="oApplyLeave()">Apply Leave</button></div>';

    // ── Balance cards ──
    var shown = balances.filter(function(b){ return b.type !== 'LOP'; });
    html += '<div class="sbar" style="grid-template-columns:repeat(' + Math.min(4, shown.length) + ',1fr)">';
    shown.forEach(function(b){
      var lt = HRM.LEAVE_TYPES[b.type] || {label:b.type, color:'var(--t3)'};
      var avail = b.entitled - b.used - b.pending;
      var help = b.type === 'CL' ? Glossary.helpIcon('proRatedLeave', 11) : '';
      var col = avail <= 0 ? 'var(--red)' : avail <= 2 ? 'var(--amber)' : 'var(--green)';
      html += '<div class="scard">' +
        '<div class="sl">' + esc(lt.label) + help + '</div>' +
        '<div class="sv" style="color:' + col + '">' + avail + '</div>' +
        '<div class="ss">of ' + b.entitled + (b.pending ? ' · ' + b.pending + ' pending' : '') + '</div>' +
      '</div>';
    });
    html += '</div>';

    // ── Upcoming holidays ──
    if(upcoming.length){
      html += '<div class="card" style="margin-bottom:14px">' +
        '<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:9px">'+ICON('calendar',11)+' Upcoming holidays</div>';
      upcoming.forEach(function(h){
        var d = new Date(h.date + 'T00:00:00');
        var away = Math.round((d - new Date(todayIso + 'T00:00:00')) / 86400000);
        html += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--b)">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:12.5px;font-weight:600">' + esc(h.name) +
              (h.optional ? '<span class="badge" style="font-size:9.5px;margin-left:6px;background:var(--s2);color:var(--t3)">optional</span>' : '') + '</div>' +
            '<div style="font-size:11px;color:var(--t3)">' + fmtDate(h.date) + ' · ' +
              d.toLocaleDateString('en-IN',{weekday:'long'}) + '</div>' +
          '</div>' +
          '<span style="font-size:11.5px;color:var(--t3);flex-shrink:0">' +
            (away === 0 ? 'Today' : 'in ' + away + 'd') + '</span>' +
        '</div>';
      });
      html += '</div>';
    }

    // ── Regularisation ──
    var pendingRegs = regs.filter(function(r){ return r.status === 'PENDING'; });
    html += '<div class="card" style="margin-bottom:14px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
        '<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px">\u23F1 Attendance corrections' + Glossary.helpIcon('regularisation', 11) + '</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="oRegularise()">Request correction</button>' +
      '</div>';
    if(regs.length){
      regs.slice(0,4).forEach(function(r){
        var tone = r.status === 'APPROVED' ? ['var(--glc)','var(--gl)']
                 : r.status === 'REJECTED' ? ['var(--rlc)','var(--rl)']
                 : ['var(--alc)','var(--al)'];
        html += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--b)">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:12.5px;font-weight:600">' + fmtDate(r.date) + '</div>' +
            '<div style="font-size:11px;color:var(--t3)">' + esc(r.reason) + '</div>' +
            (r.decisionNote ? '<div style="font-size:11px;color:var(--red);margin-top:2px">' + esc(r.decisionNote) + '</div>' : '') +
          '</div>' +
          '<span class="badge" style="background:' + tone[1] + ';color:' + tone[0] + ';font-size:10.5px">' +
            esc(HRM.LEAVE_STATUS[r.status].label) + '</span>' +
        '</div>';
      });
    } else {
      html += '<div style="font-size:12.5px;color:var(--t3);padding:6px 0">Punch bhool gaye kisi din? Yahan se correction maang lo.</div>';
    }
    html += '</div>';

    // ── Request history ──
    html += '<div style="font-size:13px;font-weight:700;margin-bottom:9px">My requests</div>';
    if(!reqs.length){
      html += '<div class="empty">'+Icons.badge('umbrella',{tone:'neutral',box:40,size:20})+'<div>No leave requests yet</div></div>';
    } else {
      reqs.forEach(function(r){
        var lt = HRM.LEAVE_TYPES[r.type] || {label:r.type, color:'var(--t3)'};
        var tone = r.status === 'APPROVED' ? ['var(--glc)','var(--gl)']
                 : r.status === 'REJECTED' ? ['var(--rlc)','var(--rl)']
                 : r.status === 'CANCELLED' ? ['var(--t3)','var(--s2)']
                 : ['var(--alc)','var(--al)'];
        var canCancel = r.status === 'PENDING' ||
          (r.status === 'APPROVED' && r.fromDate > todayIso);

        html += '<div class="card-sm" style="margin-bottom:9px;border-left:3px solid ' + lt.color + '">' +
          '<div style="display:flex;align-items:flex-start;gap:10px">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:3px">' +
                '<span style="font-size:13px;font-weight:700">' + esc(lt.label) + '</span>' +
                '<span class="badge" style="background:' + tone[1] + ';color:' + tone[0] + ';font-size:10.5px">' +
                  esc(HRM.LEAVE_STATUS[r.status].label) + '</span>' +
              '</div>' +
              '<div style="font-size:12px;color:var(--t2);margin-bottom:3px">' +
                fmtDate(r.fromDate) + (r.fromDate !== r.toDate ? ' → ' + fmtDate(r.toDate) : '') +
                ' · <strong>' + r.days + ' day' + (r.days === 1 ? '' : 's') + '</strong>' +
                (r.halfDay !== 'FULL' ? ' (half)' : '') + '</div>' +
              '<div style="font-size:12px;color:var(--t3)">' + esc(r.reason) + '</div>' +
              (r.decisionNote ? '<div style="font-size:11.5px;color:' + tone[0] +
                ';margin-top:5px;padding:6px 9px;background:' + tone[1] + ';border-radius:var(--r2)">' +
                esc(r.decisionNote) + '</div>' : '') +
            '</div>' +
            (canCancel ? '<button class="btn btn-ghost btn-sm" style="flex-shrink:0" onclick="cancelLeave(\'' +
              escJs(r.id) + '\')">Cancel</button>' : '') +
          '</div>' +
        '</div>';
      });
    }

    el.innerHTML = html;
    updLeaveBadge(reqs);
  }).catch(function(err){
    el.innerHTML = '<div class="empty">'+Icons.badge('alert-triangle',{tone:'amber',box:40,size:20})+'<div>' + esc(err.message || 'Could not load leave data') + '</div></div>';
  });
}

function updLeaveBadge(reqs){
  var pending = (reqs || []).filter(function(r){ return r.status === 'PENDING'; }).length;
  var b = document.getElementById('nb-lv');
  if(b){ b.textContent = pending || ''; b.style.display = pending > 0 ? 'flex' : 'none'; }
}

// ── Apply leave ──
function oApplyLeave(){
  _lvType = 'CL'; _lvHalf = 'FULL';
  var today = Utils.isoDate(new Date());
  var types = Object.keys(HRM.LEAVE_TYPES);

  oMod('Apply for Leave',
    '<div class="fg"><label class="fl">Leave type</label>' +
      '<div class="ptog" id="lv-type">' +
        types.map(function(t){
          var lt = HRM.LEAVE_TYPES[t];
          return '<button class="popt' + (t === 'CL' ? ' on' : '') + '" onclick="setLvType(this,\'' + t + '\')">' +
            esc(lt.label.split(' ')[0]) + '</button>';
        }).join('') +
      '</div>' +
      '<div style="font-size:11.5px;color:var(--t3);margin-top:6px" id="lv-bal">—</div>' +
    '</div>' +
    '<div class="frow" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<div class="fg"><label class="fl">From</label>' +
        '<input class="fin" type="date" id="lv-from" value="' + today + '" onchange="updLvPreview()"></div>' +
      '<div class="fg"><label class="fl">To</label>' +
        '<input class="fin" type="date" id="lv-to" value="' + today + '" onchange="updLvPreview()"></div>' +
    '</div>' +
    '<div class="fg"><label class="fl">Duration</label>' +
      '<div class="ptog" id="lv-half">' +
        '<button class="popt on" onclick="setLvHalf(this,\'FULL\')">Full day</button>' +
        '<button class="popt" onclick="setLvHalf(this,\'FIRST_HALF\')">First half</button>' +
        '<button class="popt" onclick="setLvHalf(this,\'SECOND_HALF\')">Second half</button>' +
      '</div></div>' +
    '<div class="fg"><label class="fl">Reason</label>' +
      '<textarea class="fta" id="lv-reason" placeholder="Kyun chahiye — approver ko yahi dikhega"></textarea></div>' +
    '<div id="lv-preview" style="font-size:12px;color:var(--t3);padding:9px 11px;background:var(--s2);border-radius:var(--r2)"></div>',
    [{l:'Cancel', cls:'btn-ghost', a:cMod},
     {l:'Submit Request', cls:'btn-solid', a:submitLeave}]);

  updLvBalance();
  updLvPreview();
}

function setLvType(el, t){
  setPT(el, 'lv-type');
  _lvType = t;
  updLvBalance();
  updLvPreview();
}
function setLvHalf(el, h){
  setPT(el, 'lv-half');
  _lvHalf = h;
  updLvPreview();
}

function updLvBalance(){
  var box = document.getElementById('lv-bal');
  if(!box || !CU) return;
  HRM.getBalances(CU.id).then(function(bs){
    var b = bs.find(function(x){ return x.type === _lvType; });
    if(!b){ box.textContent = _lvType === 'LOP' ? 'Loss of Pay — no balance needed' : 'No balance record'; return; }
    var avail = b.entitled - b.used - b.pending;
    box.innerHTML = '<strong style="color:' + (avail <= 0 ? 'var(--red)' : 'var(--t1)') + '">' +
      avail + '</strong> of ' + b.entitled + ' available' + (b.pending ? ' · ' + b.pending + ' already pending' : '');
  });
}

// Working days preview — weekend/holiday count nahi hote, ye pehle se dikha do
function updLvPreview(){
  var box = document.getElementById('lv-preview');
  if(!box) return;
  var from = (document.getElementById('lv-from') || {}).value;
  var to = (document.getElementById('lv-to') || {}).value;
  if(!from || !to){ box.textContent = 'Pick your dates'; return; }
  if(to < from){ box.innerHTML = '<span style="color:var(--red)">End date cannot be before start date</span>'; return; }

  var days = HRM.workingDaysBetween(from, to);
  var total = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  var skipped = total - days.length;

  if(!days.length){
    box.innerHTML = '<span style="color:var(--amber)">Selected range has no working days — weekends and holidays don\'t count.</span>';
    return;
  }
  var count = _lvHalf === 'FULL' ? days.length : 0.5;
  box.innerHTML = 'This will use <strong>' + count + ' day' + (count === 1 ? '' : 's') + '</strong>' +
    (skipped > 0 ? ' · ' + skipped + ' weekend/holiday day' + (skipped === 1 ? '' : 's') + ' skipped' : '');
}

function submitLeave(){
  if(!CU) return;
  HRM.applyLeave({
    employeeId: CU.id,
    type: _lvType,
    halfDay: _lvHalf,
    fromDate: (document.getElementById('lv-from') || {}).value,
    toDate: (document.getElementById('lv-to') || {}).value,
    reason: (document.getElementById('lv-reason') || {}).value
  }).then(function(){
    cMod();
    rLeave();
    toast('Leave request submitted', 'ok');
  }).catch(function(err){
    toast(err.message || 'Could not submit', 'err');
  });
}

function cancelLeave(id){
  sDlg('Cancel this request?', 'Balance wapas mil jaayega.', function(){
    HRM.cancelLeave(id).then(function(){
      rLeave();
      toast('Request cancelled');
    }).catch(function(err){ toast(err.message || 'Could not cancel', 'err'); });
  });
}

// ── Regularisation ──
function oRegularise(){
  var today = Utils.isoDate(new Date());
  oMod('Attendance Correction',
    '<div style="font-size:12.5px;color:var(--t3);margin-bottom:13px;line-height:1.55">' +
      'Punch karna bhool gaye ya system down tha? Sahi timing bata do — approver review karega.</div>' +
    '<div class="fg"><label class="fl">Date</label>' +
      '<input class="fin" type="date" id="rg-date" max="' + today + '" value="' + today + '"></div>' +
    '<div class="frow" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<div class="fg"><label class="fl">In time</label>' +
        '<input class="fin" type="time" id="rg-in" value="09:30"></div>' +
      '<div class="fg"><label class="fl">Out time</label>' +
        '<input class="fin" type="time" id="rg-out" value="18:30"></div>' +
    '</div>' +
    '<div class="fg"><label class="fl">Reason</label>' +
      '<textarea class="fta" id="rg-reason" placeholder="e.g. Client site pe tha, punch nahi kar paya"></textarea></div>',
    [{l:'Cancel', cls:'btn-ghost', a:cMod},
     {l:'Submit', cls:'btn-solid', a:submitRegularisation}]);
}

function submitRegularisation(){
  if(!CU) return;
  HRM.requestRegularisation({
    employeeId: CU.id,
    date: (document.getElementById('rg-date') || {}).value,
    inTime: (document.getElementById('rg-in') || {}).value,
    outTime: (document.getElementById('rg-out') || {}).value,
    reason: (document.getElementById('rg-reason') || {}).value
  }).then(function(){
    cMod();
    rLeave();
    toast('Correction request sent', 'ok');
  }).catch(function(err){
    toast(err.message || 'Could not submit', 'err');
  });
}
