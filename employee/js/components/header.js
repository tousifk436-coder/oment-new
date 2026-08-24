// ══════════════════════════════════════════════
// LOGIN / LOGOUT / USER
// ══════════════════════════════════════════════

function buildLogin(){
  document.getElementById('elist').innerHTML=USERS.map(function(u){
    return '<div class="ec" onclick="doLogin('+u.id+')">'+
      av(u.avBg,u.avFg,u.ini,40)+
      '<div><div class="ec-name">'+esc(u.name)+'</div><div class="ec-role">'+esc(u.role)+' · '+esc(u.dept)+'</div></div>'+
      '<span class="ec-status" style="background:#ECFDF5;color:#059669">Active</span>'+
    '</div>';
  }).join('');
}

function doLogin(uid){
  var user=USERS.find(function(u){return u.id===uid;});
  if(!user)return;
  CU=user;

  DataAPI.ensureTodayAttendance(uid).then(function(){
    // Sirf IS user ka data project hota hai — pehle sab ko same list dikhti thi
    syncUserState();
    document.getElementById('s-login').classList.remove('on');
    document.getElementById('s-app').classList.add('on');
    applyUser();
    clearInterval(wiv);wiv=setInterval(tickAtt,1000);
    document.addEventListener('mousemove',function(){lastAct=Date.now();});
    document.addEventListener('keydown',function(){lastAct=Date.now();});
    document.addEventListener('click',function(){lastAct=Date.now();});
    rAll();
    if(typeof empInjectGuide==='function')empInjectGuide('dashboard');
    toast('Welcome back, '+esc(CU.name.split(' ')[0])+'! \uD83D\uDC4B','ok');
  }).catch(function(err){
    CU=null;
    toast(err.message||'Could not sign in','err');
  });
}

function applyUser(){
  if(!CU)return;
  function setAv(id){var el=document.getElementById(id);if(el){el.textContent=CU.ini;el.style.background=CU.avBg;el.style.color=CU.avFg;}}
  setAv('sb-av');setAv('mob-av');setAv('sb-bot-av');
  document.getElementById('sb-uname').textContent=CU.name;
  document.getElementById('sb-urole').textContent=CU.role;
  document.getElementById('sb-bot-name').textContent=CU.name;
}

function doLogout(){
  sDlg('Log out?','Your session and attendance will be saved.',function(){
    var att=todayAtt();
    att.logout=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false});
    if(att.active<14400&&att.active>0)att.status='Half Day';
    if(CU)DataAPI.stopTimer(CU.id);
    stopT();clearInterval(wiv);ws=false;tsecs=0;SW.reset();
    TASKS.forEach(function(t){t.active=false;});
    DataAPI.logout();CU=null;TASKS=[];PROJECTS=[];ATT_LOG=[];NOTIFS=[];
    document.getElementById('s-app').classList.remove('on');
    document.getElementById('s-login').classList.add('on');
    document.querySelectorAll('.view').forEach(function(v){v.classList.remove('on');});
    document.getElementById('v-dashboard').classList.add('on');
    document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('on');});
    document.querySelector('[data-v=dashboard]').classList.add('on');
  });
}

function connectEmployeeGoogleCalendar(){
  DataAPI.getGoogleCalendarStatus().then(function(status){
    if(status && status.connected){
      toast('Google Calendar is already connected', 'ok');
      return null;
    }
    if(status && status.configured === false){
      toast('Google Calendar is not configured on the server', 'err');
      return null;
    }
    return DataAPI.connectGoogleCalendar();
  }).catch(function(error){
    toast(error.message || 'Unable to connect Google Calendar', 'err');
  });
}
