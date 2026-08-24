/* ============================================================
   EMPLOYEES MODULE
   ============================================================ */
function renderEmployees() {
  // Populate dept filter
  const deptFilter = document.getElementById('emp-dept-filter');
  const depts = [...new Set(STATE.employees.map(e=>e.dept))];
  deptFilter.innerHTML = `<option value="">All Departments</option>${depts.map(d=>`<option>${d}</option>`).join('')}`;
  filterEmployees();
}

function setEmpStatus(el, status) {
  STATE.empStatusFilter = status;
  document.querySelectorAll('#emp-status-pills .status-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  filterEmployees();
}

function filterEmployees() {
  const dept = document.getElementById('emp-dept-filter')?.value || '';
  const status = STATE.empStatusFilter;
  const search = document.getElementById('emp-search')?.value?.toLowerCase() || '';
  let filtered = STATE.employees.filter(e =>
    (!dept || e.dept === dept) &&
    (!status || e.status === status) &&
    (!search || e.name.toLowerCase().includes(search))
  );
  const present = filtered.filter(e=>e.status==='Present').length;
  const absent = filtered.filter(e=>e.status==='Absent').length;
  document.getElementById('emp-count-sub').textContent = `${filtered.length} employee${filtered.length!==1?'s':''} found`;
  document.getElementById('emp-stats-pills').innerHTML = `
    <div class="badge badge-grey">Total: ${filtered.length}</div>
    <div class="badge badge-green">Present: ${present}</div>
    <div class="badge badge-red">Absent: ${absent}</div>
  `;
  const grid = document.getElementById('emp-cards-grid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${Icons.badge('users',{tone:'neutral',box:44,size:22})}<div class="empty-title">No employees found</div><div class="empty-sub">Try adjusting your filters</div></div>`;
    return;
  }
  grid.innerHTML = filtered.map(e => {
    const statusDot = e.status==='Present'?'green':e.status==='Absent'?'red':'amber';
    const badgeClass = e.status==='Present'?'badge-green':e.status==='Absent'?'badge-red':'badge-amber';
    const barColor = e.score>=90?'var(--green)':e.score>=80?'var(--blue)':'var(--amber)';
    return `<div class="emp-card" onclick="openEmpDetail(${e.id})">
      <div class="emp-card-top">
        <div class="avatar" style="background:${e.color}">${e.avatar}</div>
        <div class="emp-card-info">
          <div class="emp-card-name">${esc(e.name)}</div>
          <div class="emp-card-role">${esc(e.role)}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span class="badge badge-grey" style="font-size:11px">${esc(e.dept)}</span>
        <span class="badge ${badgeClass}" style="font-size:11px"><span class="status-dot dot-${statusDot}"></span>${e.status}</span>
      </div>
      <div class="emp-card-meta">
        <span>Score: <strong style="color:var(--t1)">${e.score}</strong></span>
        <span>${e.tasks} active tasks</span>
      </div>
      <div class="emp-score-bar"><div class="emp-score-fill" style="width:${e.score}%;background:${barColor}"></div></div>
      <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:10px;justify-content:center">View details ${ICON('chevron-right',12)}</button>
    </div>`;
  }).join('');
}

function openEmpDetail(id) {
  const e = STATE.employees.find(x=>x.id===id);
  if (!e) return;
  const statusBadge = e.status==='Present'?'badge-green':e.status==='Absent'?'badge-red':'badge-amber';
  const empTasks = STATE.tasks.filter(t=>t.assignee===id);

  // Generate attendance heatmap (30 days)
  const attDays = Array.from({length:30},(_, i) => {
    const r = Math.random();
    let cls = 'present';
    if (e.status==='Absent' && i===29) cls='absent';
    else if (e.status==='On Leave' && i>=27) cls='leave';
    else if (r<0.08) cls='absent';
    else if (r<0.12) cls='leave';
    return `<div class="att-day ${cls}">${i+1}</div>`;
  }).join('');

  // Perf chart
  const weeks = ['W1','W2','W3','W4','W5'];
  const perfData = weeks.map(()=>Math.floor(70+Math.random()*25));
  const maxPerf = Math.max(...perfData);
  const perfBars = weeks.map((w,i)=>`<div class="perf-bar-wrap"><div class="perf-bar" style="height:${Math.round((perfData[i]/maxPerf)*72)}px"></div><div class="perf-bar-label">${w}</div></div>`).join('');

  openPanel(e.name, `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
      <div class="avatar avatar-xl" style="background:${e.color}">${e.avatar}</div>
      <div>
        <div style="font-size:18px;font-weight:700">${esc(e.name)}</div>
        <div style="font-size:13px;color:var(--t3);margin-top:2px">${esc(e.role)}</div>
        <div style="margin-top:6px"><span class="badge ${statusBadge}">${e.status}</span></div>
      </div>
    </div>
    <div class="tab-bar">
      <div class="tab-btn active" onclick="switchTab(this,'ep-overview')">Overview</div>
      <div class="tab-btn" onclick="switchTab(this,'ep-tasks')">Tasks</div>
      <div class="tab-btn" onclick="switchTab(this,'ep-perf')">Performance</div>
      <div class="tab-btn" onclick="switchTab(this,'ep-att')">Attendance</div>
    </div>
    <div id="ep-overview" class="tab-pane active">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        ${[['Email',e.email],['Phone',e.phone],['Department',e.dept],['Joined',fmtDate(e.joined)],['Manager',e.manager],['Active Tasks',e.tasks+' tasks']].map(([l,v])=>`<div><div style="font-size:11px;color:var(--t3);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.3px">${l}</div><div style="font-size:13px;font-weight:550;color:var(--t1)">${v}</div></div>`).join('')}
      </div>
    </div>
    <div id="ep-tasks" class="tab-pane">
      ${empTasks.length ? empTasks.map(t=>{
        const sc = t.status==='Done'?'badge-green':t.status==='In Review'?'badge-blue':'badge-amber';
        return `<div style="padding:8px;border:1px solid var(--b1);border-radius:var(--r8);margin-bottom:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <div style="font-size:13px;font-weight:600">${esc(t.title)}</div>
            <span class="badge ${sc}">${t.status}</span>
          </div>
          <div style="font-size:12px;color:var(--t3)">Due: ${fmtDate(t.deadline)} · ${t.hours}h est.</div>
        </div>`;
      }).join('') : '<div class="empty-state">' + Icons.badge('clipboard',{tone:'neutral',box:44,size:22}) + '<div class="empty-title">No tasks assigned</div><div class="empty-sub">Nothing on this person\u2019s plate right now.</div></div>'}
    </div>
    <div id="ep-perf" class="tab-pane">
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:var(--t3);margin-bottom:8px">Weekly Score</div>
        <div class="perf-chart">${perfBars}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        ${[['Overall Score',e.score+'/100','var(--green)'],['On-time Rate','87%','var(--blue)'],['Tasks Done',e.tasks+3,'var(--t1)']].map(([l,v,c])=>`<div style="text-align:center;padding:10px;background:var(--s2);border-radius:var(--r8)"><div style="font-size:18px;font-weight:700;color:${c}">${v}</div><div style="font-size:11px;color:var(--t3);margin-top:2px">${l}</div></div>`).join('')}
      </div>
    </div>
    <div id="ep-att" class="tab-pane">
      <div style="font-size:12px;color:var(--t3);margin-bottom:10px">May 2026 — Present</div>
      <div class="att-calendar">${attDays}</div>
      <div style="display:flex;gap:12px;margin-top:10px">
        <div style="display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--t3)"><div style="width:10px;height:10px;border-radius:2px;background:var(--green)"></div>Present</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--t3)"><div style="width:10px;height:10px;border-radius:2px;background:var(--red-light);border:1px solid rgba(220,38,38,0.2)"></div>Absent</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--t3)"><div style="width:10px;height:10px;border-radius:2px;background:var(--amber-light)"></div>Leave</div>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary btn-sm" onclick="openEditEmpModal(${e.id})">Edit Profile</button>
    <button class="btn btn-danger btn-sm" onclick="showConfirm('Deactivate this employee?', ()=>{toast('Employee deactivated','error');closePanel()})">Deactivate</button>
    <button class="btn btn-blue btn-sm" onclick="openAssignTaskToEmp(${e.id})">
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style="margin-right:4px;vertical-align:-2px"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Assign Task
    </button>
  `);
}

/* ============================================================
   DIRECT TASK ASSIGN — from an employee's profile
   ============================================================ */
function openAssignTaskToEmp(empId) {
  const e = STATE.employees.find(x => x.id === empId);
  if (!e) return;

  // Show only projects the employee can actually be assigned to (not yet finished)
  const activeProjects = STATE.projects.filter(p => p.status !== 'Completed');
  const projOptions = activeProjects.length
    ? activeProjects.map(p => {
        const onTeam = p.team.includes(empId) ? ' \u2022 on team' : '';
        return `<option value="${p.id}">${esc(p.name)} — ${esc(p.client)}${onTeam}</option>`;
      }).join('')
    : `<option value="" disabled>No active projects available</option>`;

  // Default deadline = 7 days from today
  const def = new Date(); def.setDate(def.getDate() + 7);
  const defStr = def.toISOString().split('T')[0];

  // Get current load for context
  const currentTasks = STATE.tasks.filter(t => t.assignee === empId && t.status !== 'Done').length;
  const loadColor = currentTasks >= 5 ? 'var(--red)' : currentTasks >= 3 ? 'var(--amber)' : 'var(--green)';

  openModal(`Assign Task to ${e.name.split(' ')[0]}`, `
    <!-- Employee summary card -->
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--s2);border-radius:var(--r10);margin-bottom:18px">
      <div class="avatar avatar-lg" style="background:${e.color}">${e.avatar}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:650;color:var(--t1)">${esc(e.name)}</div>
        <div style="font-size:11.5px;color:var(--t3);margin-top:1px">${esc(e.role)} · ${esc(e.dept)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:16px;font-weight:700;color:${loadColor}">${currentTasks}</div>
        <div style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:0.4px">Open Tasks</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Task Title *</label>
      <input class="form-input" id="at-title" placeholder="e.g. Prepare client presentation deck">
      <div class="form-error" id="at-title-err">Required</div>
    </div>

    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="at-desc" placeholder="Detailed instructions, deliverables and acceptance criteria…"></textarea>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Project *</label>
        <select class="form-select" id="at-project">
          <option value="">Select a project</option>
          ${projOptions}
        </select>
        <div class="form-error" id="at-project-err">Please select a project</div>
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-select" id="at-priority">
          <option>High</option>
          <option selected>Medium</option>
          <option>Low</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Deadline *</label>
        <input class="form-input" id="at-deadline" type="date" value="${defStr}">
      </div>
      <div class="form-group">
        <label class="form-label">Estimated Hours</label>
        <input class="form-input" id="at-hours" type="number" placeholder="8" value="8" min="1">
      </div>
    </div>

    <div class="form-group">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t2);cursor:pointer">
        <input type="checkbox" id="at-notify" checked style="width:14px;height:14px">
        Notify ${e.name.split(' ')[0]} immediately
      </label>
    </div>

    <div style="font-size:11.5px;color:var(--t3);background:var(--blue-light);padding:8px 10px;border-radius:var(--r8);display:flex;align-items:flex-start;gap:6px;border:1px solid rgba(37,99,235,0.15)">
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:1px;color:var(--blue)"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <span>If ${e.name.split(' ')[0]} isn't already on this project's team, they'll be added automatically.</span>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="confirmAssignTaskToEmp(${empId})">Assign Task</button>`);
}

function confirmAssignTaskToEmp(empId) {
  const title = document.getElementById('at-title').value.trim();
  const projectIdRaw = document.getElementById('at-project').value;
  const projectId = parseInt(projectIdRaw, 10);

  let bad = false;
  if (!title) {
    document.getElementById('at-title').classList.add('input-error');
    document.getElementById('at-title-err').classList.add('show');
    bad = true;
  }
  if (!projectIdRaw || isNaN(projectId)) {
    document.getElementById('at-project').classList.add('input-error');
    document.getElementById('at-project-err').classList.add('show');
    bad = true;
  }
  if (bad) return;

  const emp = STATE.employees.find(x => x.id === empId);
  const proj = STATE.projects.find(x => x.id === projectId);
  if (!emp || !proj) { closeModal(); return; }

  const deadline = document.getElementById('at-deadline').value;
  const hours = parseInt(document.getElementById('at-hours').value, 10) || 8;
  const notify = document.getElementById('at-notify').checked;

  const task = {
    id: Date.now(),
    projectId,
    title,
    assignee: empId,
    status: 'In Progress',
    priority: document.getElementById('at-priority').value,
    deadline: deadline ? fmtDate(deadline) : fmtDate(new Date(Date.now() + 7 * 86400000)),
    hours
  };
  DataAPI.createDeliverable({
    projectId: task.projectId,
    milestoneId: task.milestoneId || null,
    title: task.title,
    description: task.desc || '',
    status: _toCanonicalTaskStatus(task.status),
    priority: _toCanonicalPriority(task.priority),
    assigneeIds: (task.assignees && task.assignees.length ? task.assignees : [task.assignee]).map(String),
    createdById: STATE.adminUser.id,
    origin: 'ADMIN',
    dueAt: task.deadline ? new Date(task.deadline).toISOString() : null,
    estimateSecs: Schema.TIME.hoursToSecs(task.hours || 4)
  }).then(syncState).catch(function (e) { toast(e.message, 'error'); });
  emp.tasks = (emp.tasks || 0) + 1;

  // Auto-add to project team if not already on it
  let addedToTeam = false;
  if (!proj.team.includes(empId)) {
    proj.team.push(empId);
    addedToTeam = true;
  }

  // Activity feed entry
  STATE.activityFeed.unshift({
    icon: 'clipboard',
    color: '#EFF6FF',
    text: `<strong>New task</strong> "${title}" directly assigned to <strong>${esc(emp.name)}</strong> on ${proj.name}`,
    time: 'Just now'
  });

  // Notification entry (acts as the "notify" side-effect)
  if (notify && STATE.notifications) {
    STATE.notifications.unshift({
      id: Date.now() + 1,
      text: `New task assigned: "${title}"`,
      sub: `From admin · ${proj.name}`,
      read: false
    });
  }

  closeModal();
  toast(
    addedToTeam
      ? `Task assigned · ${emp.name.split(' ')[0]} added to ${proj.name}`
      : `Task "${title}" assigned to ${emp.name.split(' ')[0]}`,
    'success'
  );

  // Re-open the employee profile so the admin immediately sees the updated task list
  openEmpDetail(empId);
  // After re-opening, jump to the Tasks tab to surface the new task
  setTimeout(() => {
    const tasksTab = document.querySelector('#slide-panel .tab-btn:nth-child(2)');
    if (tasksTab) tasksTab.click();
  }, 50);
}

function openAddEmpModal() {
  openModal('Add New Employee', `
    <div style="display:flex;align-items:center;justify-content:center;margin-bottom:20px">
      <div class="avatar avatar-xl" style="background:var(--s3);color:var(--t3)">?</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="ae-name" placeholder="Rahul Verma"><div class="form-error" id="ae-name-err">Required</div></div>
      <div class="form-group"><label class="form-label">Email *</label><input class="form-input" id="ae-email" type="email" placeholder="rahul@oment.in"><div class="form-error" id="ae-email-err">Valid email required</div></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="ae-phone" placeholder="+91 98765 00000" type="tel"></div>
      <div class="form-group"><label class="form-label">Role / Designation *</label><input class="form-input" id="ae-role" placeholder="Senior Developer"><div class="form-error" id="ae-role-err">Required</div></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Department *</label><select class="form-select" id="ae-dept"><option value="">Select…</option>${STATE.departments.map(d=>`<option>${esc(d.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Reporting Manager</label><select class="form-select" id="ae-manager"><option value="">Select…</option>${STATE.employees.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Starting Date</label><input class="form-input" id="ae-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Login Password</label><input class="form-input" id="ae-password" type="password" placeholder="Min 8 characters"><div style="font-size:11px;color:var(--t3);margin-top:4px">Leave empty to generate a temporary password.</div></div>
      <div class="form-group" style="display:flex;flex-direction:column;justify-content:flex-end"><label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t2);cursor:pointer"><input type="checkbox" id="ae-genpwd" style="width:14px;height:14px"> Generate password automatically</label></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addEmployee()">Create Employee</button>`);
}

function openEditEmpModal(id) {
  const e = STATE.employees.find(x=>x.id===id);
  if(!e) return;
  openModal(`Edit: ${esc(e.name)}`, `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="ee-name" value="${esc(e.name)}"></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="ee-email" value="${esc(e.email)}" type="email"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="ee-phone" value="${esc(e.phone)}"></div>
      <div class="form-group"><label class="form-label">Role</label><input class="form-input" id="ee-role" value="${esc(e.role)}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Department</label><select class="form-select" id="ee-dept">${STATE.departments.map(d=>`<option${d.name===e.dept?' selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="ee-status"><option${e.status==='Present'?' selected':''}>Present</option><option${e.status==='Absent'?' selected':''}>Absent</option><option${e.status==='On Leave'?' selected':''}>On Leave</option></select></div>
    </div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveEmpEdit(${id})">Save Changes</button>`);
}

function saveEmpEdit(id) {
  const e = STATE.employees.find(x=>x.id===id);
  if (!e) return;
  const name = document.getElementById('ee-name').value.trim();
  if (!name) { toast('Name is required', 'error'); return; }
  const deptName = document.getElementById('ee-dept').value;
  const dept = STATE.departments.find(function (d) { return d.name === deptName; });
  const statusMap = { 'Present':'PRESENT', 'Absent':'ABSENT', 'On Leave':'ON_LEAVE', 'Half Day':'HALF_DAY' };
  DataAPI.updateEmployee(id, {
    name: name,
    email: document.getElementById('ee-email').value.trim(),
    phone: document.getElementById('ee-phone').value.trim(),
    role: document.getElementById('ee-role').value.trim(),
    deptId: dept ? dept.id : null,
    attendanceStatus: statusMap[document.getElementById('ee-status').value] || 'PRESENT',
    avatarInitials: initials(name)
  }).then(function () {
    syncState();
    closeModal();
    closePanel();
    renderEmployees();
    toast(`${esc(name)}'s profile updated`, 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}

function addEmployee() {
  const name = document.getElementById('ae-name')?.value?.trim();
  const email = document.getElementById('ae-email')?.value?.trim();
  const role = document.getElementById('ae-role')?.value?.trim();
  let valid = true;
  if (!name) { document.getElementById('ae-name').classList.add('input-error'); document.getElementById('ae-name-err').classList.add('show'); valid=false; }
  if (!email || !email.includes('@')) { document.getElementById('ae-email').classList.add('input-error'); document.getElementById('ae-email-err').classList.add('show'); valid=false; }
  if (!role) { document.getElementById('ae-role').classList.add('input-error'); document.getElementById('ae-role-err').classList.add('show'); valid=false; }
  if (!valid) return;
  const dept = document.getElementById('ae-dept').value || STATE.departments[0]?.name || 'General';
  const managerId = document.getElementById('ae-manager').value;
  const password = document.getElementById('ae-password')?.value || ('Oment@' + Math.random().toString(36).slice(2,10));
  const manager = STATE.employees.find(e=>e.id==managerId);
  const newEmp = {
    id: Date.now(), name, role, dept, email,
    phone: document.getElementById('ae-phone').value,
    status: 'Present', score: 75, tasks: 0,
    joined: new Date().toISOString().split('T')[0],
    manager: manager?.name || 'Rajesh Kumar',
    avatar: initials(name),
    color: getColor(STATE.employees.length)
  };
  DataAPI.createEmployee({
    name: newEmp.name, role: newEmp.role, email: newEmp.email, phone: newEmp.phone,
    deptId: (STATE.departments.find(function (d) { return d.name === newEmp.dept; }) || {}).id,
    avatarBg: newEmp.color, avatarFg: '#ffffff', color: newEmp.color,
    joinedAt: Utils.isoDate(new Date()), password: password, canLogin: true, active: true
  }).then(function(emp){ syncState(); if(document.getElementById('ae-password') && !document.getElementById('ae-password').value) alert('Temporary login password for '+name+': '+password); }).catch(function (e) { toast(e.message, 'error'); });
  closeModal();
  renderEmployees();
  toast(`${name} added successfully`, 'success');
  STATE.activityFeed.unshift({ icon:'user-plus', color:'#EFF6FF', text:`<strong>New employee</strong> ${name} (${role}) joined ${dept}`, time:'Just now' });
}

