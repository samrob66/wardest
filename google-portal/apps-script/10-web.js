/**
 * Web entry points. The web app is deployed "Execute as: Me" (the shared account) and "Who has
 * access: Anyone".
 *   GET  ?api=serve|post|help|ping   JSON for the hub pages
 *   GET  ?page=serve|post|help|confirm|leader   the same pages served by the script (fallback)
 *   POST (text/plain body holding JSON {action, ...})   every action that changes or reads private data
 *   gpApi(req)   the fallback pages' google.script.run channel
 */

var PAGE_TITLES = {
  serve: 'Service Opportunities',
  post: 'Service Opportunity',
  help: 'Request Help or Service',
  confirm: 'Your Sign-up',
  leader: 'Leader Page',
};

var POST_ACTIONS = [
  'signup',
  'tokenInfo',
  'cancel',
  'requestLeaderLink',
  'whoami',
  'listPosts',
  'getPost',
  'savePost',
  'removeSignup',
  'sendDetails',
  'signOutEverywhere',
  'cancelPost',
  'cancelDate',
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
  if (p.api === 'ping') return jsonOut_({ ok: true, at: nowLocal_() });
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
    sendDetails: function () {
      return apiSendDetails_(data);
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
  };
  if (!handlers.hasOwnProperty(action)) return { ok: false, error: TEXT.notFound };
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

/** A page from GP_PAGES with the ward's values filled in. */
function renderPage_(name, s, fallback) {
  var html = GP_PAGES[name];
  if (!s.preview_image_url) html = html.replace(/[^\n]*\{\{PREVIEW_IMAGE\}\}[^\n]*\n/g, '');
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
