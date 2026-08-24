// ══════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════

function rProj(){
  var el=document.getElementById('proj-list');if(!el)return;
  var html='';
  PROJECTS.forEach(function(p){
    var pct=p.progress||0;
    var sc=p.status==='Active'?'#059669':p.status==='Planning'?'#D97706':p.status==='Completed'?'#2563EB':'#9B9899';
    var scBg=p.status==='Active'?'#ECFDF5':p.status==='Planning'?'#FFFBEB':p.status==='Completed'?'#EFF6FF':'#F0EEE9';
    var priC=p.priority==='High'?'#DC2626':p.priority==='Medium'?'#D97706':'#059669';
    var priBg=p.priority==='High'?'#FEF2F2':p.priority==='Medium'?'#FFFBEB':'#ECFDF5';
    var headEmp=USERS.find(function(u){return u.id===p.head;})||{ini:'?',avBg:'#ccc',avFg:'#fff',name:'Unknown'};
    var team=p.team||[];
    var doneMs=(p.milestones||[]).filter(function(m){return m.status==='Done';}).length;
    var totalMs=(p.milestones||[]).length;
    var r=32,circ=2*Math.PI*r,dash=circ*pct/100;
    var ringC=pct>=80?'#059669':pct>=50?'#2563EB':'#D97706';
    var teamHtml='';
    team.slice(0,4).forEach(function(tid,i){
      var u=USERS.find(function(x){return x.id===tid;})||{ini:'?',avBg:'#E8E5DF',avFg:'#333'};
      teamHtml+='<div style="width:24px;height:24px;border-radius:50%;background:'+u.avBg+';color:'+u.avFg+';display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;margin-left:'+(i?'-5px':'0')+';border:2px solid #fff;flex-shrink:0">'+u.ini+'</div>';
    });
    if(team.length>4)teamHtml+='<div style="width:24px;height:24px;border-radius:50%;background:#E8E5DF;color:#5C5A60;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;margin-left:-5px;border:2px solid #fff">+'+(team.length-4)+'</div>';

    html+='<div onclick="openProj('+p.id+')" style="background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;overflow:hidden;cursor:pointer;transition:.15s;margin-bottom:14px" onmouseenter="this.style.boxShadow=\'0 4px 18px rgba(0,0,0,.1)\'" onmouseleave="this.style.boxShadow=\'\'">';
    html+='<div style="height:4px;background:'+sc+'"></div>';
    html+='<div style="padding:15px 16px">';
    html+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">';
    html+='<div style="min-width:0"><div style="font-size:14.5px;font-weight:700;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(p.name)+'</div>';
    html+='<div style="font-size:12px;color:#9B9899">'+esc(p.client)+'</div></div>';
    html+='<svg width="62" height="62" viewBox="0 0 74 74" style="flex-shrink:0">';
    html+='<circle cx="37" cy="37" r="'+r+'" fill="none" stroke="#E8E5DF" stroke-width="6"/>';
    html+='<circle cx="37" cy="37" r="'+r+'" fill="none" stroke="'+ringC+'" stroke-width="6" stroke-dasharray="'+dash+' '+(circ-dash)+'" stroke-linecap="round" transform="rotate(-90 37 37)"/>';
    html+='<text x="37" y="41" text-anchor="middle" font-size="11" font-weight="700" fill="'+ringC+'" font-family="monospace">'+pct+'%</text>';
    html+='</svg></div>';
    html+='<div style="font-size:12.5px;color:#5C5A60;margin-bottom:8px">Head: <strong>'+headEmp.name+'</strong></div>';
    html+='<div style="display:flex;gap:6px;margin-bottom:9px">';
    html+='<span style="font-size:11px;font-weight:600;padding:2px 9px;border-radius:99px;background:'+scBg+';color:'+sc+'">'+p.status+'</span>';
    html+='<span style="font-size:11px;font-weight:600;padding:2px 9px;border-radius:99px;background:'+priBg+';color:'+priC+'">'+p.priority+'</span>';
    html+='</div>';
    if(p.deadline){
      var dl=new Date(p.deadline),ov=dl<new Date()&&p.status!=='Completed';
      html+='<div style="font-size:12px;color:#5C5A60;margin-bottom:9px">Deadline: <span style="font-weight:600;color:'+(ov?'#DC2626':'#5C5A60')+'">'+dl.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})+(ov?' (overdue)':'')+'</span></div>';
    }
    html+='<div style="margin-bottom:11px">';
    html+='<div style="display:flex;justify-content:space-between;font-size:11px;color:#9B9899;margin-bottom:3px"><span>'+doneMs+'/'+totalMs+' milestones</span><span style="font-weight:600">'+pct+'%</span></div>';
    html+='<div style="height:4px;background:#E8E5DF;border-radius:99px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+(pct>=100?'#059669':'#2563EB')+';border-radius:99px"></div></div>';
    html+='</div>';
    html+='<div style="display:flex;align-items:center;justify-content:space-between">';
    html+='<div style="display:flex">'+teamHtml+'</div>';
    html+='<button class="btn btn-sm" style="font-size:12px;height:30px" onclick="event.stopPropagation();openProj('+p.id+')">Open '+ICON('chevron-right',12)+'</button>';
    html+='</div></div></div>';
  });
  if(!html)html='<div style="text-align:center;padding:40px;color:#9B9899">No projects</div>';
  document.getElementById('proj-list').innerHTML=html;
}

