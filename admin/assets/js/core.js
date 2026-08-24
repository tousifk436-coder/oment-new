/* ============================================================
   NAVIGATION
   ============================================================ */
function gotoModule(name, _skipHistory) {
  // Push previous module to history (unless we're going back, or returning to the same module)
  if (!_skipHistory && STATE.currentModule && STATE.currentModule !== name) {
    STATE.moduleHistory.push(STATE.currentModule);
    // Cap history to avoid runaway growth
    if (STATE.moduleHistory.length > 40) STATE.moduleHistory.shift();
  }

  // Close any open launcher
  document.getElementById('app-launcher').classList.remove('open');

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const targetView = document.getElementById('view-' + name);
  if (targetView) targetView.classList.add('active');

  const navItem = document.querySelector(`[data-nav="${name}"]`);
  if (navItem) navItem.classList.add('active');

  // Update topbar title
  const titles = { dashboard:'Dashboard', employees:'Team', hrm:'People', sisops:'Operations', cases:'Immigration Cases', settings:'Settings', calendar:'Calendar' };
  document.getElementById('topbar-title').textContent = titles[name] || name;

  STATE.currentModule = name;

  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 768) closeSidebar();

  // Reset transient notice-detail-on-mobile state when leaving the notices module
  if (name !== 'notices') STATE.noticeDetailOpen = false;

  // Render module
  switch(name) {
    case 'dashboard': renderDashboard(); break;
    case 'employees': renderEmployees(); break;
    case 'hrm': renderHrm(); break;
    case 'sisops': renderSisOps(); break;
    case 'cases': renderCases(); break;
    case 'calendar': renderCalendar(); break;
    case 'settings': renderSettings(); break;
  }

  closeSidebar();
  updateBackButton();
}

/* ============================================================
   GLOBAL BACK NAVIGATION
   ============================================================ */
function updateBackButton() {
  const btn = document.getElementById('topbar-back');
  if (!btn) return;
  if (!btn) return;
  // Show back button if we have history OR we're inside a contextual sub-view
  // (project detail, mobile notice detail, or compose-notice mode).
  const inSubView =
    STATE.currentModule === 'project-detail' ||
    (STATE.currentModule === 'notices' && STATE.noticeDetailOpen) ||
    (STATE.currentModule === 'notices' && typeof noticeCompose !== 'undefined' && noticeCompose.active);
  const canPop = STATE.moduleHistory.length > 0;
  btn.style.display = (inSubView || canPop) ? 'inline-flex' : 'none';
}

function goBack() {
  // Otherwise pop the module history
  if (STATE.moduleHistory.length > 0) {
    const prev = STATE.moduleHistory.pop();
    gotoModule(prev, true);
  } else {
    // Fallback — go home
    gotoModule('dashboard', true);
  }
}

function launcherSearch(q) {
  const cards = document.querySelectorAll('#launcher-grid .app-card');
  cards.forEach(card => {
    const name = card.querySelector('.app-name')?.textContent?.toLowerCase() || '';
    const desc = card.querySelector('.app-desc')?.textContent?.toLowerCase() || '';
    card.style.display = (!q || name.includes(q.toLowerCase()) || desc.includes(q.toLowerCase())) ? '' : 'none';
  });
}

function launchApp(name) {
  closeLauncher();
  gotoModule(name);
}

function openLauncher() {
  document.getElementById('app-launcher').classList.add('open');
  // Reset search
  const si = document.getElementById('launcher-search-input');
  if (si) { si.value = ''; launcherSearch(''); si.focus(); }
  // On mobile: scroll to top
  const box = document.querySelector('.launcher-box');
  if (box) box.scrollTop = 0;
}

function closeLauncher(e) {
  if (!e || e.target === document.getElementById('app-launcher')) {
    document.getElementById('app-launcher').classList.remove('open');
    const si = document.getElementById('launcher-search-input');
    if (si) { si.value = ''; }
  }
}

/* ============================================================
   SIDEBAR MOBILE
   ============================================================ */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('mobile-overlay').style.display = 'block';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobile-overlay').style.display = 'none';
}

/* ============================================================
   PANEL
   ============================================================ */
function openPanel(title, bodyHTML, footerHTML='') {
  document.getElementById('panel-title').textContent = title;
  document.getElementById('panel-body').innerHTML = bodyHTML;
  document.getElementById('panel-footer').innerHTML = footerHTML;
  document.getElementById('panel-overlay').classList.add('open');
  document.getElementById('slide-panel').classList.add('open');
}

function closePanel() {
  document.getElementById('panel-overlay').classList.remove('open');
  document.getElementById('slide-panel').classList.remove('open');
}

/* ============================================================
   MODAL
   ============================================================ */
