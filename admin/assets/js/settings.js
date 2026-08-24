/* ============================================================================
   SETTINGS MODULE
   ----------------------------------------------------------------------------
   Pehle ye file 8 lines ka khaali comment thi — tab khulta tha, form dikhta
   tha, kuch save nahi hota tha. Ab actually kaam karta hai: values DataAPI
   se load hoti hain, validate hoti hain, aur persist hoti hain.
   ============================================================================ */

function renderSettings() {
  const v = document.getElementById('view-settings');
  if (!v) return;
  const s = STATE.settings || {};
  const tab = STATE.settingsTab || 'company';

  const tabs = [
    ['company', 'Company'],
    ['billing', 'Billing & GST'],
    ['work', 'Work & Attendance'],
    ['notify', 'Notifications'],
    ['calendar', 'Google Calendar'],
    ['data', 'Data']
  ];

  v.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <div class="section-title" style="font-size:20px">Settings</div>
        <div class="section-sub">Company profile, billing defaults and workspace preferences</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="saveSettings()">Save changes</button>
    </div>

    <div class="tab-bar" style="margin-bottom:18px">
      ${tabs.map(([k, label]) => `
        <button class="tab-btn${tab === k ? ' active' : ''}" onclick="setSettingsTab('${k}')">${label}</button>
      `).join('')}
    </div>

    <div id="settings-pane">${_settingsPane(tab, s)}</div>
  `;

  if (tab === 'calendar') {
    setTimeout(checkGoogleCalendarStatus, 0);
  }
}

function setSettingsTab(tab) {
  STATE.settingsTab = tab;
  renderSettings();
}

function _settingsPane(tab, s) {
  if (tab === 'company') return `
    <div class="card card-pad" style="max-width:720px">
      <div class="form-group">
        <label class="form-label">Company name *</label>
        <input class="form-input" id="set-company" value="${escAttr(s.companyName || '')}">
        <div class="form-error" id="set-company-err">Company name is required</div>
      </div>
      <div class="form-group">
        <label class="form-label">Registered address</label>
        <textarea class="form-textarea" id="set-address" rows="3">${esc(s.address || '')}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="form-group">
          <label class="form-label">Billing email</label>
          <input class="form-input" id="set-email" type="email" value="${escAttr(s.email || '')}">
          <div class="form-error" id="set-email-err">Enter a valid email address</div>
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" id="set-phone" value="${escAttr(s.phone || '')}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Signed-in as</label>
        <input class="form-input" value="${escAttr((STATE.adminUser || {}).name || '')} \u00B7 Super Admin" disabled style="opacity:.6">
        <div class="form-hint">Role changes require a workspace owner. Not editable here.</div>
      </div>
    </div>`;

  if (tab === 'billing') return `
    <div class="card card-pad" style="max-width:720px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="form-group">
          <label class="form-label">GSTIN</label>
          <input class="form-input" id="set-gstin" value="${escAttr(s.gstin || '')}" placeholder="27AABCO1234F1Z5">
          <div class="form-error" id="set-gstin-err">GSTIN must be 15 characters</div>
        </div>
        <div class="form-group">
          <label class="form-label">Place of supply (state code) *</label>
          <input class="form-input" id="set-state" value="${escAttr(s.stateCode || '')}" placeholder="27" maxlength="2">
          <div class="form-hint">Client isi state mein ho toh CGST+SGST, warna IGST lagega.</div>
          <div class="form-error" id="set-state-err">Enter a 2-digit state code</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="form-group">
          <label class="form-label">Default GST rate (%)</label>
          <input class="form-input" id="set-gstrate" type="number" min="0" max="28" step="0.5" value="${Number(s.gstRate || 18)}">
          <div class="form-error" id="set-gstrate-err">Rate must be between 0 and 28</div>
        </div>
        <div class="form-group">
          <label class="form-label">Invoice number prefix</label>
          <input class="form-input" id="set-prefix" value="${escAttr(s.invoicePrefix || 'INV')}" maxlength="8">
          <div class="form-hint">Format: PREFIX/FY/0001 \u00B7 numbers kabhi reuse nahi hote.</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Currency</label>
        <select class="form-select" id="set-currency">
          <option value="INR" ${s.currency === 'INR' ? 'selected' : ''}>INR \u2014 Indian Rupee</option>
          <option value="USD" ${s.currency === 'USD' ? 'selected' : ''}>USD \u2014 US Dollar</option>
        </select>
      </div>
    </div>`;

  if (tab === 'work') return `
    <div class="card card-pad" style="max-width:720px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="form-group">
          <label class="form-label">Standard workday (hours)</label>
          <input class="form-input" id="set-workday" type="number" min="1" max="16" step="0.5" value="${Number(s.workdayTargetHours || 8)}">
          <div class="form-error" id="set-workday-err">Must be between 1 and 16 hours</div>
        </div>
        <div class="form-group">
          <label class="form-label">Week starts on</label>
          <select class="form-select" id="set-weekstart">
            <option value="monday" ${s.weekStart === 'monday' ? 'selected' : ''}>Monday</option>
            <option value="sunday" ${s.weekStart === 'sunday' ? 'selected' : ''}>Sunday</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="set-autoapprove" ${s.autoApproveSelfTasks ? 'checked' : ''}>
          <span>
            <span style="font-weight:600;font-size:13px">Auto-approve self-assigned tasks</span>
            <span style="display:block;font-size:12px;color:var(--t3)">Off rakho toh har self-task admin review mein aayega.</span>
          </span>
        </label>
      </div>
    </div>`;

  if (tab === 'calendar') return `
    <div class="card card-pad" style="max-width:720px">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px">Google Calendar</div>
      <div style="font-size:12.5px;color:var(--t2);margin-bottom:16px">
        Connect the signed-in Oment account to Google Calendar. Tasks and milestones assigned to a connected owner are synchronized automatically by the backend.
      </div>
      <div id="google-calendar-settings-status" style="padding:12px 14px;background:var(--s2);border-radius:var(--r8);margin-bottom:14px;font-size:12.5px">Checking connection…</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="google-calendar-connect-btn" onclick="connectGoogleCalendarFromSettings()">Connect Google Calendar</button>
        <button class="btn btn-secondary btn-sm" id="google-calendar-disconnect-btn" style="display:none" onclick="disconnectGoogleCalendarFromSettings()">Disconnect</button>
        <button class="btn btn-secondary btn-sm" onclick="checkGoogleCalendarStatus()">Refresh status</button>
      </div>
      <div style="font-size:11px;color:var(--t3);margin-top:12px">
        Google authorization is required once per employee. No client email addresses are used for these calendar notifications.
      </div>
    </div>`;

  if (tab === 'notify') return `
    <div class="card card-pad" style="max-width:720px">
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="set-notify-submit" ${s.notifyOnSubmission ? 'checked' : ''}>
          <span>
            <span style="font-weight:600;font-size:13px">Notify me when work is submitted</span>
            <span style="display:block;font-size:12px;color:var(--t3)">Employee deliverable submit kare toh alert milega.</span>
          </span>
        </label>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="set-notify-overdue" ${s.notifyOnOverdue ? 'checked' : ''}>
          <span>
            <span style="font-weight:600;font-size:13px">Notify me about overdue items</span>
            <span style="display:block;font-size:12px;color:var(--t3)">Deadline nikal jaane par daily summary.</span>
          </span>
        </label>
      </div>
      <div style="padding:12px 14px;background:var(--amber-light);border-radius:var(--r8);font-size:12.5px;color:var(--t2);margin-top:6px">
        Email delivery abhi connected nahi hai \u2014 notifications sirf in-app dikhengi.
      </div>
    </div>`;

  /* data tab */
  const DB = DataAPI.raw();
  const counts = [
    ['Employees', DB.employees.length], ['Departments', DB.departments.length],
    ['Projects', DB.projects.length], ['Milestones', DB.milestones.length],
    ['Deliverables', DB.deliverables.length], ['Tasks', DB.subtasks.length],
    ['Invoices', DB.invoices.length],
    ['Notices', DB.notices.length], ['Attendance records', DB.attendance.length]
  ];
  return `
    <div class="card card-pad" style="max-width:720px">
      <div style="font-size:13px;font-weight:600;margin-bottom:12px">Workspace data</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:20px">
        ${counts.map(([label, n]) => `
          <div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px">
            <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">${label}</div>
            <div style="font-size:18px;font-weight:700;font-family:var(--mono)">${n}</div>
          </div>`).join('')}
      </div>

      <div style="padding:12px 14px;background:var(--s2);border-radius:var(--r8);font-size:12.5px;color:var(--t2);margin-bottom:14px">
        Data is stored in the remote MongoDB database through the Oment API. Browser data clearing only removes your login token.
        Backend connect hone tak regular export lete raho.
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="exportWorkspace()">Export JSON</button>
        <button class="btn btn-danger btn-sm" onclick="resetWorkspace()">Reset to demo data</button>
      </div>
    </div>`;
}

function checkGoogleCalendarStatus() {
  const status = document.getElementById('google-calendar-settings-status');
  const connect = document.getElementById('google-calendar-connect-btn');
  const disconnect = document.getElementById('google-calendar-disconnect-btn');
  if (!status) return;

  status.textContent = 'Checking connection…';
  DataAPI.getGoogleCalendarStatus()
    .then(function (result) {
      const data = result || {};
      if (data.connected) {
        status.innerHTML = '<strong style="color:#047857">Connected</strong>' +
          (data.connectedAt ? ' · Connected ' + new Date(data.connectedAt).toLocaleString() : '');
        if (connect) connect.style.display = 'none';
        if (disconnect) disconnect.style.display = '';
      } else if (data.configured === false) {
        status.innerHTML = '<strong style="color:#b45309">Google Calendar is not configured on the server.</strong>';
        if (connect) connect.style.display = '';
        if (disconnect) disconnect.style.display = 'none';
      } else {
        status.innerHTML = '<strong>Not connected</strong> · Connect your Google Calendar to enable automatic task and milestone synchronization.';
        if (connect) connect.style.display = '';
        if (disconnect) disconnect.style.display = 'none';
      }
    })
    .catch(function (error) {
      status.innerHTML = '<span style="color:#b91c1c">Unable to check Google Calendar: ' + esc(error.message || 'Request failed') + '</span>';
    });
}

function connectGoogleCalendarFromSettings() {
  DataAPI.connectGoogleCalendar().catch(function (error) {
    toast(error.message || 'Unable to connect Google Calendar', 'error');
  });
}

function disconnectGoogleCalendarFromSettings() {
  if (!confirm('Disconnect Google Calendar for this account?')) return;
  DataAPI.disconnectGoogleCalendar()
    .then(function () {
      toast('Google Calendar disconnected', 'success');
      checkGoogleCalendarStatus();
    })
    .catch(function (error) {
      toast(error.message || 'Unable to disconnect Google Calendar', 'error');
    });
}

function saveSettings() {
  const tab = STATE.settingsTab || 'company';
  const patch = {};
  let valid = true;

  const flag = (id, on) => {
    const el = document.getElementById(id);
    const err = document.getElementById(id + '-err');
    if (el) el.classList.toggle('input-error', on);
    if (err) err.classList.toggle('show', on);
    if (on) valid = false;
  };

  if (tab === 'company') {
    const name = document.getElementById('set-company')?.value?.trim();
    flag('set-company', !name);
    const email = document.getElementById('set-email')?.value?.trim() || '';
    flag('set-email', !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (!valid) return;
    patch.companyName = name;
    patch.address = document.getElementById('set-address')?.value?.trim() || '';
    patch.email = email;
    patch.phone = document.getElementById('set-phone')?.value?.trim() || '';
  }

  if (tab === 'billing') {
    const gstin = document.getElementById('set-gstin')?.value?.trim() || '';
    flag('set-gstin', !!gstin && gstin.length !== 15);
    const state = document.getElementById('set-state')?.value?.trim() || '';
    flag('set-state', !/^\d{2}$/.test(state));
    const rate = parseFloat(document.getElementById('set-gstrate')?.value);
    flag('set-gstrate', isNaN(rate) || rate < 0 || rate > 28);
    if (!valid) return;
    patch.gstin = gstin;
    patch.stateCode = state;
    patch.gstRate = rate;
    patch.invoicePrefix = document.getElementById('set-prefix')?.value?.trim() || 'INV';
    patch.currency = document.getElementById('set-currency')?.value || 'INR';
  }

  if (tab === 'work') {
    const hrs = parseFloat(document.getElementById('set-workday')?.value);
    flag('set-workday', isNaN(hrs) || hrs < 1 || hrs > 16);
    if (!valid) return;
    patch.workdayTargetHours = hrs;
    patch.weekStart = document.getElementById('set-weekstart')?.value || 'monday';
    patch.autoApproveSelfTasks = !!document.getElementById('set-autoapprove')?.checked;
  }

  if (tab === 'notify') {
    patch.notifyOnSubmission = !!document.getElementById('set-notify-submit')?.checked;
    patch.notifyOnOverdue = !!document.getElementById('set-notify-overdue')?.checked;
  }

  if (tab === 'data') { toast('Nothing to save on this tab', 'error'); return; }

  DataAPI.updateSettings(patch).then(function () {
    syncState();
    renderSettings();
    toast('Settings saved \u2713', 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}

function exportWorkspace() {
  const data = JSON.stringify(DataAPI.raw(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'oment-workspace-' + Utils.isoDate(new Date()) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Workspace exported', 'success');
}

function resetWorkspace() {
  toast('Remote database reset is disabled from the browser. Use your server/database tools for destructive resets.', 'error');
}
