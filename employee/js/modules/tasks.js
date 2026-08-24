// ══════════════════════════════════════════════
// TASK DETAIL
// ══════════════════════════════════════════════

function openDetail(id){
  var t=TASKS.find(function(x){return x.id===id;});if(!t)return;
  rDetail(t);nav('detail',null);document.getElementById('v-detail').scrollTop=0;
}

function rDetail(task){
  var el=document.getElementById('det-body');if(!el)return;
  var u=urg(task.dms),exp=task.exp||3600,diff=(task.logged||0)-exp;
  var isEdit=task.status==='todo'||task.status==='inprogress'||task.status==='rejected';

  var html='<div class="dh">';
  html+='<button class="dh-back" onclick="goBack()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>';
  html+='<div class="dh-t">'+esc(task.title)+'</div>';
  html+=sb(task.status);
  if(isEdit&&!task.active&&task.timerStatus!=='PAUSED')html+='<button class="btn btn-solid btn-sm" onclick="confirmSwitch('+JSON.stringify(task.id)+')">'+ICON('play',12)+' Start Task</button>';
  if(task.timerStatus==='RUNNING'){
    html+='<button class="btn btn-ghost btn-sm" onclick="toggleT()">'+ICON('pause',12)+' Pause Task</button>';
    html+='<button class="btn btn-red btn-sm" onclick="stopT();rAll();">■ End Task</button>';
    html+='<span style="font-size:11.5px;color:var(--green);font-weight:600">● Running</span>';
  }else if(task.timerStatus==='PAUSED'){
    html+='<button class="btn btn-solid btn-sm" onclick="toggleT()">'+ICON('play',12)+' Resume Task</button>';
    html+='<button class="btn btn-red btn-sm" onclick="stopT();rAll();">■ End Task</button>';
    html+='<span style="font-size:11.5px;color:var(--amber);font-weight:600">● Paused</span>';
  }
  html+='</div>';

  html+='<div style="padding:16px 18px">';

  // Status banners
  if(task.status==='rejected'){
    html+='<div class="rej-b">';
    html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
    html+='<div style="width:26px;height:26px;border-radius:50%;background:rgba(220,38,38,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    html+='<div style="font-size:13px;font-weight:700;color:var(--red)">Ye kaam wapas aaya hai</div></div>';
    html+='<div style="font-size:12.5px;color:var(--t2);line-height:1.55;margin-bottom:10px">'+esc(task.rejReason)+'</div>';
    html+='<button class="btn btn-red btn-sm" onclick="doResubmit('+task.id+')">\u21BB Dobara shuru karo</button></div>';
  }
  if(task.status==='approved')html+='<div class="app-b"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg><span style="font-size:13px;font-weight:600;color:var(--glc)">Pass ho gaya \u2713 \u2014 shabaash!</span></div>';
  if(task.status==='submitted')html+='<div class="sub-b"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--purple)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span style="font-size:13px;font-weight:600;color:var(--plc)">Bhej diya \u2014 manager check kar raha hai</span></div>';

  html+='<div class="dlayout">';
  html+='<div>';

  // Basic info + time tracking
  html+='<div class="card" style="margin-bottom:13px">';
  html+='<div style="font-size:15px;font-weight:700;margin-bottom:5px">'+esc(task.title)+'</div>';
  html+='<div style="font-size:13px;color:var(--t2);line-height:1.6;margin-bottom:12px">'+esc(task.desc)+'</div>';
  html+='<div class="dm-g">';
  html+='<div class="dm"><div class="dm-l">Priority</div><div style="margin-top:3px">'+pb(task.priority)+'</div></div>';
  html+='<div class="dm"><div class="dm-l">Deadline</div><span class="'+u.cls+'" style="margin-top:3px;font-size:11.5px">'+u.s+'</span><div style="font-size:11px;color:var(--t4);margin-top:2px">'+(task.dlabel||task.deadlineLabel||'')+'</div></div>';
  html+='<div class="dm"><div class="dm-l">Est Time</div><div class="dm-v">'+fmtSh(exp)+'</div></div>';
  html+='</div>';
  html+='<div style="margin-top:12px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:7px">'+ICON('timer',11)+' Time Tracking</div>';
  html+='<div style="font-size:11px;color:var(--t3);margin-bottom:8px">Stored active time: <strong style="font-family:var(--mono)">'+fmtMono(task.logged||0)+'</strong></div>';
  html+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px">';
  html+='<div style="background:var(--s2);border-radius:var(--r2);padding:8px 10px"><div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px">Expected</div><div style="font-size:13px;font-weight:700;font-family:var(--mono)">'+fmtSh(exp)+'</div></div>';
  html+='<div style="background:'+(diff>60?'var(--rl)':diff<-60?'var(--gl)':'var(--s2)')+';border-radius:var(--r2);padding:8px 10px"><div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px">Actual</div><div style="font-size:13px;font-weight:700;font-family:var(--mono)">'+fmtSh(task.logged||0)+'</div></div>';
  html+='<div style="background:'+(diff>60?'var(--rl)':diff<-60?'var(--gl)':'var(--s2)')+';border-radius:var(--r2);padding:8px 10px"><div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px">'+(diff>60?'Over by':diff<-60?'Saved':'Status')+'</div><div style="font-size:13px;font-weight:700;font-family:var(--mono)">'+
    (Math.abs(diff)<60?ICON('check',13):(diff>0?'+':'-')+fmtSh(Math.abs(diff)))+'</div></div>';
  html+='</div></div></div>';

  // Instruction files
  if(task.files&&task.files.length){
    html+='<div class="card" style="margin-bottom:13px">';
    html+='<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">\uD83D\uDCCE Manager ne ye files di hain</div>';
    task.files.forEach(function(f){
      html+='<div class="fi-row">'+ft(f.type||f.t)+'<span class="fi-nm">'+(f.name||f.n)+'</span><span class="fi-sz">'+(f.size||f.s)+'</span>';
      html+='<div class="fi-act">';
      html+='<div class="fi-btn" onclick="toast(\'Opening '+(f.name||f.n)+'…\')" title="Open"><svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div>';
      html+='<div class="fi-btn" onclick="downloadFile(\''+(f.name||f.n)+'\')" title="Download"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>';
      html+='</div></div>';
    });
    html+='</div>';
  }

  // Work chat
  html+='<div class="card" style="margin-bottom:13px">';
  html+='<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">\uD83D\uDCAC Is kaam pe baat-cheet</div>';
  html+='<div class="cw" id="cw-'+task.id+'">';
  if(task.msgs&&task.msgs.length){
    task.msgs.forEach(function(m){
      html+='<div class="cm"><div class="cm-hd">'+av(m.bg,m.fg||m.fc,m.ini||m.initials,20)+'<span class="cm-nm">'+esc(m.from)+'</span><span class="cm-tm">'+m.time+'</span></div>';
      html+='<div class="cm-b">'+esc(m.text)+'</div></div>';
    });
  } else {html+='<div style="padding:10px 0;text-align:center;font-size:12px;color:var(--t4)">No messages yet</div>';}
  html+='</div>';
  html+='<div class="ci-row"><input class="fin" id="ci-'+task.id+'" style="flex:1;height:34px;font-size:14px" placeholder="Kuch poochna hai? Yahan likho…" onkeypress="if(event.key===\'Enter\')sendMsg('+task.id+')"><button class="btn btn-solid btn-sm" onclick="sendMsg('+task.id+')">Send</button></div>';
  html+='</div>';

  // Submit work
  if(isEdit){
    html+='<div class="card" style="margin-bottom:13px">';
    html+='<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">\uD83D\uDCE4 Apna kaam yahan bhejo</div>';
    if(task.subFiles&&task.subFiles.length){
      html+='<div style="margin-bottom:10px">';
      html+='<div style="font-size:11.5px;font-weight:600;color:var(--t2);margin-bottom:6px">Uploaded files ('+task.subFiles.length+')</div>';
      task.subFiles.forEach(function(f,i){
        html+='<div class="fi-row">'+ft(f.type||f.t)+'<span class="fi-nm">'+(f.name||f.n)+'</span><span class="fi-sz">'+(f.size||f.s)+'</span>';
        html+='<div class="fi-act">';
        html+='<div class="fi-btn" onclick="downloadFile(\''+(f.name||f.n)+'\')" title="Download"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>';
        html+='<div class="fi-btn" style="color:var(--red)" onclick="removeSubFile('+task.id+','+i+')" title="Remove"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
        html+='</div></div>';
      });
      html+='</div>';
    }
    html+='<div class="upload-zone" id="uz-'+task.id+'" ondragover="uzDrag(event,\''+task.id+'\')" ondragleave="uzLeave(\''+task.id+'\')" ondrop="uzDrop(event,'+task.id+')">';
    html+='<input type="file" multiple onchange="uzPick(event,'+task.id+')" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.zip">';
    html+='<div class="upload-zone-icon"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>';
    html+='<div class="upload-zone-t">File yahan chhodo, ya click karke chuno</div>';
    html+='<div class="upload-zone-s">PDF, Word, Excel, photo, ZIP \u2014 ek file 50 MB tak</div>';
    html+='</div>';
    html+='<textarea class="fta" id="sn-'+task.id+'" placeholder="Kya kiya, kya problem aayi, kaise kiya \u2014 chhota sa likh do…" style="margin:10px 0">'+(task.subNotes||'')+'</textarea>';
    html+='<button class="btn btn-green btn-full" onclick="doSubmit('+task.id+')">';
    html+='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
    html+='Kaam bhej do (check ke liye)</button>';
    html+='</div>';
  } else if(task.subFiles&&task.subFiles.length){
    html+='<div class="card" style="margin-bottom:13px">';
    html+='<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">'+ICON('paperclip',11)+' Your Submission</div>';
    task.subFiles.forEach(function(f){
      html+='<div class="fi-row">'+ft(f.type||f.t)+'<span class="fi-nm">'+(f.name||f.n)+'</span><span class="fi-sz">'+(f.size||f.s)+'</span>';
      html+='<div class="fi-btn" onclick="downloadFile(\''+(f.name||f.n)+'\')" title="Download"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>';
      html+='</div>';
    });
    if(task.subNotes)html+='<div style="font-size:13px;color:var(--t2);background:var(--s2);padding:10px 12px;border-radius:var(--r2);margin-top:8px">'+esc(task.subNotes)+'</div>';
    html+='</div>';
  }

  html+='</div>';

  // Right column
  html+='<div>';
  html+='<div class="card" style="margin-bottom:12px">';
  html+='<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:10px">Assignment</div>';
  html+='<div style="display:flex;align-items:center;gap:9px;margin-bottom:10px">'+av(task.byBg,task.byFg,task.byIni,28);
  html+='<div><div style="font-size:13px;font-weight:600">'+esc(task.by)+'</div><div style="font-size:11.5px;color:var(--t3)">'+(task.self?'Self-assigned':task.proj||'—')+'</div></div></div>';
  if(task.proj)html+='<div style="font-size:12px;color:var(--t3);margin-bottom:3px">Project: <strong style="color:var(--t1)">'+esc(task.proj)+'</strong></div>';
  if(task.ms)html+='<div style="font-size:12px;color:var(--t3)">Milestone: <strong style="color:var(--t1)">'+esc(task.ms)+'</strong></div>';
  html+='</div>';

  if(task.active){
    html+='<div style="background:var(--t1);color:#fff;border-radius:var(--r4);padding:15px;margin-bottom:12px;text-align:center">';
    html+='<div style="font-size:9.5px;opacity:.4;text-transform:uppercase;letter-spacing:1px;margin-bottom:7px">Live Timer</div>';
    html+='<div style="font-family:var(--mono);font-size:28px;font-weight:500;letter-spacing:-1.5px;margin-bottom:10px" id="det-timer">'+fmtMono(tsecs)+'</div>';
    html+='<div style="display:flex;gap:7px">';
    html+='<button class="btn btn-full" style="background:rgba(255,255,255,.1);color:#fff;border-color:transparent;justify-content:center;height:34px" onclick="toggleT()">'+(trun?ICON('pause',12)+' Pause':ICON('play',12)+' Resume')+'</button>';
    html+='<button class="btn btn-full" style="background:rgba(5,150,105,.2);color:#6EE7B7;border-color:transparent;justify-content:center;height:34px" onclick="doSubmit('+task.id+')">Submit</button>';
    html+='</div></div>';
  }

  html+='<div class="card">';
  html+='<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:10px">Activity Timeline</div>';
  html+='<div class="tl">';
  (task.tl||[]).forEach(function(ev){
    html+='<div class="tl-i"><div class="tl-d tl-'+ev.type+'">'+tlIcon(ev.type)+'</div>';
    html+='<div><div class="tl-t">'+ev.text+'</div><div class="tl-s">'+ev.time+'</div></div></div>';
  });
  html+='</div></div>';

  html+='</div>';
  html+='</div>';
  html+='</div>';

  el.innerHTML=html;
}

