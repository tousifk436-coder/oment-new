/* ============================================================================
   SIS AUTO-MONITOR — live operations watcher (admin)
   ----------------------------------------------------------------------------
   Jab tak app khula hai, ye har 60 second mein SisOps engine chalata hai:

     • Naye due/overdue signals → Cases nav par live badge + ek gentle toast
     • Cases / Operations view khula ho → chupchaap auto-refresh
     • Duplicate alerts nahi — notification-log ki idempotency keys respect hoti hain

   Browser band hone par monitoring server/ops-scheduler.js sambhalta hai.
   Ye layer sirf "app khula hai" wali live-ness ke liye hai — koi fake email
   claim nahi karta.
   ============================================================================ */

(function () {
  'use strict';

  var INTERVAL = 60 * 1000;
  var lastKeys = null;   // pichhle scan ki keys — naya kya hai wo pata chale

  function badge(n) {
    var nav = document.querySelector('[data-nav="cases"]');
    if (!nav) return;
    var b = nav.querySelector('.nav-badge');
    if (!n) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('span');
      b.className = 'nav-badge';
      nav.appendChild(b);
    }
    b.textContent = n > 99 ? '99+' : String(n);
  }

  function scan(silent) {
    if (!window.DataAPI || !window.SisOps) return;
    Promise.all([
      DataAPI.getProjects(), DataAPI.getMilestones(),
      DataAPI.getEmployees(), DataAPI.getContacts(), DataAPI.getNotificationLog()
    ]).then(function (r) {
      var projects = (r[0] || []).filter(function (p) { return p.status !== 'COMPLETED'; });
      var people = { users: r[2] || [], contacts: r[3] || [] };
      var logged = {};
      (r[4] || []).forEach(function (l) { logged[l.key] = true; });

      var due = SisOps.computeDueNotifications(projects, r[1] || [], people)
        .filter(function (n) { return !logged[n.key]; });

      badge(due.length);

      /* naye items par ek hi gentle toast — spam nahi */
      if (!silent && lastKeys) {
        var fresh = due.filter(function (n) { return !lastKeys[n.key]; });
        if (fresh.length && typeof toast === 'function') {
          var worst = fresh.filter(function (n) { return n.kind === 'OVERDUE' || n.kind === 'HOURLY'; })[0] || fresh[0];
          toast(worst.kind === 'OVERDUE' || worst.kind === 'HOURLY'
            ? '\uD83D\uDD34 Overdue: ' + worst.m.title + ' \u2014 ' + worst.p.name
            : '\uD83D\uDFE0 Due: ' + worst.m.title + ' \u2014 ' + worst.p.name, '');
        }
      }
      lastKeys = {};
      due.forEach(function (n) { lastKeys[n.key] = true; });

      /* khule hue ops views chupchaap taaza karo */
      if (window.STATE) {
        if (STATE.currentModule === 'cases' && typeof renderCases === 'function' && !window.CASE_WIZ) renderCases();
        else if (STATE.currentModule === 'sisops' && typeof renderSisOps === 'function') renderSisOps();
      }
    }).catch(function () { /* monitor kabhi app nahi girata */ });
  }

  window.SIS_MONITOR = { scan: scan, intervalMs: INTERVAL };

  /* boot ke thodi der baad pehla scan, phir har minute */
  setTimeout(function () { scan(true); }, 1500);
  setInterval(function () { scan(false); }, INTERVAL);

})();
