/* ============================================================================
   OMENT CRM — SHARED UTILITIES
   schema.js ke baad load karo, state.js se pehle.
   ============================================================================ */

(function (root) {
  'use strict';

  /* ==========================================================================
     1. HTML ESCAPING  ← ye SABSE ZAROORI hai
     --------------------------------------------------------------------------
     Abhi dono apps mein ek bhi escape function nahi hai. Har user-typed value
     (task title, chat message, lead notes, employee name) seedha innerHTML
     template mein jaati hai. Single-user demo mein harmless, par backend +
     multi-user aate hi ye STORED XSS ban jaayega — employee task title mein
     <img src=x onerror="..."> daale aur admin ka session le jaaye.

     Rule: har `${...}` jo user data hai, usko esc() se guzaro.

       PEHLE:  `<div class="tr-t">${t.title}</div>`
       BAAD:   `<div class="tr-t">${esc(t.title)}</div>`
     ========================================================================== */

  var _ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /* Text content ke liye */
  function esc(v) {
    if (v == null) return '';
    return String(v).replace(/[&<>"']/g, function (c) { return _ESC_MAP[c]; });
  }

  /* HTML attribute ke andar (style="", title="", data-x="") — esc() hi kaafi
     hai jab tak attribute quoted ho. Unquoted attribute kabhi mat likho. */
  var escAttr = esc;

  /* Inline onclick="fn('...')" ke andar string bhejne ke liye.
     Dono apps mein ye pattern har jagah hai — quote break XSS ka rasta hai.
     Behtar: onclick hatao aur addEventListener + dataset use karo. Jab tak
     wo refactor nahi hota, ye use karo. */
  function escJs(v) {
    if (v == null) return '';
    return String(v)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
      .replace(/</g, '\\x3C')
      .replace(/>/g, '\\x3E');
  }

  /* Notices module contenteditable se RAW HTML store karta hai. Usko escape
     nahi kar sakte (formatting chali jaayegi) — sanitize karna padega.
     Ye minimal allowlist sanitizer hai. Production ke liye DOMPurify use karo. */
  var _ALLOWED_TAGS = ['P','BR','B','STRONG','I','EM','U','S','UL','OL','LI',
                       'H1','H2','H3','H4','BLOCKQUOTE','HR','SPAN','DIV','A','FONT'];
  var _ALLOWED_ATTRS = ['href','style','color','face','size'];

  function sanitizeHtml(html) {
    var tpl = document.createElement('div');
    tpl.innerHTML = String(html || '');
    (function walk(node) {
      var children = Array.prototype.slice.call(node.childNodes);
      children.forEach(function (child) {
        if (child.nodeType === 1) {                       // element
          if (_ALLOWED_TAGS.indexOf(child.tagName) < 0) {
            /* tag hatao par uska text rakho */
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            node.removeChild(child);
            return;
          }
          Array.prototype.slice.call(child.attributes).forEach(function (a) {
            var n = a.name.toLowerCase();
            if (_ALLOWED_ATTRS.indexOf(n) < 0 || n.indexOf('on') === 0) {
              child.removeAttribute(a.name);
            }
          });
          var href = child.getAttribute && child.getAttribute('href');
          if (href && /^\s*(javascript|data|vbscript):/i.test(href)) {
            child.removeAttribute('href');
          }
          walk(child);
        } else if (child.nodeType === 8) {                // comment
          node.removeChild(child);
        }
      });
    })(tpl);
    return tpl.innerHTML;
  }

  /* ==========================================================================
     2. INVOICE NUMBERING
     --------------------------------------------------------------------------
     Bug: invoices.js `_nextInvNum()` array length se number banata hai:
        `INV-2026-${String(STATE.invoices.length + 1).padStart(3,'0')}`
     4 invoices -> next 005. Ek delete karo -> 3 invoices -> next 004,
     jo pehle se exist karta hai. India mein GST ke under invoice numbers
     unique aur non-reusable hone chahiye — ye compliance issue hai.

     Fix: monotonic counter jo kabhi peeche nahi jaata.
     ========================================================================== */

  function InvoiceCounter(opts) {
    opts = opts || {};
    this.prefix = opts.prefix || 'INV';
    this.fy = opts.fy || financialYearLabel(new Date());
    this.pad = opts.pad || 4;
    this.last = opts.last || 0;
  }

  /* Existing invoices se counter seed karo — highest number dhoondo,
     count nahi. Deleted invoices ka number phir kabhi na mile. */
  InvoiceCounter.prototype.seedFrom = function (invoices) {
    var max = this.last;
    (invoices || []).forEach(function (inv) {
      var m = String(inv.number || inv.num || '').match(/(\d+)\s*$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    this.last = max;
    return this;
  };

  InvoiceCounter.prototype.next = function () {
    this.last += 1;
    return this.prefix + '/' + this.fy + '/' + String(this.last).padStart(this.pad, '0');
  };

  /* Peek — number reserve kiye bina dikhane ke liye (form pre-fill).
     Actual number save ke waqt next() se lo, form kholne pe nahi —
     warna cancel karne se gaps ban jaayenge. */
  InvoiceCounter.prototype.peek = function () {
    return this.prefix + '/' + this.fy + '/' + String(this.last + 1).padStart(this.pad, '0');
  };

  /* Indian FY: 1 April se 31 March. '2026-27' */
  function financialYearLabel(d) {
    var y = d.getFullYear(), m = d.getMonth();          // 0-indexed
    var start = m >= 3 ? y : y - 1;
    return start + '-' + String((start + 1) % 100).padStart(2, '0');
  }

  /* ==========================================================================
     3. GST
     --------------------------------------------------------------------------
     Abhi invoices.js flat 18% lagata hai: Math.round(sub * 0.18).
     Missing: CGST/SGST vs IGST split, GSTIN, HSN/SAC, place of supply.
     Clients Mumbai/Bangalore/Delhi ke hain — inter-state billing hoga hi.

     Rule: supplier state === place of supply  -> CGST + SGST (aadha-aadha)
           warna                               -> IGST (poora)
     ========================================================================== */

  function computeGst(subtotalPaise, ratePct, supplierStateCode, placeOfSupplyCode) {
    var rate = (ratePct == null ? 18 : ratePct) / 100;
    var totalTax = Math.round(subtotalPaise * rate);
    var intra = supplierStateCode && placeOfSupplyCode &&
                String(supplierStateCode) === String(placeOfSupplyCode);
    if (intra) {
      var half = Math.floor(totalTax / 2);
      return {
        cgstPaise: half,
        sgstPaise: totalTax - half,               // rounding remainder SGST mein
        igstPaise: 0,
        totalTaxPaise: totalTax,
        totalPaise: subtotalPaise + totalTax
      };
    }
    return {
      cgstPaise: 0, sgstPaise: 0,
      igstPaise: totalTax,
      totalTaxPaise: totalTax,
      totalPaise: subtotalPaise + totalTax
    };
  }

  /* Paise mein store karo, rupees float mein nahi — float rounding se
     invoice totals mismatch karte hain. */
  function rupeesToPaise(r) { return Math.round((parseFloat(r) || 0) * 100); }
  function paiseToRupees(p) { return (parseInt(p, 10) || 0) / 100; }
  function fmtRupee(paise) {
    return '\u20B9' + paiseToRupees(paise).toLocaleString('en-IN',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ==========================================================================
     4. TIMER — timestamp based, counter nahi
     --------------------------------------------------------------------------
     Bug: employee app setInterval counter se seconds ginta hai. Browser
     background tab mein interval throttle karta hai (1s -> 60s), isliye
     logged time kam count hota hai. Payroll/billing ke liye ye serious hai.

     Fix: start timestamp store karo, elapsed derive karo. UI refresh ke liye
     interval theek hai — par VALUE hamesha timestamps se aaye.
     ========================================================================== */

  function Stopwatch() {
    this.startedAt = null;
    this.accumulatedSecs = 0;
    this.pausedForBreak = false;
  }
  Stopwatch.prototype.start = function (fromSecs) {
    if (this.startedAt) return;
    this.accumulatedSecs = fromSecs != null ? fromSecs : this.accumulatedSecs;
    this.startedAt = Date.now();
  };
  Stopwatch.prototype.pause = function () {
    if (!this.startedAt) return;
    this.accumulatedSecs += Math.floor((Date.now() - this.startedAt) / 1000);
    this.startedAt = null;
  };
  Stopwatch.prototype.elapsedSecs = function () {
    var live = this.startedAt ? Math.floor((Date.now() - this.startedAt) / 1000) : 0;
    return this.accumulatedSecs + live;
  };
  Stopwatch.prototype.reset = function () {
    this.startedAt = null; this.accumulatedSecs = 0;
  };
  Stopwatch.prototype.isRunning = function () { return !!this.startedAt; };

  /* ==========================================================================
     5. DEMO DATA — relative dates
     --------------------------------------------------------------------------
     Admin app ki saari dates hardcoded May/June 2026 strings hain. Aaj Aug
     2026 hai, isliye har deadline red "overdue" dikh rahi hai — demo kharab
     lagta hai. Employee app ne ye sahi kiya (now + 5*H). Admin ko bhi
     relative karo.
     ========================================================================== */

  var HOUR = 3600000, DAY = 86400000;
  function daysFromNow(n) { return new Date(Date.now() + n * DAY).toISOString(); }
  function daysAgo(n) { return daysFromNow(-n); }
  function isoDate(d) { return new Date(d).toISOString().split('T')[0]; }

  /* ==========================================================================
     6. ID GENERATION
     --------------------------------------------------------------------------
     Dono apps `Date.now()` ko ID banate hain. Do records ek hi millisecond
     mein bane (bulk create / dept-wide assign) toh IDs clash karengi.
     ========================================================================== */

  var _idSeq = 0;
  function newId(prefix) {
    _idSeq += 1;
    return (prefix ? prefix + '_' : '') + Date.now().toString(36) + '_' +
           _idSeq.toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ==========================================================================
     7. SAFE DOM
     --------------------------------------------------------------------------
     Dono apps mein har action poora section innerHTML se re-render karta hai —
     scroll position, focus aur input state reset ho jaate hain. Ye helper
     scroll/focus preserve karta hai jab tak proper diffing nahi aa jaati.
     ========================================================================== */

  function renderPreserving(el, html) {
    if (!el) return;
    var scrollTop = el.scrollTop;
    var active = document.activeElement;
    var activeId = active && el.contains(active) ? active.id : null;
    var selStart = activeId && active.selectionStart != null ? active.selectionStart : null;

    el.innerHTML = html;

    el.scrollTop = scrollTop;
    if (activeId) {
      var restored = document.getElementById(activeId);
      if (restored) {
        restored.focus();
        if (selStart != null && restored.setSelectionRange) {
          try { restored.setSelectionRange(selStart, selStart); } catch (e) {}
        }
      }
    }
  }

  /* ========================================================================== */

  var Utils = {
    esc: esc, escAttr: escAttr, escJs: escJs, sanitizeHtml: sanitizeHtml,
    InvoiceCounter: InvoiceCounter, financialYearLabel: financialYearLabel,
    computeGst: computeGst,
    rupeesToPaise: rupeesToPaise, paiseToRupees: paiseToRupees, fmtRupee: fmtRupee,
    Stopwatch: Stopwatch,
    HOUR: HOUR, DAY: DAY,
    daysFromNow: daysFromNow, daysAgo: daysAgo, isoDate: isoDate,
    newId: newId,
    renderPreserving: renderPreserving
  };

  root.Utils = Utils;
  /* Convenience: escaping itni baar chahiye ki global rakhna practical hai */
  root.esc = esc;
  root.escAttr = escAttr;
  root.escJs = escJs;

  if (typeof module !== 'undefined' && module.exports) module.exports = Utils;

})(typeof window !== 'undefined' ? window : globalThis);