// File handling
function downloadFile(name){
  /* File storage abhi connected nahi hai. Fake blob download karne se user ko
     lagta hai file mil gayi — better hai saaf bata dena. */
  toast('File storage not connected yet \u2014 ask your admin for "'+name+'"','err');
}
function uzDrag(e,id){e.preventDefault();var z=document.getElementById('uz-'+id);if(z)z.classList.add('drag');}
function uzLeave(id){var z=document.getElementById('uz-'+id);if(z)z.classList.remove('drag');}
function uzDrop(e,taskId){
  e.preventDefault();
  var z=document.getElementById('uz-'+taskId);if(z)z.classList.remove('drag');
  processFiles(e.dataTransfer.files,taskId);
}
function uzPick(e,taskId){processFiles(e.target.files,taskId);}
function processFiles(files,taskId){
  var task=TASKS.find(function(t){return t.id===taskId;});if(!task)return;
  if(!task.subFiles)task.subFiles=[];
  var MAX=50*1024*1024;
  var accepted=[],rejected=[];
  Array.from(files).forEach(function(f){
    if(f.size>MAX){rejected.push(f.name);return;}
    var ext=f.name.split('.').pop().toLowerCase();
    var type=ext==='pdf'?'pdf':['jpg','jpeg','png','gif','webp'].indexOf(ext)>=0?'img':ext==='zip'?'zip':['xls','xlsx','csv'].indexOf(ext)>=0?'xls':'doc';
    var size=f.size>1048576?(f.size/1048576).toFixed(1)+' MB':(f.size/1024).toFixed(0)+' KB';
    accepted.push({name:f.name,sizeLabel:size,kind:type});
  });
  if(rejected.length)toast(rejected.length+' file(s) over 50 MB skipped','err');
  if(!accepted.length)return;

  DataAPI.addDeliverableFiles(taskId,accepted,'submission').then(function(){
    syncUserState();
    var fresh=TASKS.find(function(t){return t.id===taskId;});
    if(fresh)rDetail(fresh);
    toast(accepted.length+' file'+(accepted.length>1?'s':'')+' added \u2713','ok');
  }).catch(function(err){toast(err.message||'Upload failed','err');});
}
function removeSubFile(taskId,idx){
  var task=TASKS.find(function(t){return t.id===taskId;});if(!task||!task.subFiles)return;
  var name=(task.subFiles[idx]||{}).name||'File';
  DataAPI.removeDeliverableFile(taskId,idx,'submission').then(function(){
    syncUserState();
    var fresh=TASKS.find(function(t){return t.id===taskId;});
    if(fresh)rDetail(fresh);
    toast(esc(name)+' removed');
  }).catch(function(err){toast(err.message||'Could not remove','err');});
}

