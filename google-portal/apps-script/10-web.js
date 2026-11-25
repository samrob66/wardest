/**
 * Web entry points. The web app is deployed "Execute as: Me" (the shared account) and "Who has
 * access: Anyone".
 *   GET  ?api=serve|post|help|ping   JSON for the hub pages
 *   GET  ?page=serve|post|help|confirm|leader|me   the same pages served by the script (fallback)
 *   POST (text/plain body holding JSON {action, ...})   every action that changes or reads private data
 *   gpApi(req)   the fallback pages' google.script.run channel
 */

var PAGE_TITLES = {
  serve: 'Service Opportunities',
  post: 'Service Opportunity',
  help: 'Request Help or Service',
  confirm: 'Your Sign-up',
  leader: 'Leader Page',
  me: 'My Sign-ups',
};

var POST_ACTIONS = [
  'signup',
  'tokenInfo',
  'cancel',
  'confirm',
  'withdraw',
  'me',
  'requestMeLink',
  'cancelMine',
  'resendConfirm',
  'requestLeaderLink',
  'whoami',
  'listPosts',
  'getPost',
  'savePost',
  'removeSignup',
  'signOutEverywhere',
  'cancelPost',
  'cancelDate',
  'waiting',
  'decide',
  'bishopric',
  'volunteers',
  'needsHelp',
];

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  gpBegin_();
  var p = (e && e.parameter) || {};
  if (p.api === 'serve' || p.api === 'post' || p.api === 'help') {
    return jsonOut_(dispatch_(p.api, { p: p.p }));
  }
  if (p.api === 'ping') return jsonOut_({ ok: true, at: nowLocal_(), build: GP_BUILD });
  if (p.page && PAGE_TITLES.hasOwnProperty(p.page) && GP_PAGES.hasOwnProperty(p.page)) {
    var s = settings_();
    return HtmlService.createHtmlOutput(renderPage_(p.page, s, true))
      .setTitle(PAGE_TITLES[p.page] + ' · ' + (s.ward_name || 'Ward'))
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return jsonOut_({ ok: false, error: TEXT.notFound });
}

