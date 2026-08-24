/* ============================================================================
   ICONS — ek hi inline-SVG set, dono apps ke liye
   ----------------------------------------------------------------------------
   Pehle UI mein emoji the (✅ ⚠️ 🎯 👋 …). Emoji har OS pe alag render hote
   hain, colour inherit nahi karte, aur weight/size control nahi hota — is
   liye interface kabhi consistent nahi lagta tha.

   Ab sab kuch stroke-based SVG hai:
     • `currentColor` use karta hai — parent ka colour apne aap le leta hai
     • size/stroke props se control hota hai
     • optically ek hi grid (24×24) aur ek hi stroke weight par bana hai

   Use:
     ICON('check')                       -> 16px, currentColor
     ICON('alert-triangle', 20)          -> 20px
     ICON('clock', { size: 18, cls: 'x' })
     Icons.badge('user-plus', { tone: 'blue' })   -> tinted square badge
     Icons.hydrate(el)                   -> <i data-icon="check"></i> ko badal deta hai

   Purana data (localStorage mein emoji pade hain) apne aap map ho jaata hai —
   LEGACY table dekho. Unknown naam pe ek neutral dot aata hai, kabhi tofu box
   ya khaali jagah nahi.
   ============================================================================ */

(function (root) {
  'use strict';

  /* Har path 24×24 grid par. `s` = stroke paths, `f` = filled paths. */
  var P = {
    /* ── status ─────────────────────────────────────────────────────────── */
    'check':          'M20 6 9 17l-5-5',
    'check-circle':   'M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4 12 14.01l-3-3',
    'check-double':   'M1 12.5 5 17l6-7|M12 15l2 2 9-11',
    'x':              'M18 6 6 18M6 6l12 12',
    'x-circle':       'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M15 9l-6 6M9 9l6 6',
    'alert-triangle': 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4M12 17h.01',
    'alert-circle':   'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 8v5M12 16h.01',
    'info':           'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 16v-5M12 8h.01',
    'help':           'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4M12 17h.01',
    'circle':         'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'dot':            'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'square':         'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
    'minus':          'M5 12h14',
    'plus':           'M12 5v14M5 12h14',

    /* ── time ───────────────────────────────────────────────────────────── */
    'clock':          'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 7v5l3.2 1.9',
    'hourglass':      'M6 3h12M6 21h12|M8 3v3.2a4 4 0 0 0 1.4 3L12 12l-2.6 2.8a4 4 0 0 0-1.4 3V21M16 3v3.2a4 4 0 0 1-1.4 3L12 12l2.6 2.8a4 4 0 0 1 1.4 3V21',
    'timer':          'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M12 10v4l2.5 1.5M9 2h6',
    'calendar':       'M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z|M16 3v4M8 3v4M4 11h16',
    'calendar-check': 'M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z|M16 3v4M8 3v4M4 11h16M9.5 15.5l1.8 1.8 3.4-3.6',
    'calendar-x':     'M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z|M16 3v4M8 3v4M4 11h16M14.5 14.5l-5 5M9.5 14.5l5 5',
    'play':           'M7 4.5 19 12 7 19.5V4.5z',
    'pause':          'M9 4.5v15M15 4.5v15',
    'rotate':         'M21 12a9 9 0 1 1-2.6-6.4|M21 3v5h-5',

    /* ── people ─────────────────────────────────────────────────────────── */
    'user':           'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'users':          'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    'user-plus':      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M19 8v6M22 11h-6',
    'user-check':     'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M17 11.5l2 2 4-4',
    'user-x':         'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M18 8l5 5M23 8l-5 5',
    'wave':           'M7 11V6.5a1.5 1.5 0 0 1 3 0V11|M10 10.5V5a1.5 1.5 0 0 1 3 0v5.5|M13 11V6.5a1.5 1.5 0 0 1 3 0V13|M16 11.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-3.2a1.5 1.5 0 0 1 3 0',

    /* ── work ───────────────────────────────────────────────────────────── */
    'briefcase':      'M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z|M16 20V5a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v15',
    'folder':         'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
    'clipboard':      'M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2|M9 2.5h6a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5H9a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z',
    'file-text':      'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z|M14 3v5h5M9 13h6M9 17h4',
    'paperclip':      'M20.4 11.6 12 20a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 1 1 4.7 4.7l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.8-7.7',
    'inbox':          'M4 13h4l2 3h4l2-3h4|M6.4 4h11.2a2 2 0 0 1 1.8 1.2L22 13v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5l2.6-7.8A2 2 0 0 1 6.4 4z',
    'send':           'M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 10.1 21 3z',
    'upload':         'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M16.5 7.5 12 3 7.5 7.5M12 3v12.5',
    'download':       'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7.5 11 12 15.5 16.5 11M12 3v12.5',
    'package':        'M21 15.5v-7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8.5v7a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 15.5z|M3.3 7.4 12 12.5l8.7-5.1M12 22V12.5',
    'edit':           'M17 3.5a2.1 2.1 0 0 1 3 3L8 18.5l-4 1 1-4 12-12z',
    'search':         'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M21 21l-4.3-4.3',
    'filter':         'M21 4H3l7.2 8.5V19l3.6 2v-8.5L21 4z',
    'link':           'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7L11.8 5|M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12.2 19',

    /* ── milestones / progress ──────────────────────────────────────────── */
    'flag':           'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1v11z|M4 22v-7',
    'flag-check':     'M5 21V4.5s1.3-1 4-1 4.7 2 7.4 2c1.7 0 2.6-.5 2.6-.5v10s-.9.5-2.6.5c-2.7 0-4.7-2-7.4-2s-4 1-4 1|M9.6 10.2l1.8 1.8 3.6-3.8',
    'target':         'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z|M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    'route':          'M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z|M18 21.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z|M6 7.5V12a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v1',
    'trending-up':    'M22 7.5 13.5 16l-4.5-4.5L2 18.5|M16.5 7.5H22v5.5',
    'trending-down':  'M22 16.5 13.5 8l-4.5 4.5L2 5.5|M16.5 16.5H22V11',
    'activity':       'M22 12h-4l-3 8-6-16-3 8H2',
    'bar-chart':      'M6 20V10M12 20V4M18 20v-6',
    'zap':            'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
    'gauge':          'M4.2 18a9 9 0 1 1 15.6 0|M12 14l4-4',

    /* ── comms ──────────────────────────────────────────────────────────── */
    'bell':           'M18 8.5A6 6 0 0 0 6 8.5c0 6.5-3 8.5-3 8.5h18s-3-2-3-8.5|M13.7 20.5a2 2 0 0 1-3.4 0',
    'bell-off':       'M13.7 20.5a2 2 0 0 1-3.4 0|M18.6 13.6A17 17 0 0 1 18 8.5a6 6 0 0 0-9.3-5M5.9 5.9A6 6 0 0 0 6 8.5c0 6.5-3 8.5-3 8.5h14M2 2l20 20',
    'mail':           'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z|M3.3 6.2 12 12.5l8.7-6.3',
    'message':        'M21 11.5a8 8 0 0 1-11.6 7.2L3 20.5l1.8-6.1A8 8 0 1 1 21 11.5z',
    'megaphone':      'M3 11v2a1 1 0 0 0 1 1h2l7 5V5l-7 5H4a1 1 0 0 0-1 1z|M17.5 8.5a5 5 0 0 1 0 7|M6 14v4.5a1.5 1.5 0 0 0 3 0V16',
    'phone':          'M21.5 16.9v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.6-3 19.3 19.3 0 0 1-6-6 19.6 19.6 0 0 1-3-8.7A2 2 0 0 1 3.7 1.6h2.6a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.4 9.4a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
    'eye':            'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'lightbulb':      'M9 18h6|M10 21.5h4|M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.6V18h6v-2.1c0-.6.3-1.2.8-1.6A6.5 6.5 0 0 0 12 2.5z',

    /* ── money ──────────────────────────────────────────────────────────── */
    'rupee':          'M7 4h10M7 8.5h10M16.5 4c0 3.4-2.6 4.5-5.5 4.5H7l8 11.5',
    'receipt':        'M5 3.5 6.7 5l1.7-1.5L10.2 5l1.8-1.5L13.8 5l1.7-1.5L17.2 5l1.8-1.5v17L17.2 19l-1.7 1.5L13.8 19 12 20.5 10.2 19l-1.8 1.5L6.7 19 5 20.5v-17z|M9 9h6M9 13h6',
    'wallet':         'M3 7.5A2 2 0 0 1 5 5.5h13a1 1 0 0 1 1 1V9|M3 7.5V18a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z|M16.5 14.5h.01',
    'credit-card':    'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z|M3 10h18',

    /* ── org / misc ─────────────────────────────────────────────────────── */
    'grid':           'M4 4h6v6H4V4zM14 4h6v6h-6V4zM4 14h6v6H4v-6zM14 14h6v6h-6v-6z',
    'layers':         'M12 2.5 2.5 7 12 11.5 21.5 7 12 2.5z|M2.5 12 12 16.5 21.5 12|M2.5 17 12 21.5 21.5 17',
    'settings':       'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    'shield':         'M12 22s8-3.6 8-9.5V5.5L12 2.5 4 5.5V12.5C4 18.4 12 22 12 22z',
    'shield-check':   'M12 22s8-3.6 8-9.5V5.5L12 2.5 4 5.5V12.5C4 18.4 12 22 12 22z|M9 12l2 2 4-4.5',
    'leaf':           'M4 20c0-9 5-15 16-15 0 11-6 15-11.5 15H4z|M4 20c2.5-5 5.5-7.5 9.5-9.5',
    'sun':            'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z|M12 1.5v2M12 20.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1.5 12h2M20.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    'umbrella':       'M12 2.5a9.5 9.5 0 0 1 9.5 9.5H2.5A9.5 9.5 0 0 1 12 2.5z|M12 12v7a2.5 2.5 0 0 0 5 0',
    'coffee':         'M4 8h13v6.5a4.5 4.5 0 0 1-4.5 4.5h-4A4.5 4.5 0 0 1 4 14.5V8z|M17 9.5h1.5a2.75 2.75 0 0 1 0 5.5H17|M4 22h13',
    'utensils':       'M6 2.5v7a2.5 2.5 0 0 0 5 0v-7|M8.5 12v9.5|M17.5 2.5c-1.4 1-2.2 2.7-2.2 4.6V13h3.4V2.5z|M18.7 13v8.5',
    'run':            'M14 4.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5z|M9 22l2.2-5.2-2.7-2.8.9-5 3.6 3 3.5.7|M13 8.5 9.5 7 6 9.5|M16 12.5l3 1.5',
    'star':           'M12 2.8 15 9l6.8 1-4.9 4.8 1.2 6.8-6.1-3.2L5.9 21.6l1.2-6.8L2.2 10 9 9l3-6.2z',
    'sparkle':        'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z|M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z',
    'globe':          'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M3 12h18|M12 3a13.8 13.8 0 0 1 0 18 13.8 13.8 0 0 1 0-18z',
    'map-pin':        'M20 10.5c0 6-8 11.5-8 11.5s-8-5.5-8-11.5a8 8 0 0 1 16 0z|M12 13.2a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z',
    'log-out':        'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5M21 12H9',
    'menu':           'M3 12h18M3 6h18M3 18h18',
    'more':           'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    'chevron-right':  'M9 5l7 7-7 7',
    'chevron-left':   'M15 5l-7 7 7 7',
    'chevron-down':   'M5 9l7 7 7-7',
    'arrow-right':    'M4 12h15M13 6l6 6-6 6',
    'arrow-left':     'M20 12H5M11 18l-6-6 6-6',
    'arrow-up':       'M12 20V5M6 11l6-6 6 6',
    'arrow-down':     'M12 4v15M18 13l-6 6-6-6',
    'external':       'M14 4h6v6M20 4l-8.5 8.5|M18 14.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5'
  };

  /* Purane emoji -> naya icon. Data localStorage mein pada hai, is liye
     backwards compatible rehna zaroori hai. */
  var LEGACY = {
    '\u2705': 'check-circle', '\u2714': 'check', '\u2713': 'check',
    '\u274C': 'x-circle', '\u2715': 'x', '\u2716': 'x', '\u2717': 'x',
    '\u26A0': 'alert-triangle', '\u26A0\uFE0F': 'alert-triangle',
    '\u23F3': 'hourglass', '\u23F0': 'clock', '\u23F1': 'timer', '\u23F8': 'pause', '\u25B6': 'play',
    '\uD83D\uDCC5': 'calendar', '\uD83D\uDCC1': 'folder', '\uD83D\uDCCB': 'clipboard',
    '\uD83D\uDCCE': 'paperclip', '\uD83D\uDCE4': 'upload', '\uD83D\uDCE7': 'mail',
    '\uD83D\uDCE2': 'megaphone', '\uD83D\uDCA1': 'lightbulb', '\uD83D\uDC41': 'eye',
    '\uD83D\uDC64': 'user', '\uD83D\uDC65': 'users', '\uD83D\uDC4B': 'wave',
    '\uD83C\uDFAF': 'target', '\uD83C\uDF89': 'flag-check', '\uD83C\uDFC1': 'flag-check',
    '\uD83D\uDD04': 'rotate', '\uD83D\uDD0D': 'search', '\uD83D\uDD14': 'bell',
    '\uD83E\uDDFE': 'receipt', '\uD83D\uDCB0': 'wallet', '\uD83C\uDF41': 'leaf',
    '\uD83C\uDFD6': 'umbrella', '\uD83C\uDFD6\uFE0F': 'umbrella',
    '\u2699': 'settings', '\u2699\uFE0F': 'settings', '\u2139': 'info',
    '\uD83C\uDF71': 'utensils', '\u2615': 'coffee', '\uD83C\uDFC3': 'run',
    '\uD83D\uDCAA': 'zap', '\u270D': 'edit', '\uD83D\uDCE6': 'package',
    '\uD83D\uDD32': 'square', '\u2B50': 'star', '\u2605': 'star', '\u25CB': 'circle',
    '\u25CF': 'dot', '\u2192': 'arrow-right', '\u2190': 'arrow-left', '\u2191': 'arrow-up'
  };

  /* Tint tokens — badge() ke liye */
  var TONES = {
    neutral: ['var(--s2, #F0EEE9)',      'var(--t2, #5C5A60)'],
    slate:   ['var(--s3, #E8E5DF)',      'var(--t1, #18171A)'],
    blue:    ['var(--blue-light, #EFF6FF)',  'var(--blue, #2563EB)'],
    green:   ['var(--green-light, #ECFDF5)', 'var(--green, #059669)'],
    amber:   ['var(--amber-light, #FFFBEB)', 'var(--amber, #D97706)'],
    red:     ['var(--red-light, #FEF2F2)',   'var(--red, #DC2626)'],
    spruce:  ['var(--spruce-tint, #E9F3EE)', 'var(--spruce, #0E6B4F)'],
    violet:  ['#F5F3FF',                 '#7C3AED']
  };

  function resolve(name) {
    if (name == null) return 'dot';
    name = String(name).trim();
    if (P[name]) return name;
    if (LEGACY[name]) return LEGACY[name];
    /* Variation selector hata ke dobara — "⚠️" jaise cases ke liye */
    var bare = name.replace(/[\uFE0E\uFE0F]/g, '');
    if (P[bare]) return bare;
    if (LEGACY[bare]) return LEGACY[bare];
    return 'dot';
  }

  /* Filled icons (dot, star, square) ko stroke nahi, fill chahiye */
  var FILLED = { dot: 1, star: 1 };

  /**
   * @param {string} name  icon key (ya purana emoji)
   * @param {number|object} opts  size, ya { size, stroke, cls, style, title }
   * @returns {string} inline SVG markup
   */
  function svg(name, opts) {
    if (typeof opts === 'number') opts = { size: opts };
    opts = opts || {};

    var key    = resolve(name);
    var size   = opts.size || 16;
    var stroke = opts.stroke || 1.75;
    var cls    = opts.cls ? ' ' + opts.cls : '';
    var style  = opts.style ? ' style="' + String(opts.style).replace(/"/g, '&quot;') + '"' : '';
    var title  = opts.title
      ? '<title>' + String(opts.title).replace(/[<>&"]/g, '') + '</title>'
      : '';

    var paint = FILLED[key]
      ? 'fill="currentColor" stroke="none"'
      : 'fill="none" stroke="currentColor" stroke-width="' + stroke +
        '" stroke-linecap="round" stroke-linejoin="round"';

    var d = P[key].split('|').map(function (seg) {
      return '<path d="' + seg + '"/>';
    }).join('');

    return '<svg class="icon' + cls + '" width="' + size + '" height="' + size +
           '" viewBox="0 0 24 24" ' + paint +
           ' aria-hidden="true" focusable="false"' + style + '>' + title + d + '</svg>';
  }

  /** Tinted rounded-square badge — activity feed / alerts / notifications. */
  function badge(name, opts) {
    opts = opts || {};
    var tone = TONES[opts.tone] || TONES.neutral;
    var bg   = opts.bg   || tone[0];
    var fg   = opts.fg   || tone[1];
    var box  = opts.box  || 30;
    var size = opts.size || Math.round(box * 0.53);
    var cls  = opts.cls ? ' ' + opts.cls : '';
    return '<span class="icon-badge' + cls + '" style="width:' + box + 'px;height:' + box +
           'px;background:' + bg + ';color:' + fg + '">' + svg(name, { size: size }) + '</span>';
  }

  /** `<i data-icon="check" data-size="18">` ko asli SVG se replace karta hai. */
  function hydrate(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-icon]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.innerHTML = svg(n.getAttribute('data-icon'), {
        size:   Number(n.getAttribute('data-size')) || 16,
        stroke: Number(n.getAttribute('data-stroke')) || 1.75
      });
      n.removeAttribute('data-icon');
    }
  }

  function has(name) { return !!P[String(name)]; }
  function names()   { return Object.keys(P).sort(); }

  var API = { svg: svg, badge: badge, hydrate: hydrate, has: has, names: names,
              resolve: resolve, TONES: TONES };

  root.Icons = API;
  root.ICON  = svg;   /* templates mein chhota naam */

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
