// ══════════════════════════════════════════════
// PERFORMANCE
// ══════════════════════════════════════════════

function rPerf(){
  var el=document.getElementById('perf-body');if(!el)return;
  var appr=TASKS.filter(function(t){return t.status==='approved';}).length;
  var total=TASKS.length;
  var rej=TASKS.filter(function(t){return t.status==='rejected';}).length;
  var score=total?Math.round(appr/total*100):0;
  var selfDone=TASKS.filter(function(t){return t.self&&t.saStatus==='approved';}).length;
  var selfTotal=TASKS.filter(function(t){return t.self;}).length;

  el.innerHTML=
    '<div class="shd"><div><div class="stitle">Performance</div>' +
    '<div class="ssub">Delivery, on-time aur estimate accuracy se bana score</div></div></div>' +
    '<div class="card" style="margin-bottom:14px;padding:12px 14px;font-size:12.5px;color:var(--t2);line-height:1.6">' +
      'Ye score teen cheezon se banta hai: kitna kaam poora hua, kitna time pe hua, aur estimate ' +
      'kitna sahi tha. Naya task milne se score girta nahi \u2014 in-progress kaam ka bhi partial ' +
      'credit milta hai.</div>' +
    '<div class="sbar">'+
    '<div class="scard"><div class="sl">Score</div><div class="sv" style="color:var(--blue)">'+score+'</div><div class="ss">out of 100</div></div>'+
    '<div class="scard"><div class="sl">Completion</div><div class="sv" style="color:var(--green)">'+appr+'/'+total+'</div><div class="ss">tasks done</div></div>'+
    '<div class="scard"><div class="sl">Rejections</div><div class="sv" style="color:'+(rej>0?'var(--red)':'var(--green)')+'">'+rej+'</div><div class="ss">'+(rej>0?'needs work':'clean')+'</div></div>'+
    '<div class="scard"><div class="sl">Self Tasks</div><div class="sv" style="color:var(--purple)">'+selfDone+'/'+selfTotal+'</div><div class="ss">approved</div></div>'+
    '</div>'+
    '<div class="pgrid" style="margin-bottom:14px">'+
    '<div class="pbox">'+
    '<div class="pbx-t">Performance Score</div>'+
    '<div style="display:flex;justify-content:center;margin-bottom:10px">'+
    '<svg width="110" height="110" viewBox="0 0 110 110">'+
    '<circle cx="55" cy="55" r="46" fill="none" stroke="var(--s3)" stroke-width="10"/>'+
    '<circle cx="55" cy="55" r="46" fill="none" stroke="'+(score>=80?'var(--green)':score>=60?'var(--amber)':'var(--red)')+'" stroke-width="10" stroke-dasharray="'+(2*Math.PI*46)+'" stroke-dashoffset="'+(2*Math.PI*46*(1-score/100))+'" stroke-linecap="round" transform="rotate(-90 55 55)"/>'+
    '<text x="55" y="50" text-anchor="middle" font-family="Geist Mono,monospace" font-size="20" font-weight="700" fill="var(--t1)">'+score+'</text>'+
    '<text x="55" y="65" text-anchor="middle" font-family="Geist,sans-serif" font-size="11" fill="var(--t3)">/ 100</text>'+
    '</svg></div>'+
    '<div style="text-align:center;font-size:13px;font-weight:700">'+(CU?CU.name:'')+'</div>'+
    '<div style="text-align:center;font-size:11.5px;color:var(--t3)">'+(CU?CU.role:'')+'</div>'+
    '</div>'+
    '<div class="pbox">'+
    '<div class="pbx-t">Task Breakdown</div>'+
    [['To Do',TASKS.filter(function(t){return t.status==='todo';}).length,'var(--t3)'],
     ['In Progress',TASKS.filter(function(t){return t.status==='inprogress';}).length,'var(--blue)'],
     ['Submitted',TASKS.filter(function(t){return t.status==='submitted';}).length,'var(--purple)'],
     ['Approved',appr,'var(--green)'],
     ['Rejected',rej,'var(--red)']].map(function(row){
      var l=row[0],c=row[1],col=row[2];
      return'<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--b)">'+
        '<div style="width:7px;height:7px;border-radius:50%;background:'+col+'"></div>'+
        '<span style="flex:1;font-size:12.5px">'+l+'</span>'+
        '<span style="font-size:13px;font-weight:700;font-family:var(--mono)">'+c+'</span>'+
        '<div style="width:50px;height:4px;background:var(--s2);border-radius:99px;overflow:hidden"><div style="height:100%;width:'+(total?Math.round(c/total*100):0)+'%;background:'+col+';border-radius:99px"></div></div>'+
      '</div>';
    }).join('')+
    '</div></div>';
}