function openProj(id){
  var p=PROJECTS.find(function(x){return x.id===id;});if(!p)return;
  projTab='overview';
  rProjDetail(p);
  nav('proj-detail',null);
  document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('on');});
  var ni=document.querySelector('[data-v="projects"]');if(ni)ni.classList.add('on');
  var ve=document.getElementById('v-proj-detail');if(ve)ve.scrollTop=0;
}

function setProjTab(tab,pid){
  projTab=tab;
  var p=PROJECTS.find(function(x){return x.id===pid;});
  if(p)rProjDetail(p);
}

function rProjDetail(p){
  var el=document.getElementById('proj-det');if(!el)return;
  var uid=CU?CU.id:1;
  var pct=p.progress||0;
  var sc=p.status==='Active'?'#059669':p.status==='Planning'?'#D97706':p.status==='Completed'?'#2563EB':'#9B9899';
  var scBg=p.status==='Active'?'#ECFDF5':p.status==='Planning'?'#FFFBEB':p.status==='Completed'?'#EFF6FF':'#F0EEE9';
  var priC=p.priority==='High'?'#DC2626':p.priority==='Medium'?'#D97706':'#059669';
  var priBg=p.priority==='High'?'#FEF2F2':p.priority==='Medium'?'#FFFBEB':'#ECFDF5';
  var headEmp=USERS.find(function(u){return u.id===p.head;})||{ini:'?',avBg:'#ccc',avFg:'#fff',name:'Unknown',role:'',dept:'',email:'',score:0};
  var tabs=['overview','milestones','team'];

  var tabHtml='';
  tabs.forEach(function(t){
    var lbl=t.charAt(0).toUpperCase()+t.slice(1);
    tabHtml+='<button onclick="setProjTab(\''+t+'\','+p.id+')" style="padding:11px 16px;border:none;background:none;font-family:var(--font);font-size:13px;font-weight:'+(projTab===t?700:400)+';color:'+(projTab===t?'#18171A':'#9B9899')+';border-bottom:'+(projTab===t?'2.5px solid #18171A':'2px solid transparent')+';cursor:pointer;white-space:nowrap;transition:.15s">'+lbl+'</button>';
  });

  var content='';
  if(projTab==='overview')content=rProjOverview(p,uid,pct,headEmp,sc,scBg,priC);
  else if(projTab==='milestones')content=rProjMilestones(p,uid);
  else if(projTab==='team')content=rProjTeam(p);

  el.innerHTML=
    '<div style="position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid rgba(0,0,0,.07)">'+
    '<div style="display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid rgba(0,0,0,.07)">'+
    '<button class="btn btn-ghost btn-sm" onclick="nav(\'projects\',document.querySelector(\'[data-v=projects]\'))" style="flex-shrink:0">'+
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back</button>'+
    '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(p.name)+'</div>'+
    '<div style="font-size:12px;color:#9B9899">'+esc(p.client)+'</div></div>'+
    '<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;background:'+scBg+';color:'+sc+';flex-shrink:0">'+p.status+'</span>'+
    '<span style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;background:'+priBg+';color:'+priC+';flex-shrink:0">'+p.priority+'</span>'+
    '</div>'+
    '<div style="display:flex;gap:0;padding:0 16px;overflow-x:auto;scrollbar-width:none">'+tabHtml+'</div>'+
    '</div>'+
    '<div style="padding:18px 20px">'+content+'</div>';
}

