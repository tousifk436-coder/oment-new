// ══════════════════════════════════════════════
// ATTENDANCE
// ══════════════════════════════════════════════

function tickAtt(){
  var att=todayAtt();att.total++;
  if(ws&&!onBrk){
    if(trun){att.active++;
      var a=TASKS.find(function(t){return t.active;});
      if(a){if(!att.taskTime)att.taskTime={};att.taskTime[a.id]=(att.taskTime[a.id]||0)+1;}
    }else{att.idle++;}
  }
  att.logout=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false});
  updAtt();updWP();
}

function updAtt(){
  var att=todayAtt();var h=att.active;
  var col=h>=21600?'var(--green)':h>=10800?'var(--amber)':'var(--red)';
  var dot=document.getElementById('att-dot');if(dot)dot.style.background=col;
  var hrs=document.getElementById('att-hrs');if(hrs)hrs.textContent='Today: '+fmtSh(h);
}

function rAtt(){
  var el=document.getElementById('att-body');if(!el)return;
  var att=todayAtt();
  var workSecs=att.active||0;
  var sessSecs=att.total||0;
  var idleSecs=att.idle||0;
  var pct=Math.min(100,Math.round(workSecs/28800*100));
  var d=new Date();
  var today=d.toISOString().split('T')[0];

  // ── 7-day strip ──
  var strip=Array.from({length:7},function(_,i){
    var dd=new Date();dd.setDate(dd.getDate()-6+i);
    var k=dd.toISOString().split('T')[0];
    var a=ATT_LOG.find(function(x){return x.date===k;});
    var w=a&&(a.active||0)>0;
    var isToday=k===today;
    return'<div style="flex:1;text-align:center;padding:8px 3px;border-radius:var(--r2);border:'+(isToday?'2px solid var(--blue)':'1px solid var(--b)')+';background:'+(w?'var(--gl)':isToday?'var(--bl)':'var(--sur)')+'">'+
      '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px">'+dd.toLocaleDateString('en-US',{weekday:'short'})+'</div>'+
      '<div style="width:7px;height:7px;border-radius:50%;background:'+(w?'var(--green)':isToday?'var(--blue)':'var(--t4)')+';margin:0 auto 3px"></div>'+
      '<div style="font-size:11px;font-family:var(--mono);font-weight:600;color:'+(w?'var(--glc)':isToday?'var(--blue)':'var(--t4)')+'">'+( isToday?fmtSh(workSecs):(w?fmtSh(a.active):'—'))+'</div>'+
    '</div>';
  }).join('');

  // ── Task time breakdown for today ──
  var taskBreakdown='';
  if(att.taskTime&&Object.keys(att.taskTime).length>0){
    var rows=Object.entries(att.taskTime)
      .sort(function(a,b){return b[1]-a[1];})
      .map(function(entry){
        var tid=entry[0],secs=entry[1];
        var t=TASKS.find(function(x){return x.id===parseInt(tid);});
        if(!t)return'';
        var pct2=workSecs>0?Math.round(secs/workSecs*100):0;
        return'<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--b)">'+
          '<div style="width:30px;height:30px;border-radius:var(--r2);background:'+(t.isSelfAssigned?'var(--pl)':'var(--bl)')+';display:flex;align-items:center;justify-content:center;flex-shrink:0">'+
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="'+(t.isSelfAssigned?'var(--purple)':'var(--blue)')+'" stroke-width="2" stroke-linecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'+
          '</div>'+
          '<div style="flex:1;min-width:0">'+
          '<div style="font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(t.title)+'</div>'+
          '<div style="font-size:11px;color:var(--t3)">'+(t.projectName||'No project')+(t.isSelfAssigned?' · Self':'')+'  </div>'+
          '</div>'+
          '<div style="text-align:right;flex-shrink:0">'+
          '<div style="font-family:var(--mono);font-size:13px;font-weight:700">'+fmtSh(secs)+'</div>'+
          '<div style="font-size:10.5px;color:var(--t3)">'+pct2+'% of today</div>'+
          '</div>'+
          '<div style="width:40px;height:4px;background:var(--s3);border-radius:99px;overflow:hidden;flex-shrink:0">'+
          '<div style="height:100%;width:'+pct2+'%;background:'+(t.isSelfAssigned?'var(--purple)':'var(--blue)')+';border-radius:99px"></div>'+
          '</div>'+
        '</div>';
      }).filter(Boolean).join('');
    if(rows){
      taskBreakdown='<div class="card" style="margin-bottom:14px">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
        '<div style="font-size:13px;font-weight:700">Today\'s Task Breakdown</div>'+
        '<span style="font-size:11.5px;color:var(--t3)">'+Object.keys(att.taskTime).length+' tasks</span>'+
        '</div>'+rows+'</div>';
    }
  }

  // ── Full attendance log table ──
  var pageSize=10;
  var totalRecs=ATT_LOG.length;
  var pageRecs=ATT_LOG.slice(0,pageSize);
  var logRows=pageRecs.map(function(a){
    var isT=a.date===today;
    var statusCol=a.status==='Present'?'var(--green)':a.status==='Half Day'?'var(--amber)':'var(--red)';
    var statusBg=a.status==='Present'?'var(--gl)':a.status==='Half Day'?'var(--al)':'var(--rl)';
    return'<tr onclick="showDayDetail(\''+a.date+'\')" style="cursor:pointer">'+
      '<td><span style="font-size:12.5px;font-weight:'+(isT?700:400)+'">'+new Date(a.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})+'</span>'+(isT?'<span style="font-size:10px;color:var(--blue);font-weight:600;margin-left:5px">Today</span>':'')+'</td>'+
      '<td style="font-size:12px;color:var(--t3)">'+new Date(a.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short'})+'</td>'+
      '<td style="font-family:var(--mono);font-size:12.5px">'+(a.login||'—')+'</td>'+
      '<td style="font-family:var(--mono);font-size:12.5px">'+(isT?(ws?'Active':a.logout||'—'):(a.logout||'—'))+'</td>'+
      '<td style="font-family:var(--mono);font-size:12.5px;font-weight:600">'+fmtSh(a.active||0)+'</td>'+
      '<td style="font-family:var(--mono);font-size:12px;color:var(--t3)">'+fmtSh(a.total||0)+'</td>'+
      '<td><span class="badge" style="background:'+statusBg+';color:'+statusCol+'">'+(a.status||'—')+'</span></td>'+
      '<td style="font-size:11.5px;color:var(--t3)">'+((a.breaks||[]).length>0?a.breaks.map(function(b){return b.type+'('+b.dur+'m)';}).join(', '):'—')+'</td>'+
    '</tr>';
  }).join('');

  var breaksHtml='';
  if((att.breaks||[]).length){
    breaksHtml='<div class="card" style="margin-bottom:14px">'+
      '<div style="font-size:13px;font-weight:700;margin-bottom:10px">Today\'s Breaks</div>'+
      att.breaks.map(function(b){
        return'<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b)">'+
          '<div style="width:7px;height:7px;border-radius:50%;background:var(--blue);flex-shrink:0"></div>'+
          '<div style="flex:1;font-size:12.5px;font-weight:500">'+b.type+'</div>'+
          '<div style="font-family:var(--mono);font-size:12px;color:var(--t3)">'+b.start+' → '+(b.end||'ongoing')+'</div>'+
          '<div style="font-size:12px;font-weight:600">'+(b.dur?b.dur+'m':'...')+'</div>'+
        '</div>';
      }).join('')+
    '</div>';
  }

  var workBtnHtml=!ws?
    '<button class="btn btn-green btn-full" onclick="startWork()">'+
    '<svg viewBox="0 0 24 24" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>Start Work Session</button>':
    '<button class="btn btn-full" onclick="endWork()" style="background:var(--rl);color:var(--red);border-color:rgba(220,38,38,.2)">'+
    '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>End Session</button>';

  el.innerHTML=
    '<div class="shd"><div class="stitle">Attendance</div></div>'+
    '<div class="sbar att-stats-4" style="margin-bottom:16px">'+
    '<div class="scard"><div class="sl">Work Today</div><div class="sv" style="color:'+(pct>=80?'var(--green)':pct>=40?'var(--blue)':'var(--amber)')+'">'+fmtSh(workSecs)+'</div><div class="ss">'+pct+'% of 8h</div></div>'+
    '<div class="scard"><div class="sl">Session</div><div class="sv" style="font-size:17px">'+fmtSh(sessSecs)+'</div><div class="ss">Total online</div></div>'+
    '<div class="scard"><div class="sl">Login Time</div><div class="sv" style="font-size:15px">'+(att.login||'—')+'</div><div class="ss">'+(att.logout||ws?'Active':'Not logged')+'</div></div>'+
    '<div class="scard"><div class="sl">Idle Time</div><div class="sv" style="font-size:17px;color:'+(idleSecs>3600?'var(--amber)':'var(--t2)')+'">'+fmtSh(idleSecs)+'</div><div class="ss">Inactive</div></div>'+
    '</div>'+
    '<div class="card" style="margin-bottom:14px;text-align:center;padding:22px 16px">'+
    '<svg width="130" height="130" viewBox="0 0 130 130">'+
    '<circle cx="65" cy="65" r="52" fill="none" stroke="var(--s3)" stroke-width="10"/>'+
    '<circle cx="65" cy="65" r="52" fill="none" stroke="'+(pct>=80?'var(--green)':pct>=40?'var(--blue)':'var(--amber)')+'" stroke-width="10" stroke-dasharray="'+(2*3.14159*52)+'" stroke-dashoffset="'+(2*3.14159*52*(1-pct/100))+'" stroke-linecap="round" transform="rotate(-90 65 65)" style="transition:stroke-dashoffset .5s"/>'+
    '<text x="65" y="60" text-anchor="middle" font-family="monospace" font-size="20" font-weight="700" fill="var(--t1)">'+fmtSh(workSecs)+'</text>'+
    '<text x="65" y="74" text-anchor="middle" font-family="sans-serif" font-size="11" fill="var(--t3)">work time</text>'+
    '<text x="65" y="88" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="'+(pct>=80?'var(--green)':pct>=40?'var(--blue)':'var(--amber)')+'">'+pct+'% of 8h goal</text>'+
    '</svg>'+
    '<div style="font-size:13.5px;font-weight:700;margin-top:6px">'+(CU?CU.name:'')+'</div>'+
    '<div style="font-size:12px;color:var(--t3)">'+d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})+'</div>'+
    (att.login?'<div style="margin-top:8px;display:inline-flex;align-items:center;gap:8px;padding:6px 14px;background:var(--s2);border-radius:99px;font-size:12px">'+
      '<span style="color:var(--t3)">Logged in:</span>'+
      '<span style="font-family:var(--mono);font-weight:600">'+att.login+'</span>'+
      (att.logout||ws?'<span style="color:var(--t3)">→ '+(ws?'<span style="color:var(--green);font-weight:600">Active now</span>':att.logout)+'</span>':'')+'</div>':'')+
    '</div>'+
    '<div class="card" style="margin-bottom:14px"><div style="font-size:13px;font-weight:700;margin-bottom:10px">This Week</div><div style="display:flex;gap:5px">'+strip+'</div></div>'+
    taskBreakdown+
    '<div class="card" style="margin-bottom:14px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-size:13px;font-weight:700">Attendance Log</div><span style="font-size:11.5px;color:var(--t3)">'+totalRecs+' records</span></div>'+
    '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">'+
    '<table style="width:100%;border-collapse:collapse;min-width:520px">'+
    '<thead><tr style="background:var(--s2)">'+
    '<th style="text-align:left;padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--t3);white-space:nowrap">Date</th>'+
    '<th style="text-align:left;padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--t3)">Day</th>'+
    '<th style="text-align:left;padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--t3)">Login</th>'+
    '<th style="text-align:left;padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--t3)">Logout</th>'+
    '<th style="text-align:left;padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--t3)">Work Hrs</th>'+
    '<th style="text-align:left;padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--t3)">Total</th>'+
    '<th style="text-align:left;padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--t3)">Status</th>'+
    '<th style="text-align:left;padding:8px 10px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--t3)">Breaks</th>'+
    '</tr></thead>'+
    '<tbody>'+(logRows||'<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--t3)">No records yet</td></tr>')+'</tbody>'+
    '</table></div></div>'+
    breaksHtml+
    '<div style="display:flex;gap:10px;margin-top:4px">'+workBtnHtml+'</div>';
}

