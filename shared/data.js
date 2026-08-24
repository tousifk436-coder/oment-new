/* OMENT CRM - API DATA ACCESS LAYER
   Replaces the old localStorage database with the Express/MongoDB backend.
*/
(function(root){
  'use strict';
  var API_BASE = (root.OMENT_API_BASE_URL || (root.localStorage && root.localStorage.getItem('oment_api_base')) || 'http://localhost:5000/api').replace(/\/$/,'');
  var TOKEN_KEY='oment_access_token';
  var CURRENT_KEY='oment_current_user';
  var DB=null, CURRENT=null;
  var cache={departments:[],employees:[],projects:[],milestones:[],deliverables:[],subtasks:[],attendance:[],timeEntries:[],invoices:[],notices:[],conversations:[],calendarEvents:[],notifications:[],activity:[],contacts:[],clients:[],callLogs:[],settings:[],caseAudit:[],deadlineChanges:[],notifLog:[]};

  function token(){try{return root.localStorage.getItem(TOKEN_KEY)||'';}catch(e){return '';}}
  function saveToken(t){try{if(t)root.localStorage.setItem(TOKEN_KEY,t);else root.localStorage.removeItem(TOKEN_KEY);}catch(e){}}
  function clone(x){return x==null?x:JSON.parse(JSON.stringify(x));}
  function idOf(x){return x && (x.id!=null?x.id:x._id);}
  function normalize(x){
    if(Array.isArray(x))return x.map(normalize);
    if(!x||typeof x!=='object')return x;
    var o={}; Object.keys(x).forEach(function(k){o[k]=normalize(x[k]);});
    if(o._id!=null && o.id==null){o.id=String(o._id); delete o._id;}
    if(o.__v!=null)delete o.__v;
    return o;
  }
  function err(msg,code){var e=new Error(msg||'Request failed');e.code=code||'ERROR';return Promise.reject(e);}
  async function request(method,path,body,opts){
    opts=opts||{}; var headers={'Accept':'application/json'};
    if(body!==undefined && !(body instanceof FormData)){headers['Content-Type']='application/json';}
    var t=token(); if(t)headers.Authorization='Bearer '+t;
    var r=await fetch(API_BASE+path,{method:method,headers:headers,body:body===undefined?undefined:(body instanceof FormData?body:JSON.stringify(body)),credentials:'include'});
    var data=null; try{data=await r.json();}catch(e){data={};}
    if(r.status===401){saveToken('');CURRENT=null;try{root.localStorage.removeItem(CURRENT_KEY);}catch(e){} }
    if(!r.ok)throw Object.assign(new Error(data.message||'Request failed'),{code:data.code||('HTTP_'+r.status),status:r.status,data:data});
    return normalize(data.data!==undefined?data.data:data);
  }
  async function listResource(name,query){
    var qs=new URLSearchParams(Object.assign({page:1,limit:1000},query||{}));
    var out=await request('GET','/'+name+'?'+qs.toString());
    var rows=out && out.items ? out.items : (Array.isArray(out)?out:[]);
    var cacheKey=name==='calendar'?'calendarEvents':(name==='case-audit'?'caseAudit':(name==='deadline-changes'?'deadlineChanges':name)); cache[cacheKey]=rows; return clone(rows);
  }
  async function getResource(name,id){var d=await request('GET','/'+name+'/'+encodeURIComponent(id)); updateCache(name,d); return clone(d);}
  function updateCache(name,row){
    if(!cache[name])cache[name]=[]; var id=String(idOf(row)); var i=cache[name].findIndex(function(x){return String(idOf(x))===id;});
    if(i>=0)cache[name][i]=row;else cache[name].push(row); return row;
  }
  function removeCache(name,id){cache[name]=(cache[name]||[]).filter(function(x){return String(idOf(x))!==String(id);});}
  async function create(name,p){var d=await request('POST','/'+name,p||{});updateCache(name,d);return clone(d);}
  async function patch(name,id,p){var d=await request('PATCH','/'+name+'/'+encodeURIComponent(id),p||{});updateCache(name,d);return clone(d);}
  async function remove(name,id){var d=await request('DELETE','/'+name+'/'+encodeURIComponent(id));removeCache(name,id);return d||true;}

  function projectProgress(pid){var ms=cache.milestones.filter(function(m){return String(m.projectId)===String(pid);});if(!ms.length)return 0;return Math.round(ms.reduce(function(a,m){return a+milestoneProgress(m.id);},0)/ms.length);}
  function milestoneProgress(mid){var ds=cache.deliverables.filter(function(d){return String(d.milestoneId)===String(mid);});if(!ds.length){var m=cache.milestones.find(function(x){return String(x.id)===String(mid);});return m&&m.status==='DONE'?100:0;}return Math.round(ds.reduce(function(a,d){return a+(Number(d.progressPct)||0);},0)/ds.length);}
  function employeeScore(eid){var ds=cache.deliverables.filter(function(d){return (d.assigneeIds||[]).some(function(x){return String(x)===String(eid);});});var done=ds.filter(function(d){return d.status==='DONE';}).length;var total=ds.length;return {score:total?Math.round(done/total*100):0,sample:total>0,total:total,done:done};}
  function revenueSeries(months){months=Number(months||6);var out=[],now=new Date();for(var i=months-1;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth()-i,1);var y=d.getFullYear(),m=d.getMonth();var rows=cache.invoices.filter(function(inv){var x=new Date(inv.issueDate||inv.createdAt||0);return x.getFullYear()===y&&x.getMonth()===m;});out.push({label:d.toLocaleDateString('en-IN',{month:'short'}),value:rows.reduce(function(a,x){return a+(Number(x.totalPaise)||0);},0),paid:rows.reduce(function(a,x){return a+(Number(x.paidPaise)||0);},0)});}return Promise.resolve(out);}
  async function refreshAll(){
    var names=['departments','employees','projects','milestones','deliverables','subtasks','attendance','timeEntries','invoices','notices','conversations','calendar','activity','contacts','clients','callLogs','notifications','settings','case-audit','deadline-changes'];
    await Promise.all(names.map(async function(n){var key=n==='calendar'?'calendarEvents':n;try{await listResource(n);}catch(e){if(e.status===403||e.status===404)cache[key]=[];else throw e;}}));
    var settingsObj={}; cache.settings.forEach(function(s){if(!s||!s.key)return;if(s.key==='company'&&s.value&&typeof s.value==='object')Object.assign(settingsObj,s.value);else settingsObj[s.key]=s.value;});
    var me=await request('GET','/auth/me'); CURRENT=me; try{root.localStorage.setItem(CURRENT_KEY,JSON.stringify(me));}catch(e){}
    DB={version:2,company:{name:settingsObj.companyName||'Oment'},adminUser:me,departments:cache.departments,employees:cache.employees,projects:cache.projects,milestones:cache.milestones,deliverables:cache.deliverables,subtasks:cache.subtasks,attendance:cache.attendance,timeEntries:cache.timeEntries,invoices:cache.invoices,notices:cache.notices,conversations:cache.conversations,calendarEvents:cache.calendarEvents,notifications:cache.notifications,activity:cache.activity,contacts:cache.contacts,clients:cache.clients,callLogs:cache.callLogs,caseAudit:cache.caseAudit,deadlineChanges:cache.deadlineChanges,notifLog:cache.notifLog,settings:Object.assign({companyName:'Oment',workdayTargetHours:8,currency:'INR',gstRate:18,invoicePrefix:'INV'},settingsObj)};
    return true;
  }
  async function login(email,password){var d=await request('POST','/auth/login',{email:email,password:password});saveToken(d.token);CURRENT=d.user;try{root.localStorage.setItem(CURRENT_KEY,JSON.stringify(CURRENT));}catch(e){} await refreshAll();return clone(CURRENT);}
  function logout(){saveToken('');CURRENT=null;DB=null;Object.keys(cache).forEach(function(k){cache[k]=[];});}
  function auth(){return !!token();}
  function me(){return clone(CURRENT);}
  async function init(){if(!token())return err('Authentication required','AUTH_REQUIRED');if(!DB)await refreshAll();return true;}
  function raw(){return DB;}
  async function reset(){return err('Reset is disabled for the remote database. Delete records from the admin UI instead.','REMOTE_DB');}
  function flush(){return Promise.resolve(true);} function touch(){return DB;} function setLatency(){}

  var DataAPI={
    API_BASE:API_BASE, init:init, login:login, logout:logout, isAuthenticated:auth, currentUser:me, raw:raw, flush:flush, touch:touch, reset:reset, setLatency:setLatency,
    getSettings:function(){return Promise.resolve(clone(DB&&DB.settings||{}));},
    updateSettings:async function(p){var current=cache.settings.find(function(s){return s.key==='company'});var value=Object.assign({},DB.settings,p||{});var d=current?await patch('settings',current.id,{key:'company',value:value}):await create('settings',{key:'company',value:value});await refreshAll();return clone(DB.settings);},
    getEmployees:function(){return listResource('employees');}, getEmployee:function(id){return getResource('employees',id);}, createEmployee:function(p){return create('employees',p);}, updateEmployee:function(id,p){return patch('employees',id,p);}, deleteEmployee:function(id){return remove('employees',id);},
    getDepartments:function(){return listResource('departments');}, createDepartment:function(p){return create('departments',p);}, updateDepartment:function(id,p){return patch('departments',id,p);}, deleteDepartment:function(id){return remove('departments',id);},
    getProjects:function(){return listResource('projects');}, getProject:function(id){return getResource('projects',id);}, createProject:function(p){return create('projects',p);}, updateProject:function(id,p){return patch('projects',id,p);}, deleteProject:function(id){return remove('projects',id);},
    addProjectMember:function(pid,eid){var p=cache.projects.find(function(x){return String(x.id)===String(pid);});var ids=(p&&p.memberIds||[]).slice();if(ids.indexOf(eid)<0)ids.push(eid);return patch('projects',pid,{memberIds:ids});},
    removeProjectMember:function(pid,eid){var p=cache.projects.find(function(x){return String(x.id)===String(pid);});var ids=(p&&p.memberIds||[]).filter(function(x){return String(x)!==String(eid);});return patch('projects',pid,{memberIds:ids});},
    getMilestones:function(pid){return listResource('milestones',pid?{projectId:pid}:{});}, createMilestone:function(p){return create('milestones',p);}, updateMilestone:function(id,p){return patch('milestones',id,p);}, deleteMilestone:function(id){return remove('milestones',id);},
    getDeliverables:function(filter){return listResource('deliverables',filter||{});}, getDeliverable:function(id){return getResource('deliverables',id);}, createDeliverable:function(p){return create('deliverables',p);}, updateDeliverable:function(id,p){return patch('deliverables',id,p);}, deleteDeliverable:function(id){return remove('deliverables',id);},
    submitDeliverable:function(id,opts){opts=opts||{};return request('POST','/deliverables/'+id+'/submit',opts).then(function(d){updateCache('deliverables',d);return clone(d);});},
    approveDeliverable:function(id,note){return request('POST','/deliverables/'+id+'/review',{action:'approve',note:note||''}).then(function(d){updateCache('deliverables',d);return clone(d);});},
    rejectDeliverable:function(id,reason){return request('POST','/deliverables/'+id+'/review',{action:'reject',reason:reason}).then(function(d){updateCache('deliverables',d);return clone(d);});},
    reassignDeliverable:function(id,ids){return request('POST','/deliverables/'+id+'/reassign',{assigneeIds:ids||[]}).then(function(d){updateCache('deliverables',d);return clone(d);});},
    addDeliverableComment:function(id,fromId,text){return request('POST','/deliverables/'+id+'/comments',{body:text,fromId:fromId}).then(function(d){updateCache('deliverables',d);return clone(d);});},
    addDeliverableFiles:function(id,files,which){var patchData={};patchData[which==='submission'?'submissionFiles':'briefFiles']=files||[];return patch('deliverables',id,patchData);},
    removeDeliverableFile:function(id,index,which){var d=cache.deliverables.find(function(x){return String(x.id)===String(id);});if(!d)return err('Deliverable not found','NOT_FOUND');var key=which==='submission'?'submissionFiles':'briefFiles',a=(d[key]||[]).slice();a.splice(index,1);var p={};p[key]=a;return patch('deliverables',id,p);},
    getSubtasks:function(pid){return listResource('subtasks',pid?{deliverableId:pid}:{});}, createSubtask:function(p){return create('subtasks',p);}, updateSubtask:function(id,p){return patch('subtasks',id,p);}, deleteSubtask:function(id){return remove('subtasks',id);},
    approveSubtask:function(id){return patch('subtasks',id,{approvalState:'APPROVED',status:'DONE',rejectionReason:null});}, rejectSubtask:function(id,reason){return patch('subtasks',id,{approvalState:'REJECTED',status:'REJECTED',rejectionReason:reason||'Rejected'});},
    startTimer:function(employeeId,deliverableId){return request('POST','/timers/start',{deliverableId:deliverableId||null}).then(function(d){updateCache('timeEntries',d);if(deliverableId){var task=cache.deliverables.find(function(x){return String(x.id)===String(deliverableId);});if(task)task.status='IN_PROGRESS';}return clone(d);});},
    pauseTimer:function(timerId){return request('POST','/timers/'+encodeURIComponent(timerId)+'/pause',{}).then(function(d){updateCache('timeEntries',d);return clone(d);});},
    resumeTimer:function(timerId){return request('POST','/timers/'+encodeURIComponent(timerId)+'/resume',{}).then(function(d){updateCache('timeEntries',d);return clone(d);});},
    stopTimerById:function(timerId){return request('POST','/timers/'+encodeURIComponent(timerId)+'/stop',{}).then(async function(d){await refreshAll();return d;});},
    stopTimer:async function(employeeId){var open=await request('GET','/timers/open');if(!open)return true;var d=await request('POST','/timers/'+open.id+'/stop',{});await refreshAll();return d;},
    getOpenTimer:function(employeeId){return request('GET','/timers/open');},
    getAttendance:function(filter){var q=filter||{};if(q.employeeId)q.employeeId=q.employeeId;return listResource('attendance',q);},
    ensureTodayAttendance:function(employeeId){return request('POST','/attendance/check-in',{date:new Date().toISOString().slice(0,10)}).then(function(d){updateCache('attendance',d);return d;});},
    updateAttendance:function(id,p){return patch('attendance',id,p);},
    addBreak:function(employeeId,brk){return request('POST','/attendance/break',Object.assign({},brk,{date:brk&&brk.date||new Date().toISOString().slice(0,10)})).then(function(d){updateCache('attendance',d);return d;});},
    getInvoices:function(filter){return listResource('invoices',filter||{});}, peekInvoiceNumber:function(){var n=(DB&&DB.settings&&DB.settings.invoicePrefix||'INV')+'-'+String((cache.invoices.length||0)+1).padStart(4,'0');return Promise.resolve(n);}, createInvoice:function(p){return create('invoices',p);}, updateInvoice:function(id,p){return patch('invoices',id,p);}, sendInvoice:function(id){return request('POST','/invoices/'+id+'/send',{}).then(function(d){updateCache('invoices',d);return d;});}, recordPayment:function(id,amountPaise){return request('POST','/invoices/'+id+'/payment',{amountPaise:Number(amountPaise)}).then(function(d){updateCache('invoices',d);return d;});}, cancelInvoice:function(id,reason){return patch('invoices',id,{status:'CANCELLED',notes:reason||''});}, deleteInvoice:function(id){return remove('invoices',id);}, getUninvoicedMilestones:function(){return Promise.resolve(cache.milestones.filter(function(m){return m.billable&&m.status==='DONE';}));},
    getNotices:function(){return listResource('notices');}, createNotice:function(p){return create('notices',p);}, updateNotice:function(id,p){return patch('notices',id,p);}, sendNotice:function(id){return patch('notices',id,{status:'SENT'});}, markNoticeRead:function(id,employeeId){return patch('notices',id,{readBy:[].concat((cache.notices.find(function(n){return String(n.id)===String(id);})||{}).readBy||[],[employeeId])});}, deleteNotice:function(id){return remove('notices',id);},
    getConversations:function(){return listResource('conversations');}, sendMessage:function(cid,fromId,text){var c=cache.conversations.find(function(x){return String(x.id)===String(cid);});var msgs=(c&&c.messages||[]).slice();msgs.push({senderId:fromId,body:text,createdAt:new Date().toISOString(),readBy:[]});return patch('conversations',cid,{messages:msgs,lastMessageAt:new Date().toISOString()});}, markConversationRead:function(cid){return getResource('conversations',cid);},
    getCalendarEvents:function(){return listResource('calendar');},
    createCalendarEvent:function(p){return create('calendar',p);},
    deleteCalendarEvent:function(id){return remove('calendar',id);},

    // Google Calendar connection for the currently authenticated employee.
    getGoogleCalendarStatus:function(){
      return request('GET','/google-calendar/status');
    },
    connectGoogleCalendar:function(){
      return request('GET','/google-calendar/connect').then(function(data){
        if(!data || !data.authorizationUrl){
          throw new Error('Google Calendar authorization URL was not returned.');
        }
        window.location.href=data.authorizationUrl;
        return data;
      });
    },
    disconnectGoogleCalendar:function(){
      return request('POST','/google-calendar/disconnect',{});
    },
    getNotifications:function(recipientId){return request('GET','/notifications?limit=1000').then(function(a){cache.notifications=a;return clone(a);});}, markNotificationRead:function(id){return request('PATCH','/notifications/'+id+'/read',{}).then(function(d){updateCache('notifications',d);return d;});}, markAllNotificationsRead:async function(recipientId){var rows=cache.notifications.filter(function(n){return !n.read&&(recipientId==null||String(n.recipientId)===String(recipientId));});await Promise.all(rows.map(function(n){return request('PATCH','/notifications/'+n.id+'/read',{});}));await refreshAll();return true;},
    getActivity:function(){return listResource('activity');}, getCallLogs:function(){return listResource('callLogs');}, getRevenueSeries:revenueSeries,
    getKpis:function(){return request('GET','/dashboard/kpis');},
    projectProgress:projectProgress,milestoneProgress:milestoneProgress,employeeScore:employeeScore,
    getContacts:function(){return listResource('contacts');}, createContact:function(p){return create('contacts',p);}, updateContact:function(id,p){return patch('contacts',id,p);},
    getClients:function(){return listResource('clients');}, createClient:function(p){return create('clients',p);}, updateClient:function(id,p){return patch('clients',id,p);},
    createCase:function(p){var payload=Object.assign({kind:'IMMIGRATION',status:'PLANNING'},p||{});return create('projects',payload);}, updateCase:function(id,p,reason){return patch('projects',id,p);}, closeCase:function(id){return patch('projects',id,{status:'COMPLETED'});},
    completeMilestone:function(id,opts){return patch('milestones',id,{status:'DONE',completedAt:new Date().toISOString(),completionNote:opts&&opts.note||null});},
    blockMilestone:function(id,opts){return patch('milestones',id,{status:'BLOCKED',blockReason:opts&&opts.reason||'Blocked',blockedAt:new Date().toISOString(),blockNotes:opts&&opts.notes||null});},
    unblockMilestone:function(id){return patch('milestones',id,{status:'IN_PROGRESS',blockReason:null,blockedAt:null,blockNotes:null});},
    rescheduleMilestone:async function(id,opts){var m=cache.milestones.find(function(x){return String(x.id)===String(id);});if(!m)return err('Milestone not found','NOT_FOUND');var oldDate=m.dueDate;var updated=await patch('milestones',id,{prevDueDate:oldDate,dueDate:opts.newDate,delayReason:opts.reason});await create('deadline-changes',{milestoneId:id,projectId:m.projectId,oldDeadline:oldDate,newDeadline:opts.newDate,reason:opts.reason});return updated;},
    getCaseAudit:function(projectId){return listResource('case-audit',projectId?{projectId:projectId}:{});}, getDeadlineChanges:function(milestoneId){return listResource('deadline-changes',milestoneId?{milestoneId:milestoneId}:{});}, recordAudit:function(action,entityType,entityId,projectId,oldVal,newVal,reason){return create('case-audit',{action:action,entityType:entityType,entityId:entityId,projectId:projectId,oldValue:oldVal,newValue:newVal,reason:reason});},
    logNotification:function(key,payload){var old=cache.notifLog.find(function(n){return n.key===key;});if(old)return Promise.resolve({duplicate:true,entry:old});var e={id:key,key:key,kind:payload&&payload.kind||'INFO',status:payload&&payload.status||'PREPARED',at:new Date().toISOString()};cache.notifLog.push(e);return Promise.resolve({duplicate:false,entry:e});}, getNotificationLog:function(){return Promise.resolve(clone(cache.notifLog));}
  };
  root.DataAPI=DataAPI;if(typeof module!=='undefined'&&module.exports)module.exports=DataAPI;
})(typeof window!=='undefined'?window:globalThis);