function sendMsg(id){
  var inp=document.getElementById('ci-'+id);if(!inp||!inp.value.trim())return;
  var text=inp.value.trim();
  inp.value='';
  DataAPI.addDeliverableComment(id,CU.id,text).then(function(){
    syncUserState();
    var fresh=TASKS.find(function(x){return x.id===id;});
    if(fresh)rDetail(fresh);
  }).catch(function(err){inp.value=text;toast(err.message||'Could not send','err');});
}

function doSubmit(id){
  var t=TASKS.find(function(x){return x.id===id;});if(!t)return;
  var n=document.getElementById('sn-'+id);
  var notes=n?n.value.trim():'';

  var btn=document.querySelector('#det-body .btn-green');
  if(btn){btn.disabled=true;btn.textContent='Submitting\u2026';}

  stopT();
  DataAPI.submitDeliverable(id,{notes:notes}).then(function(){
    syncUserState();
    var fresh=TASKS.find(function(x){return x.id===id;});
    if(fresh)rDetail(fresh);
    rAll();
    toast('Submitted! Awaiting manager review \uD83D\uDCE4','ok');
  }).catch(function(err){
    if(btn){btn.disabled=false;btn.textContent='Submit for Review';}
    toast(err.message||'Could not submit','err');
  });
}

function doResubmit(id){
  var t=TASKS.find(function(x){return x.id===id;});if(!t)return;
  DataAPI.updateDeliverable(id,{
    status:'IN_PROGRESS',approvalState:null,rejectionReason:null,
    submissionFiles:[],submissionNotes:''
  }).then(function(){
    syncUserState();
    activateTask(id,false);
    var fresh=TASKS.find(function(x){return x.id===id;});
    if(fresh)rDetail(fresh);
  }).catch(function(err){toast(err.message||'Could not restart','err');});
}