function rProjOverview(p,uid,pct,headEmp,sc,scBg,priC){
  var myT=TASKS.filter(function(t){return t.proj===p.name&&!t.self;});
  var myST=TASKS.filter(function(t){return t.proj===p.name&&t.self;});
  var ms=p.milestones||[];
  var doneMs=ms.filter(function(m){return m.status==='Done';}).length;
  var r=52,circ=2*Math.PI*r;
  var ringC=pct>=80?'#059669':pct>=50?'#2563EB':'#D97706';
  var dl=p.deadline?new Date(p.deadline):null;
  var ov=dl&&dl<new Date()&&p.status!=='Completed';
  var html='';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">';
  html+='<div style="background:#fff;border:1px solid var(--b);border-radius:var(--r4);padding:18px;display:flex;flex-direction:column;align-items:center;justify-content:center">';
  html+='<svg width="120" height="120" viewBox="0 0 130 130">';
  html+='<circle cx="65" cy="65" r="'+r+'" fill="none" stroke="#E8E5DF" stroke-width="10"/>';
  html+='<circle cx="65" cy="65" r="'+r+'" fill="none" stroke="'+ringC+'" stroke-width="10" stroke-dasharray="'+(circ*pct/100)+' '+(circ*(1-pct/100))+'" stroke-linecap="round" transform="rotate(-90 65 65)"/>';
  html+='<text x="65" y="60" text-anchor="middle" font-family="monospace" font-size="22" font-weight="700" fill="'+ringC+'">'+pct+'%</text>';
  html+='<text x="65" y="78" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9B9899">Progress</text>';
  html+='</svg></div>';
  html+='<div style="background:#fff;border:1px solid var(--b);border-radius:var(--r4);padding:14px">';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  html+='<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#9B9899;margin-bottom:3px">DEADLINE</div><div style="font-size:13px;font-weight:700;color:'+(ov?'#DC2626':'#D97706')+'">'+(dl?dl.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—')+'</div></div>';
  html+='<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#9B9899;margin-bottom:3px">DEPT</div><div style="font-size:13px;font-weight:700">'+(p.dept||'—')+'</div></div>';
  html+='<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#9B9899;margin-bottom:3px">TEAM</div><div style="font-size:13px;font-weight:700">'+(p.team||[]).length+' members</div></div>';
  html+='<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#9B9899;margin-bottom:3px">MILESTONES</div><div style="font-size:13px;font-weight:700">'+doneMs+'/'+ms.length+' done</div></div>';
  html+='</div></div></div>';
  html+='<div style="background:#fff;border:1px solid var(--b);border-radius:var(--r4);padding:14px;margin-bottom:14px">';
  html+='<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#9B9899;margin-bottom:10px">PROJECT HEAD</div>';
  html+='<div style="display:flex;align-items:center;gap:12px">';
  html+=av(headEmp.avBg,headEmp.avFg,headEmp.ini,44);
  html+='<div style="flex:1"><div style="font-size:14px;font-weight:700">'+headEmp.name+'</div>';
  html+='<div style="font-size:12px;color:#9B9899">'+headEmp.role+'</div></div>';
  html+='<div style="text-align:right"><div style="font-size:11px;color:#9B9899">Score</div><div style="font-size:22px;font-weight:800;color:#059669;font-family:monospace">'+(headEmp.score||90)+'</div></div>';
  html+='</div></div>';
  if(myT.length||myST.length){
    html+='<div style="background:#fff;border:1px solid var(--b);border-radius:var(--r4);padding:14px;margin-bottom:14px">';
    html+='<div style="font-size:13px;font-weight:700;margin-bottom:10px">My Tasks ('+(myT.length+myST.length)+')</div>';
    myT.concat(myST).forEach(function(t){
      var u=urg(t.dms);
      html+='<div class="tr '+(t.active?'arow':'')+'" onclick="openDetail('+t.id+')" style="'+(t.self?'border-left:3px solid var(--purple)':'')+'">';
      html+='<div class="tr-info"><div class="tr-t">'+t.title+(t.self?'<span class="badge b-self" style="font-size:10px">Self</span>':'')+'</div>';
      html+='<div class="tr-m">'+pb(t.priority)+'<span class="'+u.cls+'">'+u.s+'</span></div></div>'+sb(t.status)+'</div>';
    });
    html+='</div>';
  }
  html+='<div style="padding:14px;background:var(--pl);border:1px solid rgba(124,58,237,.12);border-radius:var(--r4);display:flex;align-items:center;justify-content:space-between;gap:12px">';
  html+='<div><div style="font-size:13px;font-weight:700;color:var(--plc)">Add a self-assigned task</div>';
  html+='<div style="font-size:12px;color:rgba(91,33,182,.6);margin-top:2px">Create a task linked to '+esc(p.name)+'</div></div>';
  html+='<button class="btn btn-purple btn-sm" onclick="oSA(null,\''+esc(p.name)+'\')">+ Add Task</button>';
  html+='</div>';
  return html;
}

function rProjMilestones(p,uid){
  var ms=p.milestones||[];
  var doneMs=ms.filter(function(m){return m.status==='Done';}).length;
  var msPct=ms.length?Math.round(doneMs/ms.length*100):0;
  var totalDels=ms.reduce(function(s,m){return s+(m.deliverables||[]).length;},0);
  var html='';
  html+='<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">';
  html+='<div><div style="font-size:15px;font-weight:700">Milestones</div>';
  html+='<div style="font-size:12px;color:#9B9899;margin-top:2px">'+ms.length+' total · '+doneMs+' done · '+totalDels+' deliverables</div></div></div>';
  html+='<div style="background:#fff;border:1px solid var(--b);border-radius:var(--r3);padding:13px;margin-bottom:14px">';
  html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:12.5px;font-weight:600">Overall Progress</span><span style="font-size:13px;font-weight:700;color:#2563EB">'+msPct+'%</span></div>';
  html+='<div style="height:7px;background:#E8E5DF;border-radius:99px;overflow:hidden;margin-bottom:8px"><div style="height:100%;width:'+msPct+'%;background:#2563EB;border-radius:99px"></div></div>';
  html+='<div style="display:flex;gap:12px;font-size:11.5px;color:#9B9899"><span>'+ICON('check-circle',11)+' '+doneMs+' Done</span><span>'+ICON('circle',11)+' '+(ms.length-doneMs)+' Remaining</span><span>'+ICON('package',11)+' '+totalDels+' deliverables</span></div>';
  html+='</div>';
  ms.forEach(function(m){
    var msDels=m.deliverables||[];
    var msDone=msDels.filter(function(d){return d.status==='Done';}).length;
    var msP=msDels.length?Math.round(msDone/msDels.length*100):m.status==='Done'?100:0;
    var msC=m.status==='Done'?'#059669':m.status==='In Progress'?'#2563EB':'#9B9899';
    var msBg=m.status==='Done'?'#ECFDF5':m.status==='In Progress'?'#EFF6FF':'#F0EEE9';
    html+='<div style="border:'+(m.status==='In Progress'?'1.5px solid #2563EB':'1px solid rgba(0,0,0,.07)')+';border-radius:12px;overflow:hidden;margin-bottom:10px;background:#fff">';
    html+='<div style="padding:13px 15px;'+(msDels.length?'border-bottom:1px solid rgba(0,0,0,.07)':'')+'">';
    html+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">';
    html+='<div style="font-size:13.5px;font-weight:700;flex:1">'+m.title+'</div>';
    html+='<span style="font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:99px;background:'+msBg+';color:'+msC+';flex-shrink:0">'+m.status+'</span>';
    html+='</div>';
    html+='<div style="font-size:12.5px;color:#9B9899;margin-bottom:6px;line-height:1.4">'+m.desc+'</div>';
    html+='<div style="display:flex;align-items:center;gap:12px;font-size:12px;color:#9B9899">';
    html+='<span>'+ICON('calendar',11)+' Due: <strong style="color:'+(m.status==='Done'?'#059669':'#5C5A60')+'">'+new Date(m.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})+'</strong></span>';
    if(msDels.length)html+='<span>'+msDone+'/'+msDels.length+' deliverables done</span>';
    html+='</div>';
    if(msDels.length){
      html+='<div style="height:4px;background:#E8E5DF;border-radius:99px;overflow:hidden;margin-top:9px"><div style="height:100%;width:'+msP+'%;background:'+msC+';border-radius:99px"></div></div>';
    }
    html+='</div>';
    if(msDels.length){
      html+='<div style="padding:8px 13px 13px">';
      msDels.forEach(function(d){html+=buildDelivCard(d,m,p,uid);});
      html+='</div>';
    }
    html+='</div>';
  });
  return html;
}

