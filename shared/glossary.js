/* ============================================================================
   GLOSSARY — har number ka matlab, ek jagah
   ----------------------------------------------------------------------------
   Ye file ek hi source hai jahan se:
     • hover tooltips aate hain (help icon ke saath)
     • Help page ki definitions aati hain
     • empty states ke explanations aate hain

   Rule: agar koi metric UI mein dikhta hai aur uska matlab turant obvious
   nahi hai, uski entry yahan honi chahiye. Ek hi jagah likho, har jagah use
   karo — warna do jagah do alag definition ban jaati hain.

   Language: seedhi, jargon-free. "Utilisation" nahi — "billable client work
   ka hissa". Agar ek line mein samajh nahi aata toh definition kharab hai.
   ============================================================================ */

(function (root) {
  'use strict';

  var TERMS = {

    /* ── Profitability ── */
    margin: {
      title: 'Margin',
      short: 'Kharcha nikalne ke baad jo paisa bacha.',
      long: 'Jo revenue aap is project se recognise kar chuke ho (invoiced + delivered-but-not-yet-invoiced), ' +
            'usme se team ka loaded cost minus. Positive matlab profit, negative matlab aap paisa daal rahe ho.',
      formula: '(Invoiced + WIP) \u2212 delivery cost'
    },
    loadedCost: {
      title: 'Loaded cost',
      short: 'Ek bande pe kul kitna kharcha hota hai.',
      long: 'Ek banda sirf apni salary jitna kharcha nahi karta \u2014 rent, laptop, software, HR, ' +
            'bench time, PF sab uske upar lagta hai. Zyadatar Indian agencies ke liye ye salary ka ' +
            '1.3\u20131.5 guna hota hai. Sirf salary se margin nikaaloge toh har project profitable ' +
            'dikhega aur company phir bhi loss mein hogi.',
      formula: 'Cost per hour \u00d7 overhead multiplier'
    },
    overheadMultiplier: {
      title: 'Overhead multiplier',
      short: 'Salary ko asli kharche mein badalne wala number.',
      long: 'Default 1.4 rakha hai \u2014 matlab ek banda jiski cost \u20b9900/hr hai, wo actually ' +
            '\u20b91,260/hr kharcha karta hai. Apni company ka number nikalne ke liye: saal ka total ' +
            'kharcha \u00f7 saal ki total salary.',
      formula: 'Total company cost \u00f7 total salary cost'
    },
    effectiveRate: {
      title: 'Effective rate',
      short: 'Ek ghante kaam se aap kitna kama rahe ho.',
      long: 'Isko apne bill rate se compare karo. Agar bill rate \u20b92,500/hr hai par effective rate ' +
            '\u20b91,200/hr aa raha hai, toh ya toh scope creep ho raha hai, ya estimates kam bandhe the, ' +
            'ya bahut sara time non-billable kaam mein ja raha hai.',
      formula: 'Recognised revenue \u00f7 hours logged'
    },
    wip: {
      title: 'Delivered, not invoiced (WIP)',
      short: 'Kaam poora ho gaya, par bill bhejna bhool gaye.',
      long: 'Agency ka sabse bada revenue leak yahi hai \u2014 milestone complete ho gaya aur invoice ' +
            'banana bhool gaye. Ye paisa aapka hai, bas abhi tak maanga nahi. Cash flow mein ye kahin ' +
            'nahi dikhta isliye mahino chhupa reh sakta hai.',
      formula: 'Completed billable milestones without an invoice'
    },
    burnVsDelivery: {
      title: 'Budget burned vs delivered',
      short: 'Paisa kaam se zyada tezi se khatam ho raha hai ya nahi.',
      long: 'Do bar hain \u2014 ek batati hai kitna budget cost mein chala gaya, doosri kitna kaam ' +
            'actually deliver hua. Agar burn delivery se 10%+ aage hai toh project abhi se sambhalna ' +
            'padega, warna end mein pata chalega jab kuch nahi kar sakte.',
      formula: 'Cost \u00f7 contract  vs  deliverables done \u00f7 total'
    },
    forecastMargin: {
      title: 'Forecast margin',
      short: 'Project khatam hone pe kitna profit bachega.',
      long: '"Abhi 59% margin hai" bekaar hai agar bacha hua kaam usko 30% pe le jaane wala hai. ' +
            'Ye remaining committed work ka cost bhi jodta hai. Jo deliverables apna estimate cross ' +
            'kar chuke hain unpe 25% extra buffer lagta hai \u2014 warna forecast jhooth bolta hai.',
      formula: 'Contract \u2212 (cost so far + remaining work cost)'
    },
    costMultiple: {
      title: 'Cost multiple',
      short: 'Ek rupya kharch karke kitna kamaya.',
      long: '2.0\u00d7 se upar healthy hai. Usse neeche matlab ya toh us bande ka time non-billable ' +
            'kaam mein ja raha hai (internal, admin, bench), ya uska bill rate cost ke hisaab se kam hai.',
      formula: 'Billable value \u00f7 loaded cost'
    },
    contribution: {
      title: 'Contribution',
      short: 'Ek banda kitna paisa la raha hai (kharcha nikal ke).',
      long: 'Jo billable value usne banayi, usme se uska loaded cost minus. Ye performance rating ' +
            'nahi hai \u2014 ek senior jo mentoring aur reviews karta hai uska contribution kam dikhega, ' +
            'par team uske bina chalti nahi.',
      formula: 'Billable value \u2212 loaded cost'
    },
    recognisedRevenue: {
      title: 'Recognised revenue',
      short: 'Jitna kaam poora ho gaya, uski keemat.',
      long: 'Ye teeno se alag hai: <strong>contract</strong> (jitna sign hua), <strong>invoiced</strong> ' +
            '(jitna bill bheja), <strong>collected</strong> (jitna paisa aaya). Ek project 100% deliver ' +
            'ho sakta hai, 80% invoice hua ho, aur 40% paisa aaya ho \u2014 teeno alag dekhna zaroori hai.',
      formula: 'Invoiced + delivered-not-invoiced'
    },
    gstNote: {
      title: 'GST revenue nahi hai',
      short: 'GST aapki kamai nahi hai, isliye usko nahi gina.',
      long: 'GST aapka paisa nahi hai \u2014 aap wo government ke liye collect kar rahe ho aur aage ' +
            'jama karna hai. Usko revenue mein ginoge toh margin jhootha 18% zyada dikhega.',
      formula: null
    },

    /* ── People / HRM ── */
    utilisation: {
      title: 'Utilisation',
      short: 'Kaam ke waqt ka kitna hissa client ke kaam mein gaya.',
      long: 'Agency benchmark 60\u201375% hai. 100% na possible hai na healthy \u2014 meetings, ' +
            'internal work, learning, chhutti sab isme se nikalta hai. 40% se neeche matlab ya toh ' +
            'kaam nahi hai, ya time log nahi ho raha.',
      formula: 'Billable hours \u00f7 available hours'
    },
    committedAhead: {
      title: 'Committed ahead',
      short: 'Us bande ke paas abhi kitne din ka kaam bacha hai.',
      long: 'Uske open deliverables ka bacha hua estimate. Capacity planning ke liye ye sabse ' +
            'seedha number hai \u2014 kis pe naya kaam daal sakte ho aur kis pe nahi.',
      formula: '\u03a3 (estimate \u2212 logged) of open work \u00f7 8h'
    },
    payableDays: {
      title: 'Payable days',
      short: 'Salary mein kitne din ginne hain.',
      long: 'Present days + half days ka aadha + approved leave. Absent aur LOP isme nahi aate. ' +
            'Ye wahi number hai jo payroll ko jaata hai.',
      formula: 'Present + (half days \u00d7 0.5) + approved leave'
    },
    graceWindow: {
      title: 'Grace window',
      short: 'Itni der ki deri chalti hai, late nahi maana jaata.',
      long: 'Default 15 minutes. Traffic aur genuine deri ke liye. Iske baad hi "late" flag lagta hai.',
      formula: null
    },
    regularisation: {
      title: 'Attendance correction',
      short: 'Attendance lagana bhool gaye toh sahi time manwana.',
      long: 'Sabse common HR ticket yahi hota hai. Employee sahi in/out time bhejta hai reason ke ' +
            'saath, approver review karta hai. Approve hone pe attendance register apne aap update ho ' +
            'jaata hai \u2014 warna wo din "absent" reh jaata aur payroll galat nikalta.',
      formula: null
    },
    proRatedLeave: {
      title: 'Pro-rated leave',
      short: 'Jab join kiya, uske hisaab se chhutti milti hai.',
      long: 'Jo banda August mein join hua, usko poore saal ka 12 CL dena galat hai. Balance ' +
            'joining month se calculate hota hai.',
      formula: 'Annual quota \u00d7 remaining months \u00f7 12'
    },
    workingDays: {
      title: 'Working days',
      short: 'Sunday aur chhutti ke din nahi ginte.',
      long: 'Leave apply karte waqt ye pehle se dikha diya jaata hai \u2014 "3 days use honge, ' +
            '2 weekend skip" \u2014 taaki baad mein surprise na ho.',
      formula: null
    },

    /* ── Delivery ── */
    deliverable: {
      title: 'Deliverable',
      short: 'Ek kaam jo kisi ko diya jaata hai aur baad mein check hota hai.',
      long: 'Structure: Project \u2192 Milestone \u2192 Deliverable \u2192 Task. Milestone billing ki ' +
            'unit hai, deliverable assignment ki unit hai, task employee ke apne breakdown ke liye hai.',
      formula: null
    },
    approvalLoop: {
      title: 'Approval loop',
      short: 'Kaam bhejo \u2192 manager dekhe \u2192 pass ya wapas.',
      long: 'Sirf status column drag karne se farq ye hai ki reject karte waqt <strong>reason ' +
            'mandatory</strong> hai, aur wo employee ko exactly dikhta hai. Poora audit trail ' +
            'timeline mein rehta hai.',
      formula: null
    },
    estimateDrift: {
      title: 'Estimate drift',
      short: 'Jitna time socha tha, usse kitna zyada laga.',
      long: 'Positive matlab estimate se zyada laga. Consistently +40% aa raha hai toh problem ' +
            'estimation mein hai, team mein nahi \u2014 quote karte waqt buffer badhao.',
      formula: '(Actual \u00f7 estimate \u2212 1) \u00d7 100'
    },
    firstPassApproval: {
      title: 'First-time approval',
      short: 'Kitna kaam pehli baar mein hi pass ho gaya.',
      long: '80% se upar healthy hai. Neeche jaa raha hai toh matlab briefs clear nahi hain, ya ' +
            'review criteria pehle se nahi bataye jaa rahe.',
      formula: 'Approved \u00f7 (approved + returned)'
    },

    /* ── Billing ── */
    invoiceNumbering: {
      title: 'Invoice numbering',
      short: 'Ek bill number dobara kabhi nahi milta.',
      long: 'Format PREFIX/FY/0001. Ek invoice delete bhi kar do toh uska number dobara nahi ' +
            'milega \u2014 GST ke under numbers unique aur sequential hone chahiye.',
      formula: null
    },
    gstSplit: {
      title: 'CGST/SGST vs IGST',
      short: 'Client kis state mein hai, uspe GST ka type depend karta hai.',
      long: 'Client aapke hi state mein hai toh CGST + SGST (aadha-aadha). Doosre state mein hai ' +
            'toh poora IGST. Settings mein apna state code set karo, aur client ka place of supply ' +
            'invoice pe.',
      formula: null
    },
    outstanding: {
      title: 'Outstanding',
      short: 'Bill bhej diya par paisa abhi tak nahi aaya.',
      long: 'Ye margin se alag hai. Ek project 60% margin pe ho sakta hai aur phir bhi aapke paas ' +
            'cash na ho \u2014 profit aur cash do alag cheezein hain.',
      formula: 'Invoiced \u2212 collected'
    }
  };

  /* Help icon — hover pe tooltip. Har jagah yahi use karo taaki consistent rahe. */
  function helpIcon(key, size) {
    var t = TERMS[key];
    if (!t) return '';
    size = size || 13;
    var body = t.short + (t.formula ? ' \u2014 ' + t.formula : '');
    return '<span class="help-dot" tabindex="0" role="button" ' +
      'aria-label="' + _attr(t.title + ': ' + body) + '" ' +
      'onclick="event.stopPropagation();showTermHelp(\'' + key + '\')" ' +
      'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();showTermHelp(\'' + key + '\')}" ' +
      'style="width:' + size + 'px;height:' + size + 'px;font-size:' + (size - 4) + 'px">?' +
      '<span class="help-tip" role="tooltip">' +
        '<strong>' + _esc(t.title) + '</strong>' + _esc(t.short) +
        (t.formula ? '<em>' + _esc(t.formula) + '</em>' : '') +
        '<span class="help-more">Click for detail</span>' +
      '</span></span>';
  }

  function _esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function _attr(v) { return _esc(v); }

  /* Metric explainer — term detail. (Help *page* hata di gayi hai; ye chhota
     modal/card metric ke '?' dot se khulta hai — tutorial nahi, definition hai.) */
  function showTermHelp(key) {
    var t = TERMS[key];
    if (!t) return;
    var body = '<p style="margin:0 0 10px;line-height:1.6">' + _esc(t.long) + '</p>' +
      (t.formula ? '<div style="background:rgba(0,0,0,.05);border-radius:8px;padding:10px;font-size:13px"><strong>How it\u2019s calculated:</strong> ' + _esc(t.formula) + '</div>' : '');
    if (typeof root.openModal === 'function') { root.openModal(t.title, body); return; }
    /* Fallback (employee app) — floating card */
    var old = root.document && root.document.getElementById('gl-term-pop');
    if (old) old.remove();
    var d = root.document.createElement('div');
    d.id = 'gl-term-pop';
    d.style.cssText = 'position:fixed;inset:auto 16px 16px 16px;max-width:420px;margin:auto;background:#fff;border:1px solid #E5E3DE;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.18);padding:16px;z-index:9999';
    d.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px"><strong>' + _esc(t.title) + '</strong><button style="border:0;background:none;cursor:pointer;font-size:16px" aria-label="Close">\u2715</button></div>' + body;
    d.querySelector('button').onclick = function () { d.remove(); };
    root.document.body.appendChild(d);
  }
  root.showTermHelp = showTermHelp;

  root.Glossary = {
    TERMS: TERMS,
    helpIcon: helpIcon,
    get: function (key) { return TERMS[key] || null; },
    showTermHelp: showTermHelp,
    keys: function () { return Object.keys(TERMS); }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.Glossary;

})(typeof window !== 'undefined' ? window : globalThis);
