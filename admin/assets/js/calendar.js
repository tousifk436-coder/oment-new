/* ============================================================
   CALENDAR MODULE
   ============================================================ */
function renderCalendar() {
  const v = document.getElementById('view-calendar');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const m = STATE.calMonth, y = STATE.calYear;
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const todayDate = 14, todayMonth = 4, todayYear = 2026;
  const prevDays = new Date(y, m, 0).getDate();

  const typeColors = {meeting:'var(--blue)',deadline:'var(--red)',reminder:'var(--amber)',holiday:'var(--green)',task:'#7C3AED'};
  const typeLabels = {meeting:'Meeting',deadline:'Deadline',reminder:'Reminder',holiday:'Holiday',task:'Task Due'};
  const typeBgs = {meeting:'var(--blue-light)',deadline:'var(--red-light)',reminder:'var(--amber-light)',holiday:'var(--green-light)',task:'#F5F3FF'};

  function eventsForDay(d) {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return STATE.calendarEvents.filter(e => e.date === ds);
  }

  let cells = '';
  // Header row
  days.forEach(d => { cells += `<div class="cal-head-cell">${d}</div>`; });
  // Previous month filler
  for (let i = firstDay - 1; i >= 0; i--) {
    cells += `<div class="cal-day other">${prevDays - i}</div>`;
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = (d === todayDate && m === todayMonth && y === todayYear);
    const evs = eventsForDay(d);
    let evHTML = evs.slice(0,3).map(e => `<div class="cal-evt" style="background:${typeBgs[e.type]||'var(--s2)'};color:${typeColors[e.type]||'var(--t2)'}">${e.time ? e.time+' ' : ''}${e.title}</div>`).join('');
    if (evs.length > 3) evHTML += `<div class="cal-evt" style="color:var(--t3);background:var(--s2)">+${evs.length-3} more</div>`;
    cells += `<div class="cal-day${isToday?' today':''}" onclick="calDayClick(${d})"><div class="cal-day-num${isToday?' today-num':''}">${d}</div>${evHTML}</div>`;
  }
  // Next month filler
  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - totalCells % 7) % 7;
  for (let i = 1; i <= remaining; i++) {
    cells += `<div class="cal-day other">${i}</div>`;
  }

  // Today's events for sidebar
  const todayEvs = eventsForDay(todayDate);
  const upcomingEvs = STATE.calendarEvents.filter(e => { const ed = new Date(e.date); const td = new Date('2026-05-14'); return ed >= td && ed <= new Date('2026-05-21'); }).sort((a,b) => new Date(a.date)-new Date(b.date));

  v.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <div>
        <div class="section-title" style="font-size:20px">Calendar</div>
        <div class="section-sub">Manage events, deadlines &amp; reminders</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r8);padding:4px 8px">
          <button class="btn btn-secondary btn-sm" style="padding:4px 8px;min-width:32px" onclick="calNav(-1)">‹</button>
          <span style="font-weight:600;font-size:14px;min-width:130px;text-align:center">${months[m]} ${y}</span>
          <button class="btn btn-secondary btn-sm" style="padding:4px 8px;min-width:32px" onclick="calNav(1)">›</button>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="calNav(0);renderCalendar()">Today</button>
        <button class="btn btn-primary btn-sm" onclick="calAddEvent()">+ Add Event</button>
      </div>
    </div>
    <div class="cal-layout" style="display:grid;grid-template-columns:1fr 260px;gap:20px">
      <div class="card card-pad">
        <div class="cal-grid">${cells}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;overflow-y:auto;max-height:calc(100vh - 200px)">
        <div class="card card-pad">
          <div class="section-title" style="font-size:13px;margin-bottom:12px">Today's Events</div>
          ${todayEvs.length ? todayEvs.map(e => `<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--b1);align-items:center"><span style="width:8px;height:8px;border-radius:50%;background:${typeColors[e.type]};flex-shrink:0"></span><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600">${e.title}</div>${e.time?`<div style="font-size:11px;color:var(--t3)">${e.time} – ${e.endTime}</div>`:''}</div></div>`).join('') : '<div style="color:var(--t3);font-size:12px;padding:10px 0;text-align:center">No events today</div>'}
        </div>
        <div class="card card-pad">
          <div class="section-title" style="font-size:13px;margin-bottom:12px">Upcoming (7 days)</div>
          ${upcomingEvs.slice(0,6).map(e => {
            const dt = new Date(e.date); const dayNum = dt.getDate(); const mon = months[dt.getMonth()].slice(0,3);
            return `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--b1)"><div style="text-align:center;min-width:36px"><div style="font-size:11px;color:var(--t3)">${mon}</div><div style="font-size:16px;font-weight:600;color:var(--t1)">${dayNum}</div></div><div style="flex:1"><div style="font-size:12px;font-weight:500">${e.title}</div><div style="font-size:11px;color:var(--t3)">${typeLabels[e.type]||e.type}${e.time?' · '+e.time:''}</div></div><span style="width:6px;height:6px;border-radius:50%;background:${typeColors[e.type]};margin-top:5px;flex-shrink:0"></span></div>`;
          }).join('')}
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="calAddEvent()">+ Add Reminder</button>
      </div>
    </div>
  `;
}

function calNav(dir) {
  if (dir === 0) {
    // Go to today
    const now = new Date();
    STATE.calMonth = now.getMonth();
    STATE.calYear = now.getFullYear();
  } else {
    STATE.calMonth += dir;
    if (STATE.calMonth > 11) { STATE.calMonth = 0; STATE.calYear++; }
    if (STATE.calMonth < 0) { STATE.calMonth = 11; STATE.calYear--; }
  }
  renderCalendar();
}

function calDayClick(d) {
  const ds = `${STATE.calYear}-${String(STATE.calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const evs = STATE.calendarEvents.filter(e=>e.date===ds);
  if (evs.length) {
    const html = evs.map(e => `<div style="padding:10px;background:var(--s2);border-radius:var(--r8);margin-bottom:8px"><div style="font-weight:600;font-size:13px">${e.title}</div><div style="font-size:12px;color:var(--t2);margin-top:4px">${e.desc||''}</div>${e.time?`<div style="font-size:11px;color:var(--t3);margin-top:4px">${e.time} – ${e.endTime}</div>`:''}<span class="status-pill ${e.type==='meeting'?'active':e.type==='deadline'?'overdue':''}" style="margin-top:6px;display:inline-block">${e.type.charAt(0).toUpperCase()+e.type.slice(1)}</span></div>`).join('');
    openPanel(`Events — ${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][STATE.calMonth]}`, html, `<button class="btn btn-primary btn-sm" onclick="calAddEvent()">+ Add Event</button>`);
  }
}

function calAddEvent() {
  openModal('New Event', `
    <div class="form-group"><label class="form-label">Title <span class="req">*</span></label><input class="form-input" id="cal-title" placeholder="Event title"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date</label><input class="form-input" id="cal-date" type="date" value="2026-05-14"></div>
      <div class="form-group"><label class="form-label">Time</label><input class="form-input" id="cal-time" type="time" value="10:00"></div>
    </div>
    <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="cal-type"><option value="meeting">Meeting</option><option value="reminder">Reminder</option><option value="deadline">Deadline</option><option value="holiday">Holiday</option></select></div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="cal-desc" placeholder="Optional description"></textarea></div>
    <div class="form-group"><label class="form-label">Priority</label><select class="form-select" id="cal-prio"><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></select></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveCalEvent()">Save Event</button>`);
}

function saveCalEvent() {
  const t = document.getElementById('cal-title').value.trim();
  if (!t) { toast('Title is required', 'error'); return; }
  const date = document.getElementById('cal-date').value;
  if (!date) { toast('Pick a date', 'error'); return; }
  const typeColors = { Meeting:'#2563EB', Review:'#7C3AED', Call:'#059669', Client:'#D97706', Deadline:'#DC2626' };
  const type = document.getElementById('cal-type').value;
  DataAPI.createCalendarEvent({
    title: t, date: date,
    time: document.getElementById('cal-time').value,
    endTime: '',
    type: type,
    color: typeColors[type] || '#2563EB',
    desc: document.getElementById('cal-desc').value,
    priority: document.getElementById('cal-prio').value
  }).then(function () {
    syncState();
    closeModal();
    renderCalendar();
    toast('Event added to calendar', 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}


/* ============================================================
   CSS for new modules (injected)
   ============================================================ */
(function injectCalendarCSS(){
  const s = document.createElement('style');
  s.textContent = `
    .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; background:var(--b1); border-radius:var(--r8); overflow:hidden; }
    .cal-head-cell { background:var(--s2); padding:8px; text-align:center; font-size:11px; font-weight:500; color:var(--t3); text-transform:uppercase; letter-spacing:0.04em; }
    .cal-day { background:var(--surface); padding:6px 8px; min-height:90px; cursor:pointer; transition:background .15s var(--ease); position:relative; }
    .cal-day:hover { background:var(--s2); }
    .cal-day.other { background:var(--bg); color:var(--t4); }
    .cal-day.today { background:var(--blue-light); }
    .cal-day-num { font-size:12px; font-weight:500; display:inline-block; width:22px; height:22px; border-radius:50%; text-align:center; line-height:22px; }
    .today-num { background:var(--blue); color:#fff; font-weight:600; }
    .cal-evt { font-size:10px; padding:1px 5px; border-radius:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; font-weight:500; }
    @media(max-width:1024px) {
      .cal-layout { grid-template-columns:1fr !important; }
    }
    @media(max-width:768px) {
      .cal-layout { grid-template-columns:1fr !important; }
      .cal-day { min-height:60px; padding:4px; }
      .cal-evt { font-size:9px !important; padding:1px 3px !important; }
    }
    @media(max-width:480px) {
      .cal-layout { grid-template-columns:1fr !important; }
      .cal-day { min-height:48px; padding:3px 2px; }
      .cal-evt { display:none; }
      .cal-day-num { font-size:10px; width:18px; height:18px; line-height:18px; }
      .cal-head-cell { font-size:9px; padding:4px 2px; }
    }
  `;
  document.head.appendChild(s);
})();
