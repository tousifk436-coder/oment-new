// ══════════════════════════════════════════════
// WORK SESSION + TIMER + BREAK
// ══════════════════════════════════════════════

function startWork(){
  ws=true;wsAt=Date.now();
  var next=TASKS.find(function(t){return t.status==='todo';});
  if(next)activateTask(next.id,true);
  document.getElementById('brk-btn').style.display='flex';
  rAll();toast('Work session started','ok');
}

function endWork(){
  ws=false;stopT();
  TASKS.forEach(function(t){t.active=false;});
  var bb=document.getElementById('brk-btn');if(bb)bb.style.display='none';
  syncUserState();
  updWP();rAll();toast('Session ended. Good work!');
}

/* Timestamp-based. Pehle setInterval counter tha — background tab mein browser
   interval throttle karta hai (1s -> 60s), isliye logged time kam count hota
   tha. Payroll/billing ke liye ye serious bug tha. */
function startT(task){
  SW.reset();
  SW.start(task.logged||0);
  trun=true;
  clearInterval(tiv);
  if(CU){
    DataAPI.startTimer(CU.id,task.id).then(function(entry){
      task.timerId=entry&&entry.id?entry.id:task.timerId;
      task.timerStatus='RUNNING';
    }).catch(function(err){
      trun=false; SW.pause(); toast(err.message||'Could not start server timer','err'); rAll();
    });
  }
  tiv=setInterval(function(){if(!trun||onBrk)return;tsecs=SW.elapsedSecs();task.logged=tsecs;rTmr();},1000);
}

function stopT(){
  var active=TASKS.find(function(t){return t.active;});
  if(trun){SW.pause();tsecs=SW.elapsedSecs();}
  trun=false; clearInterval(tiv);
  if(CU){
    var p=active&&active.timerId?DataAPI.stopTimerById(active.timerId):DataAPI.stopTimer(CU.id);
    p.catch(function(){});
  }
  if(active){active.timerStatus='STOPPED';active.timerId=null;active.active=false;}
}

function toggleT(){
  var a=TASKS.find(function(t){return t.active;}); if(!a)return;
  if(trun){
    SW.pause(); tsecs=SW.elapsedSecs(); trun=false; clearInterval(tiv);
    a.timerStatus='PAUSED';
    if(CU&&a.timerId)DataAPI.pauseTimer(a.timerId).catch(function(err){toast(err.message||'Could not pause timer','err');});
    a.tl.push({type:'pause',text:'Timer paused',time:'Now'});
  }else{
    trun=true; SW.start(); a.timerStatus='RUNNING';
    if(CU&&a.timerId)DataAPI.resumeTimer(a.timerId).catch(function(err){toast(err.message||'Could not resume timer','err');});
    else if(CU){startT(a);return;}
    a.tl.push({type:'resume',text:'Timer resumed',time:'Now'});
    clearInterval(tiv);
    tiv=setInterval(function(){if(!trun||onBrk)return;tsecs=SW.elapsedSecs();a.logged=tsecs;rTmr();},1000);
  }
  updWP();rTmr();rDash();
}

function rTmr(){
  var ft=document.getElementById('fc-timer');if(ft)ft.textContent=fmtMono(tsecs);
  var dt=document.getElementById('det-timer');if(dt)dt.textContent=fmtMono(tsecs);
  var st=document.getElementById('stat-time');if(st)st.textContent=fmtSh(tsecs);
  updWP();
  var a=TASKS.find(function(t){return t.active;});
  if(a){
    var exp=(a.exp||3600);var diff=tsecs-exp;
    var ctx=document.getElementById('fc-ctx');
    if(ctx){
      var ov=diff>60,un=diff<-60;
      ctx.innerHTML='<div class="fc-cc"><div class="fc-cc-l">Expected</div><div class="fc-cc-v">'+fmtSh(exp)+'</div></div>'+
        '<div class="fc-sep"></div>'+
        '<div class="fc-cc"><div class="fc-cc-l">Actual</div><div class="fc-cc-v '+(ov?'ov':un?'un':'')+'">'+fmtSh(tsecs)+'</div></div>'+
        '<div class="fc-sep"></div>'+
        '<div class="fc-cc"><div class="fc-cc-l">'+(ov?'Over':un?'Saved':'Status')+'</div><div class="fc-cc-v '+(ov?'ov':un?'un':'')+'">'+
        (Math.abs(diff)<60?ICON('check',13):(ov?'+':'-')+fmtSh(Math.abs(diff)))+'</div></div>';
    }
  }
}

