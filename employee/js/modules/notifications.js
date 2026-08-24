// ══ NOTIFICATIONS ══
function rNotif(){
  const el=document.getElementById('notif-list');if(!el)return;
  if(!NOTIFS.length){
    el.innerHTML=`<div class="empty-teach">
      <div class="empty-teach-icon">${Icons.svg('bell',26)}</div>
      <div class="empty-teach-title">Abhi kuch naya nahi hai</div>
      <div class="empty-teach-body">Naya kaam mile, koi kaam wapas aaye, ya chhutti approve ho \u2014
        yahan dikhega.</div>
    </div>`;
    return;
  }
  el.innerHTML=NOTIFS.map(n=>`
    <div class="notif-item" onclick="hNotif('${escJs(String(n.id))}')" style="opacity:${n.unread?1:.65}">
      <div class="notif-ic" style="background:${escAttr(n.iconBg||'var(--s2)')}">${Icons.svg(n.icon,15)}</div>
      <div style="flex:1;min-width:0">
        ${n.type==='een'?`<span style="display:inline-block;background:var(--bl);color:var(--blc);
          padding:1px 8px;border-radius:99px;font-size:10px;font-weight:700;margin-bottom:4px">Een</span>`:''}
        <div style="font-size:13px;margin-bottom:2px;line-height:1.45">${esc(n.text)}</div>
        <div style="font-size:11.5px;color:var(--t3);margin-bottom:1px;line-height:1.5">${esc(n.sub)}</div>
        <div style="font-size:11px;color:var(--t4)">${esc(n.time)}</div>
      </div>
      ${n.unread?`<div class="notif-dot"></div>`:''}
    </div>`).join('');
}

function hNotif(id){
  const n=NOTIFS.find(x=>String(x.id)===String(id));if(!n)return;
  /* Pehle yahan n.tid tha, par state field ka naam taskId hai — isliye
     notification pe click karne se task kabhi nahi khulta tha. */
  DataAPI.markNotificationRead(id).then(function(){
    syncUserState();updBadges();
    if(n.taskId&&TASKS.some(t=>t.id===n.taskId))openDetail(n.taskId);
    else rNotif();
  });
}

function markRead(){
  if(!CU)return;
  DataAPI.markAllNotificationsRead(CU.id).then(function(){
    syncUserState();updBadges();rNotif();toast('All read');
  });
}
var markAllRead=markRead;