function openModal(title, bodyHTML, footerHTML='') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').classList.remove('open');
    // Reset any width modifiers
    const mb = document.querySelector('#modal-overlay .modal-box');
    if (mb) mb.classList.remove('modal-wide');
  }
}

/* ============================================================
   CONFIRM DIALOG
   ============================================================ */
let _confirmCb = null;
function showConfirm(msg, cb) {
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-overlay').style.display = 'flex';
  _confirmCb = cb;
  document.getElementById('confirm-yes-btn').onclick = () => { closeConfirm(); if(_confirmCb) _confirmCb(); };
}
function closeConfirm() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg, type='') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ic = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info';
  el.innerHTML = ICON(ic, 15) + '<span>' + msg + '</span>';
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 3000);
}

/* ============================================================
   TABS
   ============================================================ */
function switchTab(el, paneId) {
  const bar = el.closest('.tab-bar');
  bar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  const parent = bar.nextElementSibling?.parentElement || bar.parentElement;
  parent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.getElementById(paneId)?.classList.add('active');
}

/* ============================================================
   AVATAR COLOR HELPER
   ============================================================ */
const COLORS = ['#2563EB','#7C3AED','#059669','#D97706','#DC2626','#0891B2','#BE185D','#EA580C'];
function getColor(i) { return COLORS[i % COLORS.length]; }
function initials(name) { return name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(); }
function avatarEl(name, color, size='') {
  return `<div class="avatar${size?' avatar-'+size:''}" style="background:${color}">${initials(name)}</div>`;
}

/* ============================================================
   FORMAT HELPERS
   ============================================================ */
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
function fmtRupee(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function urgencyColor(deadline) {
  const days = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  if (days < 0) return 'var(--red)';
  if (days <= 7) return 'var(--amber)';
  return 'var(--green)';
}
function urgencyLabel(deadline) {
  const days = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days <= 7) return `${days}d left`;
  return fmtDate(deadline);
}

/* ============================================================
   SVG RING
   ============================================================ */
function ringEl(pct, size=60) {
  const r = (size/2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = (pct/100) * circ;
  const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--s3)" stroke-width="5"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="5"
      stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
      transform="rotate(-90 ${size/2} ${size/2})"/>
    <text x="${size/2}" y="${size/2+4}" text-anchor="middle" font-size="${size/5}px" font-weight="700" fill="${color}" font-family="Geist Mono">${pct}%</text>
  </svg>`;
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function renderNotifications() {
  const unread = STATE.notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  badge.style.display = unread > 0 ? 'block' : 'none';

  const list = document.getElementById('notif-list');
  list.innerHTML = STATE.notifications.map(n => `
    <div class="notif-item${n.read?'':' unread'}" onclick="markRead(${n.id})">
      <div>
        <div class="notif-text">${esc(n.text)}</div>
        <div class="notif-sub">${esc(n.sub)}</div>
      </div>
    </div>
  `).join('');
}
function toggleNotif() {
  document.getElementById('notif-dropdown').classList.toggle('open');
}
function markRead(id) {
  DataAPI.markNotificationRead(id).then(function () {
    syncState(); renderNotifications();
  });
}
function markAllRead() {
  DataAPI.markAllNotificationsRead(STATE.adminUser.id).then(function () {
    syncState(); renderNotifications();
    toast('All notifications marked as read', 'success');
  });
}

// Close notif when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('#notif-dropdown') && !e.target.closest('.icon-btn')) {
    document.getElementById('notif-dropdown').classList.remove('open');
  }
});


// Responsive: reset messages panel on window resize
window.addEventListener('resize', function() {
  if (window.innerWidth > 768) {
    const cp = document.querySelector('.contacts-panel');
    const ca = document.querySelector('.chat-area');
    if(cp) cp.classList.remove('hidden');
    if(ca) ca.classList.remove('active');
  }
  // Re-render current module to apply responsive layout
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLauncher();
    closePanel();
    closeModal();
    closeConfirm();
  }
});

// Global search
document.getElementById('global-search').addEventListener('input', e => {
  const val = e.target.value.toLowerCase().trim();
  if (val.length < 3) return;
  /* Pehle sirf employees search hote the. Ab saare modules. */
  const has = (s) => String(s || '').toLowerCase().includes(val);
  if (STATE.employees.some(x => has(x.name) || has(x.role) || has(x.email))) {
    gotoModule('employees');
    setTimeout(() => { const s = document.getElementById('emp-search'); if (s) { s.value = val; filterEmployees(); } }, 100);
    return;
  }
  if (STATE.projects.some(x => has(x.name) || has(x.client)))  { gotoModule('cases');  return; }
  if (STATE.tasks.some(x => has(x.title)))                     { gotoModule('cases');  return; }
});