function showDayDetail(dateStr){
  var a=ATT_LOG.find(function(x){return x.date===dateStr;});if(!a)return;
  var d=new Date(dateStr);
  var tasks=TASKS.filter(function(t){return((a.tasks||[]).indexOf(t.id)>=0);});
  showDlg(
    d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'+
      '<div style="background:var(--s2);border-radius:var(--r2);padding:10px 12px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">Login</div><div style="font-size:14px;font-weight:700;font-family:var(--mono)">'+(a.login||'—')+'</div></div>'+
      '<div style="background:var(--s2);border-radius:var(--r2);padding:10px 12px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">Logout</div><div style="font-size:14px;font-weight:700;font-family:var(--mono)">'+(a.logout||(a.date===new Date().toISOString().split('T')[0]?'Active':'—'))+'</div></div>'+
      '<div style="background:var(--gl);border-radius:var(--r2);padding:10px 12px"><div style="font-size:10px;color:var(--glc);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">Work Hours</div><div style="font-size:14px;font-weight:700;color:var(--green);font-family:var(--mono)">'+fmtSh(a.active||0)+'</div></div>'+
      '<div style="background:var(--s2);border-radius:var(--r2);padding:10px 12px"><div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">Total Online</div><div style="font-size:14px;font-weight:700;font-family:var(--mono)">'+fmtSh(a.total||0)+'</div></div>'+
    '</div>'+
    ((a.breaks||[]).length?'<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:7px">Breaks ('+a.breaks.length+')</div>'+
      a.breaks.map(function(b){return'<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--b)"><span style="font-weight:500">'+b.type+'</span><span style="font-family:var(--mono);color:var(--t3)">'+b.start+'→'+(b.end||'?')+' ('+(b.dur||b.durationMins||b.m||'?')+'m)</span></div>';}).join('')+
    '</div>':'')+
    (tasks.length?'<div><div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:7px">Tasks Worked ('+tasks.length+')</div>'+
      tasks.map(function(t){return'<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b)">'+
        '<span class="badge '+(t.status==='approved'?'b-app':t.status==='rejected'?'b-rej':t.status==='submitted'?'b-ir':'b-ip')+'" style="font-size:10px">'+t.status+'</span>'+
        '<span style="font-size:12.5px;flex:1">'+esc(t.title)+'</span>'+
        (a.taskTime&&a.taskTime[t.id]?'<span style="font-family:var(--mono);font-size:12px;color:var(--t3)">'+fmtSh(a.taskTime[t.id])+'</span>':'')+
      '</div>';}).join('')+
    '</div>':'')+
    '<div style="margin-top:10px;padding:8px 12px;background:var(--s2);border-radius:var(--r2);font-size:12px;color:var(--t3)">'+
      '<span class="badge" style="background:'+(a.status==='Present'?'var(--gl)':a.status==='Half Day'?'var(--al)':'var(--rl)')+';color:'+(a.status==='Present'?'var(--glc)':a.status==='Half Day'?'var(--alc)':'var(--rlc)')+'">'+( a.status||'—')+'</span>'+
    '</div>',
    null,'','Close'
  );
  document.getElementById('dlg-ok').textContent='Close';
  document.getElementById('dlg-ok').onclick=function(){closeDlg();};
  document.getElementById('dlg-cancel').style.display='none';
}
