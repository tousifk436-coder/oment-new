// ══ TASK TRACKER ══
function rTracker(){
  const tbody=document.getElementById('tr-list');
  const tfil=document.getElementById('tr-filter');
  if(!tbody||!tfil)return;

  const all=TASKS;
  const rej=all.filter(t=>t.status==='rejected').length;
  document.getElementById('tr-sub').textContent=`${all.length} total · ${all.filter(t=>!t.self).length} admin · ${all.filter(t=>t.self).length} self`;

  tfil.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
    <input class="fin" style="height:34px" placeholder="Kaam ya project ka naam likho…" value="${trQ}" oninput="trQ=this.value;rTracker()">
    <div class="tbar">
      <button class="tbtn ${trF==='all'?'on':''}" onclick="trF='all';rTracker()">Sab</button>
      <button class="tbtn ${trF==='admin'?'on':''}" onclick="trF='admin';rTracker()">Manager ne diya</button>
      <button class="tbtn ${trF==='self'?'on':''}" onclick="trF='self';rTracker()">Maine liya</button>
      <button class="tbtn ${trF==='active'?'on':''}" onclick="trF='active';rTracker()">Abhi chal raha</button>
      <button class="tbtn ${trF==='pending'?'on':''}" onclick="trF='pending';rTracker()">Baaki hai</button>
      <button class="tbtn ${trF==='review'?'on':''}" onclick="trF='review';rTracker()">Check ho raha</button>
      <button class="tbtn ${trF==='done'?'on':''}" onclick="trF='done';rTracker()">Ho gaya</button>
      <button class="tbtn ${trF==='rejected'?'on':''}${rej?' has-rej':''}" onclick="trF='rejected';rTracker()">
        Wapas aaya${rej?` <span style="background:var(--red);color:#fff;font-size:9.5px;padding:0 5px;border-radius:99px;margin-left:2px">${rej}</span>`:''}
      </button>
    </div>
  </div>`;

  let tasks=all;
  if(trF==='admin') tasks=tasks.filter(t=>!t.self);
  else if(trF==='self') tasks=tasks.filter(t=>t.self);
  else if(trF==='active') tasks=tasks.filter(t=>t.active);
  else if(trF==='pending') tasks=tasks.filter(t=>t.status==='todo'||t.status==='inprogress');
  else if(trF==='review') tasks=tasks.filter(t=>t.status==='submitted');
  else if(trF==='done') tasks=tasks.filter(t=>t.status==='approved');
  else if(trF==='rejected') tasks=tasks.filter(t=>t.status==='rejected');

  if(trQ.trim()){const q=trQ.toLowerCase();tasks=tasks.filter(t=>t.title.toLowerCase().includes(q)||(t.proj||'').toLowerCase().includes(q));}

  if(!tasks.length){tbody.innerHTML=`<div class="empty">${Icons.badge('search',{tone:'neutral',box:40,size:20})}<div>No tasks match this filter</div></div>`;return;}

  // Group by project
  const projs=[...new Set(tasks.map(t=>t.proj||'No Project'))];
  let html='';
  projs.forEach(pn=>{
    const grp=tasks.filter(t=>(t.proj||'No Project')===pn);
    const adminG=grp.filter(t=>!t.self);
    const selfG=grp.filter(t=>t.self);
    const projObj=PROJECTS.find(p=>p.name===pn);
    html+=`<div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;padding:7px 11px;background:var(--s2);border-radius:var(--r2);margin-bottom:9px;${projObj?'cursor:pointer':''}" onclick="${projObj?`openProj(${projObj.id})`:''}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="6" height="5" rx="1"/><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="16" y="3" width="6" height="5" rx="1"/></svg>
        <span style="font-size:12.5px;font-weight:700;color:var(--t2);flex:1">${pn}</span>
        <span style="font-size:11px;color:var(--t3)">${grp.length} task${grp.length>1?'s':''}</span>
        ${adminG.length?`<span style="font-size:10.5px;background:var(--bl);color:var(--blc);padding:1px 7px;border-radius:99px;font-weight:500">${adminG.length} admin</span>`:''}
        ${selfG.length?`<span style="font-size:10.5px;background:var(--pl);color:var(--plc);padding:1px 7px;border-radius:99px;font-weight:500">${selfG.length} self</span>`:''}
      </div>`;

    if(adminG.length){
      html+=`<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding-left:3px">Manager ne diya</div>`;
      html+=adminG.map(t=>trRow(t,false)).join('');
    }
    if(selfG.length){
      html+=`<div style="font-size:11px;font-weight:600;color:var(--plc);text-transform:uppercase;letter-spacing:.5px;margin:${adminG.length?'10px':0} 0 6px;padding-left:3px">\u270D Maine khud liya \u00b7 ${pn}</div>`;
      html+=selfG.map(t=>trRow(t,true)).join('');
    }
    html+=`</div>`;
  });
  tbody.innerHTML=html;
}

function trRow(t,isSelf){
  const u=urg(t.dms);
  const bc=isSelf?'var(--purple)':t.status==='rejected'?'var(--red)':t.active?'var(--blue)':'var(--b2)';
  const saL=isSelf?(t.saStatus==='pending'?ICON('hourglass',11)+' Pending':t.saStatus==='approved'?ICON('check',11)+' Approved':t.saStatus==='rejected'?ICON('x',11)+' Rejected':'Draft'):'';
  const saBg=t.saStatus==='pending'?'var(--al)':t.saStatus==='approved'?'var(--gl)':t.saStatus==='rejected'?'var(--rl)':'var(--s2)';
  const saFg=t.saStatus==='pending'?'var(--alc)':t.saStatus==='approved'?'var(--glc)':t.saStatus==='rejected'?'var(--rlc)':'var(--t3)';
  return`<div class="tr ${t.active?'arow':''} ${t.status==='rejected'?'rrow':''}" style="margin-left:10px;border-left:3px solid ${bc};border-radius:0 var(--r3) var(--r3) 0;padding-left:11px" onclick="openDetail(${t.id})">
    <div class="tr-info">
      <div class="tr-t">${esc(t.title)}${isSelf?'<span class="badge b-self" style="font-size:10px;margin-left:5px">Self</span>':''}${t.active?'<span style="font-size:10.5px;color:var(--blue);font-weight:600;margin-left:5px">●</span>':''}</div>
      <div class="tr-m">${pb(t.priority)}<span class="${u.cls}">${u.s}</span>${t.ms?`<span style="font-size:11.5px;color:var(--t3)">${esc(t.ms)}</span>`:''}${!isSelf?`<span style="font-size:11px;background:var(--s2);padding:1px 7px;border-radius:99px;color:var(--t3)">by ${esc(t.by)}</span>`:''}</div>
      ${isSelf&&saL?`<div style="margin-top:3px"><span style="font-size:11px;padding:2px 8px;border-radius:99px;font-weight:600;background:${saBg};color:${saFg}">${saL}</span></div>`:''}
      ${t.status==='rejected'?`<div style="font-size:12px;color:var(--red);margin-top:2px;font-weight:500">${ICON('alert-triangle',11)} ${t.rejReason?.slice(0,60)||'Needs resubmission'}</div>`:''}
    </div>
    <div class="tr-r">${sb(t.status)}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg></div>
  </div>`;
}