function buildDelivCard(d,ms,p,uid){
  var selfT=d.selfTasks||[];
  var empT=d.tasks||[];
  var allT=selfT.concat(empT);
  var doneT=allT.filter(function(t){return t.status==='Done'||(t.done===true);}).length;
  var assignees=(d.assignees||[]).map(function(id){return USERS.find(function(u){return u.id===id;});}).filter(Boolean);
  var priC=d.priority==='High'?'#DC2626':d.priority==='Medium'?'#D97706':'#059669';
  var stC=d.status==='Done'?'#059669':d.status==='In Review'?'#7C3AED':d.status==='Rejected'?'#DC2626':'#2563EB';
  var stBg=d.status==='Done'?'#ECFDF5':d.status==='In Review'?'#F5F3FF':d.status==='Rejected'?'#FEF2F2':'#EFF6FF';
  var html='<div style="border:1px solid rgba(0,0,0,.07);border-radius:10px;overflow:hidden;margin-bottom:9px">';
  html+='<div style="height:3px;background:'+priC+'"></div>';
  html+='<div style="padding:11px 13px;background:#FAFAFA">';
  html+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:5px">';
  html+='<div style="font-size:13px;font-weight:700;flex:1">'+esc(d.title)+'</div>';
  html+='<div style="display:flex;gap:4px;flex-shrink:0">';
  html+='<span style="font-size:10.5px;padding:2px 7px;border-radius:99px;background:'+(d.priority==='High'?'#FEF2F2':d.priority==='Medium'?'#FFFBEB':'#ECFDF5')+';color:'+priC+';font-weight:600">'+d.priority+'</span>';
  html+='<span style="font-size:10.5px;padding:2px 7px;border-radius:99px;background:'+stBg+';color:'+stC+';font-weight:600">'+d.status+'</span>';
  html+='</div></div>';
  html+='<div style="font-size:12px;color:#9B9899;margin-bottom:8px;line-height:1.4">'+esc(d.desc)+'</div>';
  html+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11.5px;color:#9B9899;margin-bottom:8px">';
  assignees.forEach(function(u){
    html+='<div style="display:flex;align-items:center;gap:4px">'+av(u.avBg,u.avFg,u.ini,18)+'<span>'+u.name.split(' ')[0]+'</span></div>';
  });
  if(d.deadline)html+='<span>'+ICON('calendar',11)+' '+new Date(d.deadline).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})+'</span>';
  html+='<span>'+ICON('timer',11)+' '+(d.hours||0)+'h</span>';
  if(allT.length)html+='<span>'+ICON('check',11)+' '+doneT+'/'+allT.length+' tasks</span>';
  html+='</div>';
  html+='<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:11px;color:#9B9899;margin-bottom:3px"><span>Progress</span><span style="font-weight:600">'+d.progress+'%</span></div>';
  html+='<div style="height:4px;background:#E8E5DF;border-radius:99px;overflow:hidden"><div style="height:100%;width:'+d.progress+'%;background:'+(d.progress>=100?'#059669':d.progress>=50?'#2563EB':'#D97706')+';border-radius:99px"></div></div></div>';
  html+='<div style="border-top:1px solid rgba(0,0,0,.06);padding-top:9px">';
  html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
  html+='<div style="font-size:12px;font-weight:700;color:#5C5A60">Tasks'+(allT.length?' ('+allT.length+')':'')+'</div>';
  html+='<button class="btn btn-purple btn-xs" onclick="openAddDelTask(\''+d.id+'\',\''+ms.id+'\','+p.id+')">+ Add Task</button>';
  html+='</div>';
  if(allT.length){
    selfT.forEach(function(t){html+=buildSelfTaskRow(t,uid);});
    empT.forEach(function(t){html+=buildEmpTaskRow(t,uid);});
  } else {
    html+='<div style="text-align:center;padding:12px;background:#F5F3FF;border-radius:8px;font-size:12.5px;color:#5B21B6">No tasks yet · click + Add Task to start</div>';
  }
  html+='</div></div></div>';
  return html;
}

