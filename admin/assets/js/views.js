/* ============================================================================
   VIEW SHELLS — har module ka static markup
   ----------------------------------------------------------------------------
   Pehle ye sab admin/index.html ke andar tha — 265 lines, aur file 34KB ki
   ho gayi thi. Employee app mein har view ek khaali container hai aur markup
   JS banata hai; ab admin bhi waisa hi hai.

   Faayda: index.html ab sirf shell hai (sidebar, topbar, overlays). Kisi
   module ka layout badalna ho toh yahan aao — HTML mein dhoondhna nahi
   padega.

   mountView() ek baar chalta hai, phir uska render function usko bharta hai.
   ============================================================================ */

var VIEW_SHELLS = {
  'view-dashboard': `
      <div id="dash-hero"></div>

      <div class="stats-bar" id="stats-bar"></div>

      <div class="dash-row">
        <div class="card card-pad">
          <div class="section-header">
            <div>
              <div class="section-title">Needs attention</div>
              <div class="section-sub">Everything waiting on you, in priority order</div>
            </div>
          </div>
          <div id="critical-alerts"></div>
        </div>
        <div class="card card-pad">
          <div class="section-header">
            <div>
              <div class="section-title">Activity</div>
              <div class="section-sub">Latest across the workspace</div>
            </div>
          </div>
          <div class="activity-list" id="activity-feed"></div>
        </div>
      </div>

      <div class="card card-pad" id="milestone-summary-card">
        <div class="section-header">
          <div>
            <div class="section-title">Milestone tracker</div>
            <div class="section-sub" id="ms-summary-sub">All cases snapshot</div>
          </div>
          <button class="link-btn" onclick="gotoModule('cases')">Open Cases ${ICON('arrow-right',12)}</button>
        </div>
        <div id="milestone-summary-body"></div>
      </div>

      <div class="dash-bottom">
        <div class="card card-pad">
          <div class="section-header">
            <div>
              <div class="section-title">Team load</div>
              <div class="section-sub">Open work per person</div>
            </div>
            <button class="link-btn" onclick="gotoModule('hrm')">People ${ICON('arrow-right',12)}</button>
          </div>
          <div id="team-load"></div>
        </div>
        <div class="card card-pad">
          <div class="section-header">
            <div>
              <div class="section-title">Ready to invoice</div>
              <div class="section-sub">Delivered, not yet billed</div>
            </div>
          </div>
          <div id="unbilled-snapshot"></div>
          <div class="unbilled-foot">
            <span class="unbilled-foot-label">Sitting uninvoiced</span>
            <span class="unbilled-total" id="unbilled-value">\u2014</span>
          </div>
        </div>
      </div>`,

  'view-employees': `      <div class="section-header" style="margin-bottom:16px">
        <div>
          <div class="section-title" style="font-size:20px">Employees</div>
          <div class="section-sub" id="emp-count-sub"></div>
        </div>
        <button class="btn btn-primary" onclick="openAddEmpModal()">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Add New Employee
        </button>
      </div>
      <div class="filter-bar">
        <select id="emp-dept-filter" onchange="filterEmployees()">
          <option value="">All Departments</option>
        </select>
        <div class="status-pills" id="emp-status-pills">
          <div class="status-pill active" data-status="" onclick="setEmpStatus(this,'')">All</div>
          <div class="status-pill" data-status="Present" onclick="setEmpStatus(this,'Present')">Present</div>
          <div class="status-pill" data-status="Absent" onclick="setEmpStatus(this,'Absent')">Absent</div>
          <div class="status-pill" data-status="On Leave" onclick="setEmpStatus(this,'On Leave')">On Leave</div>
        </div>
        <input type="text" placeholder="Search by name…" id="emp-search" oninput="filterEmployees()" style="height:32px;border:1px solid var(--b2);border-radius:var(--r8);padding:0 10px;font-size:13px;background:var(--surface);outline:none;flex:1;max-width:220px">
      </div>
      <div style="display:flex;gap:10px;margin-bottom:16px" id="emp-stats-pills"></div>
      <div class="emp-cards" id="emp-cards-grid">`,

  'view-cases': '<div id="cases-root"><div class="card card-pad" style="color:var(--t2)">Loading immigration operations\u2026</div></div>',
  'view-sisops': '<div id="sisops-root"><div class="card card-pad" style="color:var(--t2)">Loading operations dashboard\u2026</div></div>',

  /* view-settings yahan nahi hai — settings.js poora view khud render karta hai,
     isliye uska static shell rakhna dead markup hota. */
};

var _mounted = {};

/* View ka static markup ek hi baar daalo. Baar-baar daalne se andar ke
   render kiye hue elements ud jaate hain. */
function mountView(name) {
  var id = 'view-' + name;
  if (_mounted[id]) return true;
  var el = document.getElementById(id);
  if (!el) return false;
  var shell = VIEW_SHELLS[id];
  if (shell == null) { _mounted[id] = true; return true; }
  el.innerHTML = shell;
  _mounted[id] = true;
  return true;
}

/* gotoModule se pehle shell mount ho jaana chahiye — warna render function
   ko uske target elements milenge hi nahi. */
(function wrapMount() {
  if (typeof gotoModule !== 'function') return;
  var _g = gotoModule;
  window.gotoModule = function (name, skipHistory) {
    mountView(name);
    _g(name, skipHistory);
  };
})();