function doPost(e) {
  gpBegin_();
  var data = null;
  try {
    data = JSON.parse(e && e.postData && e.postData.contents);
  } catch (err) {
    data = null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return jsonOut_({ ok: false, error: TEXT.badRequest });
  if (POST_ACTIONS.indexOf(data.action) < 0) return jsonOut_({ ok: false, error: TEXT.notFound });
  return jsonOut_(dispatch_(data.action, data));
}

/** The fallback pages call this through google.script.run. */
function gpApi(req) {
  gpBegin_();
  if (!req || typeof req !== 'object') return { ok: false, error: TEXT.badRequest };
  var a = req.action;
  if (a !== 'serve' && a !== 'post' && a !== 'help' && POST_ACTIONS.indexOf(a) < 0) return { ok: false, error: TEXT.notFound };
  // Round-trip through JSON so the page gets plain data (google.script.run refuses some values).
  return JSON.parse(JSON.stringify(dispatch_(a, req)));
}

/** Runs one action; never throws. Errors are logged and answered without details. */
function dispatch_(action, data) {
  data = data || {};
  var handlers = {
    serve: function () {
      return apiServe_();
    },
    post: function () {
      return apiPost_(data.p);
    },
    help: function () {
      return apiHelp_();
    },
    signup: function () {
      return apiSignup_(data);
    },
    tokenInfo: function () {
      return apiTokenInfo_(data);
    },
    cancel: function () {
      return apiCancel_(data);
    },
    confirm: function () {
      return apiConfirm_(data);
    },
    withdraw: function () {
      return apiWithdraw_(data);
    },
    me: function () {
      return apiMe_(data);
    },
    requestMeLink: function () {
      return apiRequestMeLink_(data);
    },
    cancelMine: function () {
      return apiCancelMine_(data);
    },
    resendConfirm: function () {
      return apiResendConfirm_(data);
    },
    requestLeaderLink: function () {
      return apiRequestLeaderLink_(data);
    },
    whoami: function () {
      return apiWhoami_(data);
    },
    listPosts: function () {
      return apiListPosts_(data);
    },
    getPost: function () {
      return apiGetPost_(data);
    },
    savePost: function () {
      return apiSavePost_(data);
    },
    removeSignup: function () {
      return apiRemoveSignup_(data);
    },
    signOutEverywhere: function () {
      return apiSignOutEverywhere_(data);
    },
    cancelPost: function () {
      return apiCancelPost_(data);
    },
    cancelDate: function () {
      return apiCancelDate_(data);
    },
    waiting: function () {
      return apiWaiting_(data);
    },
    decide: function () {
      return apiDecide_(data);
    },
    bishopric: function () {
      return apiBishopric_(data);
    },
    volunteers: function () {
      return apiVolunteers_(data);
    },
    needsHelp: function () {
      return apiNeedsHelp_(data);
    },
  };
  if (!handlers.hasOwnProperty(action)) return { ok: false, error: TEXT.notFound };
  try {
    ensureUpgraded_();
  } catch (e0) {
    log_('upgrade failed', clip(e0 && e0.message ? e0.message : e0, 300));
  }
  try {
    // When the phase 2 web app first answered: the end of the old web app's gap (migration).
    if (!props_().getProperty('PHASE2_WEB_AT')) props_().setProperty('PHASE2_WEB_AT', nowLocal_());
  } catch (e1) {
    // not needed to answer
  }
  try {
    return handlers[action]();
  } catch (err) {
    if (err && err.gpBusy) return { ok: false, error: TEXT.busy };
    log_('api error', action + ' | ' + clip(err && err.message ? err.message : err, 300));
    var contact = '';
    try {
      contact = settings_().contact_email;
    } catch (e2) {
      contact = '';
    }
    return { ok: false, error: TEXT.genericError + (contact || 'the ward') + '.' };
  }
}

/** JSON for inside a <script>: no '<' so nothing can close the script tag. */
function jsonForScript_(v) {
  return JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}

/** Fills {{NAME}} placeholders: JSON inside <script> blocks, HTML-escaped everywhere else. */
function fillTemplate_(html, values) {
  var parts = html.split(/(<script\b[^>]*>[\s\S]*?<\/script>)/i);
  return parts
    .map(function (part, i) {
      var inScript = i % 2 === 1;
      return part.replace(/\{\{([A-Z_]+)\}\}/g, function (m, name) {
        if (!values.hasOwnProperty(name)) return m;
        return inScript ? jsonForScript_(values[name]) : esc(values[name]);
      });
    })
    .join('');
}

// ---------- the ward's look (2.3, decision 20) ----------

var THEME_SERIF_FALLBACK = "Georgia, 'Times New Roman', serif";

/** An https picture address safe inside CSS url("…"): no quotes, spaces, brackets or backslashes. */
function isThemeImageUrl_(v) {
  var u = String(v == null ? '' : v).trim();
  return u.length <= 500 && /^https:\/\/[^\s"'()<>\\]+$/i.test(u);
}

function isThemeColour_(v) {
  return /^#[0-9a-fA-F]{6}$/.test(String(v == null ? '' : v).trim());
}

/** A Google Fonts family name: letters, digits and spaces, at most 40. */
function isThemeFont_(v) {
  var f = String(v == null ? '' : v).trim();
  return f.length > 0 && f.length <= 40 && /^[A-Za-z0-9 ]+$/.test(f);
}

/** WCAG contrast ratio of a #rrggbb colour against white. */
function contrastWithWhite_(hex) {
  var h = String(hex).replace('#', '');
  var lin = function (i) {
    var c = parseInt(h.substr(i, 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  var L = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  return 1.05 / (L + 0.05);
}

/**
 * The Settings theme, checked: {bg, accent, font, headingFont, problems}. A value that fails its
 * check is left out (today's look for that part) and named in problems (Check health).
 */
function themeOf_(s) {
  var t = { bg: '', accent: '', font: '', headingFont: '', problems: [] };
  var val = function (k) {
    return String(s[k] == null ? '' : s[k]).trim();
  };
  var bg = val('theme_background_url');
  if (bg) {
    if (isThemeImageUrl_(bg)) t.bg = bg;
    else t.problems.push('theme_background_url must be a full https address of a picture (no spaces or quotes); it is ignored.');
  }
  var accent = val('theme_accent');
  if (accent) {
    if (isThemeColour_(accent)) t.accent = accent.toLowerCase();
    else t.problems.push('theme_accent must be a colour like #2f5d50; it is ignored.');
  }
  ['theme_font', 'theme_heading_font'].forEach(function (k) {
    var f = val(k);
    if (!f) return;
    if (isThemeFont_(f)) t[k === 'theme_font' ? 'font' : 'headingFont'] = f;
    else t.problems.push(k + ' must be a Google Fonts family name (letters, digits and spaces, at most 40), e.g. Lora; it is ignored.');
  });
  return t;
}

/** The <link> and <style> that put the theme on a page ('' when nothing is set). */
function themeHead_(t) {
  var vars = [];
  if (t.bg) {
    vars.push('--gp-bg: linear-gradient(rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.42)), url("' + t.bg + '")');
    vars.push('--gp-panel: rgba(255, 255, 255, 0.92)');
    vars.push('--gp-panel-radius: 14px');
    vars.push('--gp-panel-pad: 1rem');
  }
  if (t.accent) {
    vars.push('--gp-accent: ' + t.accent);
    vars.push('--gp-bar: ' + t.accent);
    // Text colours only when the accent reads on white (4.5:1); a light accent stays decoration.
    if (contrastWithWhite_(t.accent) >= 4.5) {
      vars.push('--gp-link: ' + t.accent);
      vars.push('--gp-button: ' + t.accent);
    }
  }
  if (t.font) vars.push("--gp-font: '" + t.font + "', " + THEME_SERIF_FALLBACK);
  if (t.headingFont) vars.push("--gp-heading-font: '" + t.headingFont + "', " + THEME_SERIF_FALLBACK);
  if (!vars.length) return '';
  var families = uniq_([t.font, t.headingFont].filter(String));
  var link = families.length
    ? '<link rel="stylesheet" href="' +
      esc(
        'https://fonts.googleapis.com/css2?' +
          families
            .map(function (f) {
              return 'family=' + f.replace(/ /g, '+') + ':wght@400;700';
            })
            .join('&') +
          '&display=swap'
      ) +
      '">\n'
    : '';
  return link + '<style id="gp-theme">\n:root {\n  ' + vars.join(';\n  ') + ';\n}\n</style>\n';
}

/** A page from GP_PAGES with the ward's values filled in, and the ward's look when set. */
function renderPage_(name, s, fallback) {
  var html = GP_PAGES[name];
  if (!s.preview_image_url) html = html.replace(/[^\n]*\{\{PREVIEW_IMAGE\}\}[^\n]*\n/g, '');
  var head = themeHead_(themeOf_(s));
  if (head) html = html.replace('</head>', function () {
    return head + '</head>';
  });
  return fillTemplate_(html, {
    WARD_NAME: s.ward_name || '',
    WEB_APP_URL: s.web_app_url || '',
    CONTACT_EMAIL: s.contact_email || '',
    PREVIEW_IMAGE: s.preview_image_url || '',
    FALLBACK: !!fallback,
    PAGE_TITLE: PAGE_TITLES[name] || '',
  });
}

/** The hub sections snippet with the ward's short links. */
function renderHubSections_(s) {
  var bare = function (u) {
    return String(u || '').replace(/^https?:\/\//, '');
  };
  return fillTemplate_(GP_HUB_SECTIONS, {
    WARD_NAME: s.ward_name || '',
    SERVE_SHORT_LINK: bare(s.serve_short_link),
    HELP_SHORT_LINK: bare(s.help_short_link),
  });
}