function buildSelfTaskRow(t,uid){
  var isMe=t.employeeId===uid;
  var stC=t.status==='Done'?'#059669':t.status==='In Review'?'#7C3AED':t.status==='Rejected'?'#DC2626':'#2563EB';
  var stBg=t.status==='Done'?'#ECFDF5':t.status==='In Review'?'#F5F3FF':t.status==='Rejected'?'#FEF2F2':'#EFF6FF';
  var priC=t.priority==='High'?'#DC2626':t.priority==='Medium'?'#D97706':'#059669';
  var priBg=t.priority==='High'?'#FEF2F2':t.priority==='Medium'?'#FFFBEB':'#ECFDF5';
  var emp=USERS.find(function(u){return u.id===t.employeeId;})||{ini:'?',avBg:'#ccc',avFg:'#fff',name:'Team'};
  var adminBadge='';
  if(t.adminStatus==='approved')adminBadge='<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;background:#ECFDF5;color:#065F46">'+ICON('check',10)+' Approved</span>';
  else if(t.adminStatus==='pending')adminBadge='<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;background:#FFFBEB;color:#92400E">'+ICON('hourglass',10)+' Pending</span>';
  else if(t.adminStatus==='rejected')adminBadge='<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;background:#FEF2F2;color:#991B1B">'+ICON('x',10)+' Rejected</span>';
  var html='<div style="border:1px solid rgba(0,0,0,.07);border-radius:8px;padding:10px 12px;margin-bottom:6px;background:#fff'+(isMe?';border-left:3px solid #2563EB':'')+'">';
  html+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">';
  html+='<div style="font-size:12.5px;font-weight:600;flex:1">'+esc(t.title)+'</div>';
  html+='<div style="display:flex;gap:3px;flex-shrink:0">';
  html+='<span style="font-size:10px;padding:2px 6px;border-radius:99px;background:'+priBg+';color:'+priC+';font-weight:600">'+t.priority+'</span>';
  html+='<span style="font-size:10px;padding:2px 6px;border-radius:99px;background:'+stBg+';color:'+stC+';font-weight:600">'+t.status+'</span>';
  html+='</div></div>';
  if(t.desc)html+='<div style="font-size:11.5px;color:#9B9899;margin-bottom:6px;line-height:1.4">'+esc(t.desc)+'</div>';
  html+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11.5px;color:#9B9899">';
  html+=av(emp.avBg,emp.avFg,emp.ini,16);
  html+='<span>'+emp.name.split(' ')[0]+'</span>';
  if(t.hoursLogged)html+='<span>'+ICON('timer',11)+' '+t.hoursLogged+'h logged</span>';
  if(t.date)html+='<span>'+t.date+'</span>';
  if(adminBadge)html+='<span>'+adminBadge+'</span>';
  html+='</div>';
  if(t.adminNote&&t.adminStatus==='rejected')html+='<div style="font-size:12px;color:#DC2626;background:#FEF2F2;border-radius:6px;padding:6px 9px;margin-top:7px">'+ICON('alert-triangle',11)+' '+t.adminNote+'</div>';
  if(isMe&&t.adminStatus!=='approved'){
    html+='<div style="display:flex;gap:5px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(0,0,0,.06)">';
    if(!t.adminStatus||t.adminStatus==='rejected')html+='<button class="btn btn-xs btn-purple" onclick="submitSelfT(\''+t.id+'\')">Submit for Review</button>';
    html+='</div>';
  }
  html+='</div>';
  return html;
}