function updWP(){
  var dot=document.getElementById('wp-dot'),lbl=document.getElementById('wp-lbl'),tm=document.getElementById('wp-tm');
  if(!dot||!lbl)return;
  if(onBrk){dot.className='wp-dot brk';lbl.textContent='On Break · '+(brkType||'');if(tm&&brkAt)tm.textContent=fmtMono(Math.floor((Date.now()-brkAt)/1000));}
  else if(ws&&trun){dot.className='wp-dot working';lbl.textContent='Working';if(tm)tm.textContent=fmtMono(tsecs);}
  else if(ws){dot.className='wp-dot paused';lbl.textContent='Paused';if(tm)tm.textContent=fmtMono(tsecs);}
  else{dot.className='wp-dot idle';lbl.textContent='Not started';if(tm)tm.textContent='';}
}

function activateTask(id,silent){
  TASKS.forEach(function(t){t.active=false;});
  var task=TASKS.find(function(t){return t.id===id;});if(!task)return;

  if(task.status==='approved'){toast('This task is already approved','err');return;}
  if(task.status==='submitted'){toast('Awaiting review \u2014 you can\'t restart it','err');return;}

  task.active=true;
  if(task.status==='todo'){
    task.status='inprogress';
    task.tl.push({type:'start',text:'Started',time:'Now'});
  }
  if(!ws){ws=true;wsAt=Date.now();var bb=document.getElementById('brk-btn');if(bb)bb.style.display='flex';}
  stopT();startT(task);
  var att=todayAtt();if(att.tasks.indexOf(id)<0)att.tasks.push(id);
  if(!silent){rAll();toast('Started: "'+esc(task.title.slice(0,32))+'\u2026"','ok');}
  else{updWP();rDash();updBadges();}
}

function confirmSwitch(id){
  var cur=TASKS.find(function(t){return t.active;});
  if(!cur){activateTask(id);return;}
  sDlg('Switch Task?','Your timer is saved. Switch to new task?',function(){activateTask(id);});
}

// ── BREAK ──
function oBrk(){
  if(onBrk){endBrk();return;}
  oMod('Take a Break',
    '<div class="fg"><label class="fl">Break Type</label>'+
    '<div class="ptog" id="bp"><button class="popt on" onclick="setPT(this,\'bp\');_bType=\'Lunch\'">'+ICON('utensils',12)+' Lunch</button>'+
    '<button class="popt" onclick="setPT(this,\'bp\');_bType=\'Tea\'">'+ICON('coffee',12)+' Tea</button>'+
    '<button class="popt" onclick="setPT(this,\'bp\');_bType=\'Personal\'">'+ICON('run',12)+' Personal</button>'+
    '<button class="popt" onclick="setPT(this,\'bp\');_bType=\'Other\'">'+ICON('pause',12)+' Other</button></div></div>',
  [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Start Break',cls:'btn-solid',a:startBrk}]);
}

function startBrk(){
  onBrk=true;brkAt=Date.now();brkType=_bType;
  var a=TASKS.find(function(t){return t.active;});if(a&&trun)stopT();
  updWP();rAll();toast('Break started: '+brkType);cMod();
}

function endBrk(){
  if(!onBrk)return;
  var startedAt=new Date(brkAt).toISOString();
  var endedAt=new Date().toISOString();
  var secs=Math.round((Date.now()-brkAt)/1000);
  if(CU){
    DataAPI.addBreak(CU.id,{type:brkType,startAt:startedAt,endAt:endedAt,secs:secs})
      .then(function(){syncUserState();}).catch(function(){});
  }
  onBrk=false;brkAt=null;brkType=null;
  var a=TASKS.find(function(t){return t.active;});if(a&&ws)startT(a);
  updWP();rAll();toast('Break ended \u2014 back to work');
}
