/* Service Portal page code, shared by every page (inlined by build.mjs).
   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use
   google.script.run. Data only ever reaches the page through textContent, never as HTML. */
var GP = (function () {
  'use strict';
  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };
  var GET_ACTIONS = { serve: true, post: true, help: true };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];

  function init(c) {
    cfg = {
      page: c.page || '',
      wardName: c.wardName || '',
      webAppUrl: c.webAppUrl || '',
      contact: c.contact || '',
      fallback: !!c.fallback,
    };
    return cfg;
  }

  function config() {
    return cfg;
  }

  // ---------- talking to the script ----------

  function call(action, data) {
    data = data || {};
    var req = { action: action };
    Object.keys(data).forEach(function (k) {
      req[k] = data[k];
    });
    if (cfg.fallback) {
      return new Promise(function (resolve, reject) {
        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);
      });
    }
    var opts;
    var url = cfg.webAppUrl;
    if (GET_ACTIONS[action]) {
      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');
      opts = { method: 'GET', redirect: 'follow' };
    } else {
      // A text/plain body keeps this a "simple" request: no preflight.
      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };
    }
    return fetch(url, opts).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function parseHash(h) {
    var out = {};
    String(h || '')
      .replace(/^#/, '')
      .split('&')
      .forEach(function (part) {
        if (!part) return;
        var i = part.indexOf('=');
        var k = i < 0 ? part : part.slice(0, i);
        var v = i < 0 ? '' : part.slice(i + 1);
        try {
          out[decodeURIComponent(k)] = decodeURIComponent(v);
        } catch (e) {
          out[k] = v;
        }
      });
    return out;
  }

  function hash() {
    if (cfg.fallback) {
      return new Promise(function (resolve) {
        google.script.url.getLocation(function (loc) {
          resolve(parseHash(loc.hash));
        });
      });
    }
    return Promise.resolve(parseHash(window.location.hash));
  }

  function hashString(h) {
    return Object.keys(h || {})
      .map(function (k) {
        return k + '=' + encodeURIComponent(h[k]);
      })
      .join('&');
  }

  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */
  function pageUrl(page, h) {
    var tail = hashString(h);
    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';
    return base + (tail ? '#' + tail : '');
  }

  // ---------- DOM ----------

  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'value') node.value = v;
      else if (k === 'checked') node.checked = !!v;
      else if (k === 'href') node.setAttribute('href', safeHref(v));
      else node.setAttribute(k, v === true ? '' : String(v));
    });
    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  function safeHref(v) {
    var s = String(v);
    return /^(https?:|mailto:|[a-z0-9-]+\.html|#|\?)/i.test(s) ? s : '#';
  }

  function $(id) {
    return document.getElementById(id);
  }

  function clear(node) {
    node.innerHTML = '';
    return node;
  }

  function show(node, children) {
    clear(node);
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c) node.appendChild(c);
    });
  }

  function message(kind, text) {
    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);
  }

  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */
  function footer() {
    var f = $('gp-footer');
    if (!f) return;
    var c = f.querySelector('.gp-contact');
    if (c && !cfg.contact) c.className += ' gp-hidden';
  }

  function unreachable(page) {
    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');
    return el('div', { class: 'gp-alert', role: 'alert' }, [
      "Can't load right now. Try this link instead: ",
      el('a', { href: url }, url),
    ]);
  }

  function errorText(res) {
    return (res && res.error) || 'Something went wrong. Please try again.';
  }

  function copyText(text, button) {
    function done() {
      if (button) {
        var old = button.textContent;
        button.textContent = 'Copied';
        setTimeout(function () {
          button.textContent = old;
        }, 1500);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        window.prompt('Copy this link:', text);
      });
    } else {
      window.prompt('Copy this link:', text);
    }
  }

  // ---------- pure helpers ----------

  function isDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);
  }

  function utc(s) {
    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  }

  function iso(ms) {
    var d = new Date(ms);
    var m = d.getUTCMonth() + 1;
    var day = d.getUTCDate();
    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */
  function expandDates(start, end, weekdays) {
    if (!isDate(start) || !isDate(end)) return [];
    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];
    var out = [];
    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {
      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));
    }
    return out;
  }

  /** A post's audiences in the fixed order (Brothers, Sisters, Youth, Children). */
  function audiencesOf(p) {
    var have = p.audiences || [];
    return AUDIENCES.filter(function (a) {
      return have.indexOf(a) >= 0;
    });
  }

  /** 'Brothers · Sisters' (the fixed order). */
  function audienceLine(p) {
    return audiencesOf(p).join(' · ');
  }

  /**
   * {Everyone: [], Brothers: [], Sisters: [], Youth: [], Children: []}, each post in exactly one
   * group: Everyone when it has more than one audience, else its one audience (decision 23).
   * Full posts last in each group.
   */
  function groupByAudience(posts) {
    var out = { Everyone: [] };
    AUDIENCES.forEach(function (a) {
      out[a] = [];
    });
    (posts || []).forEach(function (p) {
      var aud = audiencesOf(p);
      if (aud.length > 1) out.Everyone.push(p);
      else if (aud.length === 1) out[aud[0]].push(p);
    });
    ['Everyone'].concat(AUDIENCES).forEach(function (a) {
      out[a] = out[a]
        .filter(function (p) {
          return !p.full;
        })
        .concat(
          out[a].filter(function (p) {
            return p.full;
          })
        );
    });
    return out;
  }

  /** 'Thu, Dec 3' */
  function fmtDate(s) {
    if (!isDate(s)) return String(s || '');
    var d = new Date(utc(s));
    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
  }

  /** '6:30 PM' */
  function fmtTime(t) {
    if (!/^\d{2}:\d{2}$/.test(String(t || ''))) return '';
    var h = +t.slice(0, 2);
    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');
  }

  function fmtTimes(start, end) {
    if (!start) return '';
    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');
  }

  function fillBar(filled, needed) {
    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;
    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [
      el('span', { style: 'width:' + pct + '%' }),
    ]);
  }

  // ---------- 2.5: icons, status chips, dates, the scheduler ----------

  var LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /** One stroke family (24 x 24): each icon is a list of [shape, attributes]. */
  var ICONS = {
    check: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
    clock: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M12 7.5V12l3 2' }]],
    mail: [['rect', { x: 3.5, y: 5.5, width: 17, height: 13, rx: 2 }], ['path', { d: 'M4 7l8 6 8-6' }]],
    x: [['path', { d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' }]],
    shield: [['path', { d: 'M12 3.5l7 3v5.2c0 4.3-3 7.6-7 8.8-4-1.2-7-4.5-7-8.8V6.5z' }]],
    dot: [['circle', { cx: 12, cy: 12, r: 2.5 }]],
    plus: [['path', { d: 'M12 5v14M5 12h14' }]],
    cal: [['rect', { x: 3.5, y: 5, width: 17, height: 15.5, rx: 2 }], ['path', { d: 'M3.5 9.5h17M8 3v4M16 3v4' }]],
    repeat: [['path', { d: 'M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19l-3-3M20 13v1.5A3.5 3.5 0 0 1 16.5 18H5l3 3' }]],
    users: [['circle', { cx: 9, cy: 8.5, r: 3.2 }], ['path', { d: 'M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5' }], ['circle', { cx: 17, cy: 9.5, r: 2.5 }], ['path', { d: 'M16 14.2c2.4.1 4 1.7 4.5 4.3' }]],
    user: [['circle', { cx: 12, cy: 8.5, r: 3.5 }], ['path', { d: 'M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6' }]],
    alert: [['path', { d: 'M12 4l9 15.5H3z' }], ['path', { d: 'M12 10v4M12 16.8v.2' }]],
    chevR: [['path', { d: 'M9.5 6l6 6-6 6' }]],
    chevL: [['path', { d: 'M14.5 6l-6 6 6 6' }]],
    copy: [['rect', { x: 8.5, y: 8.5, width: 11, height: 11, rx: 2 }], ['path', { d: 'M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5' }]],
    link: [['path', { d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1' }], ['path', { d: 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' }]],
    edit: [['path', { d: 'M4.5 19.5l1-4 10-10a2.1 2.1 0 0 1 3 3l-10 10z' }], ['path', { d: 'M14 7l3 3' }]],
    list: [['path', { d: 'M9 6.5h11M9 12h11M9 17.5h11' }], ['circle', { cx: 4.8, cy: 6.5, r: 0.6 }], ['circle', { cx: 4.8, cy: 12, r: 0.6 }], ['circle', { cx: 4.8, cy: 17.5, r: 0.6 }]],
    more: [['circle', { cx: 5.5, cy: 12, r: 1 }], ['circle', { cx: 12, cy: 12, r: 1 }], ['circle', { cx: 18.5, cy: 12, r: 1 }]],
    lock: [['rect', { x: 5, y: 10.5, width: 14, height: 10, rx: 2 }], ['path', { d: 'M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5' }]],
    qr: [['rect', { x: 3.5, y: 3.5, width: 7, height: 7 }], ['rect', { x: 13.5, y: 3.5, width: 7, height: 7 }], ['rect', { x: 3.5, y: 13.5, width: 7, height: 7 }], ['path', { d: 'M13.5 13.5h3v3h-3zM18 18h2.5v2.5H18z' }]],
    print: [['path', { d: 'M7 9V3.5h10V9' }], ['rect', { x: 3.5, y: 9, width: 17, height: 8, rx: 1.5 }], ['path', { d: 'M7 14.5h10v6H7z' }]],
    send: [['path', { d: 'M4 12l16-7.5-5.5 16-3-6.5z' }], ['path', { d: 'M11.5 14L20 4.5' }]],
    flag: [['path', { d: 'M5.5 21V4.5' }], ['path', { d: 'M5.5 5h11l-2 4 2 4h-11' }]],
  };

  function svgNode(tag) {
    return document.createElementNS ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  }

  /** An icon as an SVG element (built node by node: nothing is parsed as HTML). */
  function icon(name) {
    var svg = svgNode('svg');
    svg.setAttribute('class', 'gp-ic');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    (ICONS.hasOwnProperty(name) ? ICONS[name] : []).forEach(function (shape) {
      var n = svgNode(shape[0]);
      Object.keys(shape[1]).forEach(function (k) {
        n.setAttribute(k, String(shape[1][k]));
      });
      svg.appendChild(n);
    });
    return svg;
  }

  /** Status: a ringed icon and a coloured word, never colour alone. */
  var CHIPS = {
    approved: ['ok', 'check', 'Approved'],
    leader: ['leader', 'shield', 'Leader'],
    needs: ['wait', 'clock', 'Needs approval'],
    email: ['email', 'mail', 'Email not confirmed'],
    declined: ['bad', 'x', 'Declined'],
    revoked: ['bad', 'x', 'Revoked'],
    confirmed: ['ok', 'check', 'Confirmed'],
  };

  /** kind: approved|leader|needs|email|declined|revoked|confirmed; anything else is a neutral chip showing word. */
  function chip(kind, word) {
    var c = CHIPS.hasOwnProperty(kind) ? CHIPS[kind] : ['neutral', 'dot', String(word || kind || 'Unknown')];
    return el('span', { class: 'gp-chip gp-chip-' + c[0] }, [icon(c[1]), el('span', {}, c[2])]);
  }

  // The 2.4 volunteer enum (listVolunteers status, listPosts volunteerStatus) and today's words.
  var ENUM_KIND = { leader: 'leader', approved: 'approved', needs_approval: 'needs', email_not_confirmed: 'email', declined: 'declined', revoked: 'revoked' };
  var WORD_KIND = { 'Waiting-email': 'email', 'Waiting-approval': 'needs', Confirmed: 'confirmed', Approved: 'approved', Declined: 'declined', Revoked: 'revoked' };

  /** The chip kind for a sign-up or a volunteer, from whatever the answer carries; '' when unknown. */
  function signupKind(o) {
    if (!o || typeof o !== 'object') return '';
    if (ENUM_KIND.hasOwnProperty(o.volunteerStatus)) return ENUM_KIND[o.volunteerStatus];
    if (o.leader === true || o.isLeader === true) return 'leader';
    var st = o.status;
    if (ENUM_KIND.hasOwnProperty(st)) return ENUM_KIND[st];
    if (WORD_KIND.hasOwnProperty(st)) return WORD_KIND[st];
    if (st === 'Pending') return o.emailConfirmed ? 'needs' : 'email';
    return '';
  }

  /** The chip for a sign-up or volunteer; an unknown status shows its raw word. */
  function statusChip(o) {
    return chip(signupKind(o), o && o.status ? o.status : '');
  }

  function weekday(s) {
    return isDate(s) ? DAYS[new Date(utc(s)).getUTCDay()] : '';
  }

  /** {dow: 'WED', day: '2', mon: 'Dec'} for the date tiles, or null. */
  function tile(s) {
    if (!isDate(s)) return null;
    var d = new Date(utc(s));
    return { dow: DAYS[d.getUTCDay()].toUpperCase(), day: String(d.getUTCDate()), mon: MONTHS[d.getUTCMonth()] };
  }

  /** 'Wednesday, December 2' */
  function fmtLong(s) {
    if (!isDate(s)) return String(s || '');
    var d = new Date(utc(s));
    return LONG_DAYS[d.getUTCDay()] + ', ' + LONG_MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
  }

  /** Today on this device's calendar, 'YYYY-MM-DD'. */
  function today() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  /** 'YYYY-MM' plus n months. */
  function addMonths(ym, n) {
    var total = +ym.slice(0, 4) * 12 + (+ym.slice(5, 7) - 1) + n;
    var y = Math.floor(total / 12);
    var m = (total - y * 12) + 1;
    return y + '-' + (m < 10 ? '0' : '') + m;
  }

  /** A month for the calendar: {title: 'December 2026', lead: blanks before the 1st, days: [iso…]}. */
  function monthDays(ym) {
    var first = utc(ym + '-01');
    var next = utc(addMonths(ym, 1) + '-01');
    var days = [];
    for (var t = first; t < next; t += 86400000) days.push(iso(t));
    return { title: LONG_MONTHS[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4), lead: new Date(first).getUTCDay(), days: days };
  }

  var MAX_DATES = 60;

  /**
   * Every week: the dates on the given weekdays (0 = Sunday) from..until. {dates, all, error?}:
   * all = every date in the range (each shown with its skip switch), dates = all minus skip.
   */
  function weekly(weekdays, from, until, skip) {
    if (!isDate(from) || !isDate(until)) return { dates: [], all: [], error: 'Pick a From and an Until date.' };
    if (utc(until) < utc(from)) return { dates: [], all: [], error: 'Until is before From.' };
    var days = (weekdays || []).map(Number);
    if (!days.length) return { dates: [], all: [], error: 'Pick at least one day of the week.' };
    var all = [];
    for (var t = utc(from); t <= utc(until); t += 86400000) {
      if (days.indexOf(new Date(t).getUTCDay()) >= 0) {
        all.push(iso(t));
        if (all.length > MAX_DATES) return { dates: [], all: [], error: 'That is more than 60 dates; pick a shorter range.' };
      }
    }
    var dates = all.filter(function (d) {
      return (skip || []).indexOf(d) < 0;
    });
    return { dates: dates, all: all };
  }

  /** Dates grouped by week, Sunday to Saturday, in order. */
  function byWeek(dates) {
    var out = [];
    var key = null;
    (dates || []).slice().sort().forEach(function (d) {
      var t = utc(d);
      var k = t - new Date(t).getUTCDay() * 86400000;
      if (k !== key) {
        out.push([]);
        key = k;
      }
      out[out.length - 1].push(d);
    });
    return out;
  }

  return {
    init: init,
    config: config,
    call: call,
    hash: hash,
    parseHash: parseHash,
    pageUrl: pageUrl,
    el: el,
    $: $,
    clear: clear,
    show: show,
    message: message,
    footer: footer,
    unreachable: unreachable,
    errorText: errorText,
    copyText: copyText,
    expandDates: expandDates,
    groupByAudience: groupByAudience,
    audienceLine: audienceLine,
    fmtDate: fmtDate,
    fmtTime: fmtTime,
    fmtTimes: fmtTimes,
    fillBar: fillBar,
    isDate: isDate,
    AUDIENCES: AUDIENCES,
    utc: utc,
    iso: iso,
    icon: icon,
    chip: chip,
    signupKind: signupKind,
    statusChip: statusChip,
    weekday: weekday,
    tile: tile,
    fmtLong: fmtLong,
    today: today,
    addMonths: addMonths,
    monthDays: monthDays,
    sched: { weekly: weekly, byWeek: byWeek, MAX: MAX_DATES },
  };
})();