function buildEmpTaskRow(t,uid){
  var isMe=t.assignee===uid||t.createdById===uid;
  var stC=t.status==='Done'?'#059669':t.status==='In Review'?'#7C3AED':t.status==='Rejected'?'#DC2626':'#2563EB';
  var stBg=t.status==='Done'?'#ECFDF5':t.status==='In Review'?'#F5F3FF':t.status==='Rejected'?'#FEF2F2':'#EFF6FF';
  var priC=t.priority==='High'?'#DC2626':t.priority==='Medium'?'#D97706':'#059669';
  var priBg=t.priority==='High'?'#FEF2F2':t.priority==='Medium'?'#FFFBEB':'#ECFDF5';
  var ae=USERS.find(function(u){return u.id===(t.assignee||t.createdById);})||{ini:'?',avBg:'#ccc',avFg:'#fff',name:'You'};
  var html='<div style="border:1px solid rgba(0,0,0,.07);border-radius:8px;padding:10px 12px;margin-bottom:6px;background:#fff'+(isMe?';border-left:3px solid var(--purple)':'')+'">';
  html+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px">';
  html+='<div style="font-size:12.5px;font-weight:600;flex:1">'+esc(t.title)+'<span class="badge b-self" style="font-size:9px;margin-left:5px">Self</span></div>';
  html+='<div style="display:flex;gap:3px;flex-shrink:0">';
  html+='<span style="font-size:10px;padding:2px 6px;border-radius:99px;background:'+priBg+';color:'+priC+';font-weight:600">'+(t.priority||'Medium')+'</span>';
  html+='<span style="font-size:10px;padding:2px 6px;border-radius:99px;background:'+stBg+';color:'+stC+';font-weight:600">'+t.status+'</span>';
  html+='</div></div>';
  if(t.desc)html+='<div style="font-size:11.5px;color:#9B9899;margin-bottom:6px;line-height:1.4">'+esc(t.desc)+'</div>';
  html+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11.5px;color:#9B9899">';
  html+=av(ae.avBg,ae.avFg,ae.ini,16)+'<span>'+ae.name.split(' ')[0]+'</span>';
  if(t.estHours)html+='<span>'+ICON('timer',11)+' '+(t.loggedHours||0)+'h / '+t.estHours+'h</span>';
  if(t.saStatus==='pending')html+='<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;background:#FFFBEB;color:#92400E">'+ICON('hourglass',10)+' Pending Review</span>';
  if(t.saStatus==='approved')html+='<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;background:#ECFDF5;color:#065F46">'+ICON('check',10)+' Approved</span>';
  html+='</div></div>';
  return html;
}

