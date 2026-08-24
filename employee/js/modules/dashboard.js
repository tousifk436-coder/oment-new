// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════

function rAll(){
  rDash();rProj();rTracker();updBadges();updWP();updAtt();
  /* Leave badge — pending requests ka count sidebar pe */
  if(CU&&typeof HRM!=='undefined'){
    HRM.getLeaveRequests({employeeId:CU.id}).then(updLeaveBadge).catch(function(){});
  }
}

function rDash(){
  var el=document.getElementById('dash');if(!el)return;
  var d=new Date(),hr=d.getHours();
  var greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  var name=CU?CU.name.split(' ')[0]:'';
  var pend=TASKS.filter(function(t){return t.status==='todo'||t.status==='inprogress';}).length;
  var appr=TASKS.filter(function(t){return t.status==='approved';}).length;
  var rej=TASKS.filter(function(t){return t.status==='rejected';}).length;
  var act=TASKS.find(function(t){return t.active;});
  var score=TASKS.length?Math.round(appr/TASKS.length*100):0;
  var html='';

  // Start work banner
  if(!ws){
    html+='<div style="background:var(--t1);border-radius:var(--r4);padding:20px;margin-bottom:16px;color:#fff">';
    html+='<div style="font-size:20px;font-weight:700;letter-spacing:-.5px;margin-bottom:4px">'+greet+', '+name+'</div>';
    html+='<div style="font-size:13px;opacity:.55;margin-bottom:'+(rej?'10px':'14px')+'">'+pend+' deliverables waiting · '+appr+' completed</div>';
    if(rej)html+='<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(220,38,38,.2);color:#FCA5A5;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;margin-bottom:12px">'+ICON('alert-triangle',12)+' '+rej+' rejected · resubmission needed</div><br>';
    html+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px">';
    html+='<button class="btn" style="background:rgba(255,255,255,.12);color:#fff;border-color:transparent;height:38px" onclick="startWork()"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>Kaam shuru karo</button>';
    html+='<span style="font-size:11.5px;opacity:.45">ya neeche kisi bhi kaam pe click karo</span></div></div>';
  }

  // Stats
  html+='<div class="sbar">';
  html+='<div class="scard"><div class="sl">Kul kaam</div><div class="sv">'+TASKS.filter(function(t){return!t.self;}).length+'</div><div class="ss">'+pend+' abhi baaki</div></div>';
  html+='<div class="scard"><div class="sl">Pass ho gaya</div><div class="sv" style="color:var(--green)">'+appr+'</div><div class="ss">ab tak</div></div>';
  html+='<div class="scard" style="cursor:pointer" onclick="nav(\'attendance\',document.querySelector(\'[data-v=attendance]\'))"><div class="sl">Aaj ka time</div><div class="sv" style="font-size:17px;color:'+(trun?'var(--green)':ws?'var(--amber)':'var(--t1)')+'" id="stat-time">'+fmtSh(tsecs)+'</div><div class="ss">'+(trun?'\u25CF Chal raha':ws?'Ruka hua':'Shuru nahi')+'</div></div>';
  html+='<div class="scard"><div class="sl">Score</div><div class="sv" style="color:var(--blue)">'+score+'</div><div class="ss">100 mein se</div></div>';
  html+='</div>';

  // Focus card
  if(!act||!ws){
    var next=TASKS.find(function(t){return t.status==='todo';});
    html+='<div class="card" style="margin-bottom:14px">';
    html+='<div style="width:40px;height:40px;border-radius:var(--r3);background:var(--s2);display:flex;align-items:center;justify-content:center;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>';
    html+='<div style="font-size:14px;font-weight:700;margin-bottom:3px">'+(ws?'Koi kaam chalu nahi hai':'Aapne abhi kaam shuru nahi kiya')+'</div>';
    html+='<div style="font-size:13px;color:var(--t3);margin-bottom:12px;line-height:1.6">'+(ws?'Neeche se koi kaam chuno \u2014 timer apne aap chalu ho jaayega':'Upar "Kaam shuru karo" dabao, ya seedha kisi kaam pe click kar do')+'</div>';
    if(next){
      var u2=urg(next.dms);
      html+='<div style="background:var(--s2);border-radius:var(--r3);padding:12px;cursor:pointer;border:1px solid var(--b)" onclick="'+(ws?'activateTask('+next.id+')':'startWork()')+'" onmouseover="this.style.background=\'var(--s3)\'" onmouseout="this.style.background=\'var(--s2)\'">';
      html+='<div style="font-size:10.5px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Ye agla karna chahiye</div>';
      html+='<div style="font-size:13px;font-weight:600;margin-bottom:5px">'+next.title+'</div>';
      html+='<div style="display:flex;gap:6px;align-items:center">'+pb(next.priority)+'<span class="'+u2.cls+'">'+u2.s+'</span><span style="font-size:11.5px;color:var(--t3)">'+next.proj+'</span></div>';
      if(ws)html+='<button class="btn btn-solid btn-sm" style="margin-top:10px">Ye kaam shuru karo \u2192</button>';
      html+='</div>';
    }
    html+='</div>';
  } else {
    var u=urg(act.dms),exp=act.exp||3600,diff=tsecs-exp;
    html+='<div class="fc">';
    html+='<div class="fc-ey"><div class="fc-pd '+(trun?'':onBrk?'b':'p')+'"></div>'+(onBrk?'ON BREAK':trun?'ACTIVE TASK':'PAUSED')+'</div>';
    html+='<div class="fc-t">'+act.title+'</div>';
    html+='<div class="fc-d">'+act.desc+'</div>';
    html+='<div class="fc-chips">';
    if(act.proj)html+='<span class="fc-chip">'+ICON('folder',11)+' '+act.proj+'</span>';
    if(act.ms)html+='<span class="fc-chip">'+ICON('flag',11)+' '+act.ms+'</span>';
    if(act.self)html+='<span class="fc-chip">'+ICON('edit',11)+' Self-assigned</span>';
    html+='</div>';
    var u=urg(act.dms);
    html+='<div class="fc-dl"><span style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:'+(u.cls==='u-urg'?'rgba(220,38,38,.15)':u.cls==='u-wrn'?'rgba(217,119,6,.15)':'rgba(5,150,105,.15)')+';color:'+(u.cls==='u-urg'?'#FCA5A5':u.cls==='u-wrn'?'#FCD34D':'#6EE7B7')+'">'+u.s+'</span></div>';
    html+='<div class="fc-timer" id="fc-timer">'+fmtMono(tsecs)+'</div>';
    html+='<div style="font-size:11px;color:rgba(255,255,255,.45);margin-bottom:6px">Expected vs actual \u2014 green matlab time bacha, red matlab over</div>';
    html+='<div class="fc-compare" id="fc-ctx">';
    var ov=diff>60,un=diff<-60;
    html+='<div class="fc-cc"><div class="fc-cc-l">Expected</div><div class="fc-cc-v">'+fmtSh(exp)+'</div></div>';
    html+='<div class="fc-sep"></div>';
    html+='<div class="fc-cc"><div class="fc-cc-l">Actual</div><div class="fc-cc-v '+(ov?'ov':un?'un':'')+'">'+fmtSh(tsecs)+'</div></div>';
    html+='<div class="fc-sep"></div>';
    html+='<div class="fc-cc"><div class="fc-cc-l">'+(ov?'Over':un?'Saved':'Status')+'</div><div class="fc-cc-v '+(ov?'ov':un?'un':'')+'">'+
      (Math.abs(diff)<60?ICON('check',13):(ov?'+':'-')+fmtSh(Math.abs(diff)))+'</div></div>';
    html+='</div>';
    html+='<div class="fc-acts">';
    html+='<button class="fcb fcb-w" onclick="toggleT()"><svg viewBox="0 0 24 24">'+(trun?'<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>':'<polygon points="5 3 19 12 5 21 5 3"/>')+'</svg>'+(trun?'Pause':'Resume')+'</button>';
    html+='<button class="fcb fcb-s" onclick="openDetail('+act.id+')">View Details</button>';
    html+='<button class="fcb fcb-g" onclick="openDetail('+act.id+')"><svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>Submit</button>';
    html+='</div></div>';
  }

  // Today task list
  var todayList=TASKS.filter(function(t){return t.status!=='approved';}).slice(0,6);
  html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px"><span style="font-size:13px;font-weight:700">Mere kaam</span><button class="btn btn-ghost btn-sm" onclick="nav(\'tracker\',document.querySelector(\'[data-v=tracker]\'))">Sab dekho \u2192</button></div>';
  if(todayList.length){
    todayList.forEach(function(t){
      var u=urg(t.dms);
      html+='<div class="tr '+(t.active?'arow ':'')+' '+(t.status==='rejected'?'rrow ':'')+'" onclick="openDetail('+t.id+')">';
      html+='<div class="tr-info"><div class="tr-t">'+t.title+(t.self?'<span class="badge b-self" style="font-size:10px">Self</span>':'')+(t.active?'<span style="font-size:10px;color:var(--blue);font-weight:600">● Active</span>':'')+'</div>';
      html+='<div class="tr-m">'+pb(t.priority)+'<span class="'+u.cls+'">'+u.s+'</span></div>';
      if(t.status==='rejected')html+='<div style="font-size:12px;color:var(--red);margin-top:3px;font-weight:500">'+ICON('alert-triangle',12)+' Ye wapas aaya hai \u2014 dobara karna hai</div>';
      html+='</div>'+sb(t.status)+'</div>';
    });
  } else {
    html+='<div style="text-align:center;padding:28px;color:var(--t3);background:var(--sur);border:1px solid var(--b);border-radius:var(--r4)">'+Icons.badge('check-circle',{tone:'green',box:44,size:22})+'<div style="font-weight:600;margin-top:8px">Sab kaam ho gaya!</div></div>';
  }

  el.innerHTML=html;
}
