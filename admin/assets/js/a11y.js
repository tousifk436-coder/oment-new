/* ============================================================================
   ACCESSIBILITY LAYER (pehle help.js mein tha — tutorials hata diye,
   accessibility rakhi: focus trap, aria-modal, keyboard rows, live region)
   ============================================================================ */

/* ══════════════════ ACCESSIBILITY ══════════════════ */
var _trapEl = null, _trapPrev = null, _trapHandler = null;

/* Focus trap — modal ke andar Tab loop kare, bahar na jaaye. Iske bina
   keyboard user modal se nikal hi nahi paata. */
function trapFocus(el) {
  releaseFocus();
  if (!el) return;
  _trapEl = el;
  _trapPrev = document.activeElement;

  _trapHandler = function (e) {
    if (e.key === 'Escape') {
      return;
    }
    if (e.key !== 'Tab') return;
    var focusables = el.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', _trapHandler, true);
}

function releaseFocus() {
  if (_trapHandler) document.removeEventListener('keydown', _trapHandler, true);
  _trapHandler = null;
  _trapEl = null;
  if (_trapPrev && _trapPrev.focus) { try { _trapPrev.focus(); } catch (e) {} }
  _trapPrev = null;
}

/* Modal aur panel khulte hi focus trap lagao — core.js ke functions ko wrap
   kar rahe hain taaki har call site badalna na pade. */
(function wrapDialogs() {
  if (typeof openModal === 'function') {
    var _om = openModal;
    window.openModal = function (title, body, footer) {
      _om(title, body, footer);
      var box = document.querySelector('#modal-overlay .modal-box');
      var ov = document.getElementById('modal-overlay');
      if (ov) { ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); }
      if (box) {
        trapFocus(box);
        var f = box.querySelector('input,textarea,select,button');
        if (f) setTimeout(function () { try { f.focus(); } catch (e) {} }, 30);
      }
    };
  }
  if (typeof closeModal === 'function') {
    var _cm = closeModal;
    window.closeModal = function (e) { _cm(e); releaseFocus(); };
  }
  if (typeof openPanel === 'function') {
    var _op = openPanel;
    window.openPanel = function (t, b, f) {
      _op(t, b, f);
      var p = document.getElementById('slide-panel');
      if (p) { p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); trapFocus(p); }
    };
  }
  if (typeof closePanel === 'function') {
    var _cp = closePanel;
    window.closePanel = function () { _cp(); releaseFocus(); };
  }
})();

/* Clickable divs ko keyboard se bhi usable banao — Enter/Space click kare */
function makeRowsAccessible(container) {
  var scope = container || document;
  scope.querySelectorAll('[onclick]:not(button):not(a):not([tabindex])').forEach(function (el) {
    if (el.closest('.help-dot')) return;
    el.setAttribute('tabindex', '0');
    if (!el.getAttribute('role')) el.setAttribute('role', 'button');
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  });
}

/* Live region — toast aur status changes screen reader ko announce ho */
function announce(msg) {
  var el = document.getElementById('sr-live');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sr-live';
    el.className = 'sr-only';
    el.style.cssText = 'position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = '';
  setTimeout(function () { el.textContent = msg; }, 60);
}

/* toast() ko announce ke saath wrap karo */
(function wrapToast() {
  if (typeof toast !== 'function') return;
  var _t = toast;
  window.toast = function (msg, type) { _t(msg, type); announce(msg); };
})();


/* Har module render ke baad clickable rows keyboard se reachable ho jayein.
   gotoModule ko wrap kar rahe hain taaki har render function badalna na pade. */
(function wrapNavigation() {
  if (typeof gotoModule !== 'function') return;
  var _gm = gotoModule;
  window.gotoModule = function (name, skipHistory) {
    _gm(name, skipHistory);
    var view = document.getElementById('view-' + name);
    if (view) setTimeout(function () { makeRowsAccessible(view); }, 60);
    var title = document.getElementById('topbar-title');
    if (title) announce(title.textContent + ' opened');
  };
})();