function rProjTeam(p){
  var html='<div style="font-size:14px;font-weight:700;margin-bottom:12px">Team Members</div>';
  (p.team||[]).forEach(function(tid){
    var u=USERS.find(function(x){return x.id===tid;});if(!u)return;
    html+='<div style="display:flex;align-items:center;gap:12px;padding:12px;background:#fff;border:1px solid var(--b);border-radius:var(--r3);margin-bottom:8px">';
    html+=av(u.avBg,u.avFg,u.ini,40);
    html+='<div style="flex:1"><div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">';
    html+='<span style="font-size:13px;font-weight:700">'+esc(u.name)+'</span>';
    if(tid===p.head)html+='<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:99px;background:#EFF6FF;color:#2563EB">HEAD</span>';
    html+='</div><div style="font-size:12px;color:#9B9899">'+esc(u.role)+' · '+esc(u.dept)+'</div></div>';
    html+='<div style="text-align:right"><div style="font-size:11px;color:#9B9899">Score</div>';
    html+='<div style="font-size:18px;font-weight:800;color:#059669;font-family:monospace">'+(u.score||90)+'</div></div></div>';
  });
  return html;
}

function openAddDelTask(delId,msId,projId){
  var p=PROJECTS.find(function(x){return x.id===projId;});
  var ms=p&&(p.milestones||[]).find(function(m){return m.id===msId;});
  var d=ms&&(ms.deliverables||[]).find(function(x){return x.id===delId;});
  if(!d)return;
  oMod('Add Task',
    '<div style="padding:8px 12px;background:var(--bl);border-radius:var(--r2);margin-bottom:14px;font-size:12.5px;color:var(--blc)">'+
    '<strong>Deliverable:</strong> '+esc(d.title)+'</div>'+
    '<div class="fg"><label class="fl">Task Title *</label><input class="fin" id="at-title" placeholder="What will you work on?"></div>'+
    '<div class="fg"><label class="fl">Description</label><textarea class="fta" id="at-desc" style="min-height:56px" placeholder="Details…"></textarea></div>'+
    '<div class="frow"><div class="fg"><label class="fl">Priority</label><div class="ptog" id="at-pri"><button class="popt" onclick="setPT(this,\'at-pri\')">High</button><button class="popt on" onclick="setPT(this,\'at-pri\')">Medium</button><button class="popt" onclick="setPT(this,\'at-pri\')">Low</button></div></div>'+
    '<div class="fg"><label class="fl">Est. Hours</label><input class="fin" id="at-hrs" type="number" min=".5" step=".5" value="2"></div></div>'+
    '<div class="fg" style="display:flex;align-items:center;justify-content:space-between;padding:11px;background:var(--s2);border-radius:var(--r2)">'+
    '<div><div style="font-size:13px;font-weight:600">Submit for Admin Review</div><div style="font-size:11.5px;color:var(--t3)">Admin will approve or reject</div></div>'+
    '<input type="checkbox" id="at-submit" style="width:18px;height:18px;accent-color:var(--purple);cursor:pointer" checked></div>',
  [{l:'Cancel',cls:'btn-ghost',a:cMod},
   {l:'Add Task',cls:'btn-purple',a:function(){saveAddDelTask(delId,msId,projId);}}]);
}

