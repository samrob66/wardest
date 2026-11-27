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
  };
})();