function saveAddDelTask(delId,msId,projId){
  var p=PROJECTS.find(function(x){return x.id===projId;});
  var ms=p&&(p.milestones||[]).find(function(m){return m.id===msId;});
  var d=ms&&(ms.deliverables||[]).find(function(x){return x.id===delId;});
  if(!d||!CU)return;
  var title=((document.getElementById('at-title')||{}).value||'').trim();
  if(!title){toast('Title is required','err');return;}
  var desc=((document.getElementById('at-desc')||{}).value||'').trim();
  var priEl=document.querySelector('#at-pri .popt.on');
  var pri=priEl?priEl.textContent.trim():'Medium';
  var hrs=parseFloat((document.getElementById('at-hrs')||{}).value)||2;
  var doSub=(document.getElementById('at-submit')||{}).checked;
  /* DUAL-WRITE FIX: pehle ye task DO jagah push karta tha (d.tasks aur TASKS)
     do alag IDs ke saath, bina kisi reference ke — ek jagah update karo toh
     doosri stale ho jaati thi. Ab EK record, ek jagah. */
  DataAPI.createSubtask({
    deliverableId: d.id,
    title: title,
    description: desc,
    priority: Schema.normPriority(pri),
    status: doSub ? 'IN_REVIEW' : 'IN_PROGRESS',
    assigneeId: CU.id,
    createdById: CU.id,
    estimateSecs: Schema.TIME.hoursToSecs(hrs),
    approvalState: doSub ? 'PENDING' : null
  }).then(function(){
    syncUserState();
    cMod();
    var fresh=PROJECTS.find(function(x){return x.id===projId;});
    if(fresh)rProjDetail(fresh);
    rAll();
    toast(doSub?'Task added & submitted \uD83D\uDCE4':'Task added \u2713','ok');
  }).catch(function(err){toast(err.message||'Could not add task','err');});
}

function submitSelfT(stId){
  var owner=null;
  PROJECTS.forEach(function(p){
    (p.milestones||[]).forEach(function(ms){
      (ms.deliverables||[]).forEach(function(d){
        if((d.selfTasks||[]).some(function(x){return x.id===stId;}))owner=p;
      });
    });
  });
  DataAPI.updateSubtask(stId,{status:'IN_REVIEW',approvalState:'PENDING',rejectionReason:null})
    .then(function(){
      syncUserState();
      if(owner){var fresh=PROJECTS.find(function(x){return x.id===owner.id;});if(fresh)rProjDetail(fresh);}
      rAll();
      toast('Submitted for review \uD83D\uDCE4','ok');
    }).catch(function(err){toast(err.message||'Could not submit','err');});
}
