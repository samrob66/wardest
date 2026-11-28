/**
 * Requests: one Google Form per request category, a private folder per category shared only
 * with its readers, and a month sheet in that folder. A form-submit trigger copies each answer
 * into the sheet, deletes it from the form and sends notices that say nothing about the
 * request. The daily job stamps Closed on, removes rows 30 days after closing and, on the 1st,
 * moves to a new month sheet and permanently deletes the old file (version history included).
 */

var REQ_Q = {
  name: 'Name',
  contact: 'Phone or email',
  moving: 'Moving in or out',
  date: 'Date',
  forWhom: 'For',
  offer: 'What would you like to give?',
  note: 'Note',
};

/** Question title → request sheet column, with the longest answer kept. */
var REQ_MAP = [
  ['Name', 'Name', 80],
  ['Phone or email', 'Phone or email', 100],
  ['Moving in or out', 'Moving', 20],
  ['Date', 'Moving date', 10],
  ['For', 'For', 20],
  ['What would you like to give?', 'Offer', 300],
  ['Note', 'Note', 200],
];

/**
 * The meals form (2.6, decision 28): one form, two doors. The first question picks the path
 * (Google Forms section branching): the baby section or the hardship section, then the shared
 * section. Both paths ask "Who should the sisters coordinate with?" under the same title (and the
 * Other contact's name and phone), so each answer lands in one sheet column.
 */
var MEAL_FOR = ['A new baby', 'A member in hardship'];
var MEAL_DROPOFF = ['Regular drop-off (knock or doorbell)', 'Quiet drop-off (text on arrival)'];
var MEAL_OFTEN = ['Daily', 'Every other day', 'Specific dates'];
var MEAL_COORD_BABY = ['Mom', 'Dad', 'Other'];
var MEAL_COORD_HARDSHIP = ['Me', 'The second adult', 'Other'];
var MEAL_Q = {
  forWhat: 'What are the meals for?',
  momName: "Mom's name",
  momPhone: "Mom's phone",
  momEmail: "Mom's email",
  dadName: "Dad's name",
  dadPhone: "Dad's phone",
  dadEmail: "Dad's email",
  due: 'Due date',
  induction: 'Induction date (if planned)',
  gender: 'Boy, girl or surprise?',
  yourName: 'Your name',
  yourPhone: 'Your phone',
  yourEmail: 'Your email',
  secondName: "Second adult's name",
  secondPhone: "Second adult's phone",
  secondEmail: "Second adult's email",
  coordinate: 'Who should the sisters coordinate with?',
  otherName: 'Other contact: name',
  otherPhone: 'Other contact: phone',
  address: 'Address',
  start: 'When should meals start?',
  often: 'How often?',
  dates: 'Which dates? (only for specific dates)',
  window: 'Best drop-off time window',
  dropoff: 'Drop-off',
  adults: 'How many adults should the meals feed?',
  kids: 'How many kids?',
  allergies: 'Allergies, restrictions or dislikes',
  likes: 'Favorite foods or cuisines',
};
var MEAL_TEXT = {
  opening:
    'Congratulations on your new baby! Or, if times are hard right now, we are so sorry, and glad to help. The Relief Society service committee would love to bring your family some meals. Meals for a new baby usually start at least 3 days after baby arrives. Best guesses are fine: we will check in with you before anything is scheduled.',
  babySection: 'About the baby and parents',
  babyHelp: 'Congratulations! Best guesses are fine.',
  hardshipSection: 'About you',
  hardshipHelp: 'We are sorry things are hard. Thank you for letting us help.',
  sharedSection: 'The meals',
  sharedHelp: 'This helps the sisters who sign up bring the right meal at the right time.',
  confirmation:
    'Thank you. A meal coordinator will contact you soon.\n\nNew baby? After baby comes, we\'ll check back with you: if you\'re comfortable, we\'d love to share a photo, name, gender and birth date with the Relief Society presidency.',
};

/** Question title → request sheet column (meals), with the longest answer kept. */
var MEAL_MAP = [
  [MEAL_Q.forWhat, 'Meals for', 40],
  [MEAL_Q.momName, "Mom's name", 80],
  [MEAL_Q.momPhone, "Mom's phone", 40],
  [MEAL_Q.momEmail, "Mom's email", 100],
  [MEAL_Q.dadName, "Dad's name", 80],
  [MEAL_Q.dadPhone, "Dad's phone", 40],
  [MEAL_Q.dadEmail, "Dad's email", 100],
  [MEAL_Q.due, 'Due date', 10],
  [MEAL_Q.induction, 'Induction date', 10],
  [MEAL_Q.gender, 'Boy, girl or surprise', 20],
  [MEAL_Q.yourName, 'Adult name', 80],
  [MEAL_Q.yourPhone, 'Adult phone', 40],
  [MEAL_Q.yourEmail, 'Adult email', 100],
  [MEAL_Q.secondName, 'Second adult name', 80],
  [MEAL_Q.secondPhone, 'Second adult phone', 40],
  [MEAL_Q.secondEmail, 'Second adult email', 100],
  [MEAL_Q.coordinate, 'Coordinate with', 60],
  [MEAL_Q.otherName, 'Other contact name', 80],
  [MEAL_Q.otherPhone, 'Other contact phone', 40],
  [MEAL_Q.address, 'Address', 200],
  [MEAL_Q.start, 'Meals start', 100],
  [MEAL_Q.often, 'How often', 40],
  [MEAL_Q.dates, 'Specific dates', 200],
  [MEAL_Q.window, 'Drop-off window', 60],
  [MEAL_Q.dropoff, 'Drop-off', 60],
  [MEAL_Q.adults, 'Adults', 10],
  [MEAL_Q.kids, 'Kids', 10],
  [MEAL_Q.allergies, 'Allergies', 300],
  [MEAL_Q.likes, 'Favorite foods', 300],
];

/** The giving offer form's own words (decision 16). */
var GIVING_TEXT = {
  intro:
    'Thank you for offering to help with Christmas gifts. Only the bishopric and the Christmas gift coordinators see this. A coordinator will contact you. Nothing is emailed back to you.',
  confirmation: 'Thank you. A coordinator will contact you.',
  offerLabel: 'Offer to give at Christmas',
  offerHelp: 'Up to 300 characters. For example: how many families or children you can help, and the kinds of gifts.',
};

function portalFolder_() {
  var id = props_().getProperty('PORTAL_FOLDER_ID');
  if (!id) throw new Error('Service Portal folder not found. Run Service Portal > Set up.');
  return DriveApp.getFolderById(id);
}

function joinNames_(list) {
  if (list.length <= 1) return list.join('');
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

function requestFormDescription_(s, c) {
  var opening = c.Id === MEAL_REQUEST_ID ? [MEAL_TEXT.opening, ''] : [];
  if (c.Id === GIVING_ID) {
    return [GIVING_TEXT.intro, '', FORM_FOOTER + (s.contact_email ? '\nContact: ' + s.contact_email : '')].join('\n');
  }
  var who = isTicked(c.Confidential)
    ? 'Only ' + (CONFIDENTIAL_WHO[c.Id] || CONFIDENTIAL_WHO_DEFAULT) + ' see this request.'
    : splitList(c['Owning organizations']).length
    ? 'Only the bishopric, the ' + joinNames_(splitList(c['Owning organizations'])) + ' leaders and the people they name see this request.'
    : 'Only the bishopric and the people it names see this request.';
  return opening
    .concat([who, 'Nothing is emailed back to you; a leader will contact you.', '', FORM_FOOTER + (s.contact_email ? '\nContact: ' + s.contact_email : '')])
    .join('\n');
}

function shortText_(n) {
  return FormApp.createTextValidation().setHelpText('Up to ' + n + ' characters.').requireTextLengthLessThanOrEqualTo(n).build();
}

/**
 * The meals form's questions (spec section 2): the first question branches to the baby section or
 * the hardship section; both continue to the shared section (the baby section skips the hardship
 * one through the hardship page break's goToPage).
 */
function addMealQuestions_(form) {
  var text = function (title, n, required, help) {
    var it = form.addTextItem().setTitle(title).setRequired(!!required).setValidation(shortText_(n));
    if (help) it.setHelpText(help);
    return it;
  };
  var email = function (title, required) {
    return form
      .addTextItem()
      .setTitle(title)
      .setRequired(!!required)
      .setValidation(FormApp.createTextValidation().setHelpText('An email address.').requireTextIsEmail().build());
  };
  var coordinate = function (choices) {
    form.addCheckboxItem().setTitle(MEAL_Q.coordinate).setChoiceValues(choices).setRequired(false).setHelpText('The sisters bringing meals will reach out to the people you tick.');
    text(MEAL_Q.otherName, 80, false, 'Only if you ticked Other.');
    text(MEAL_Q.otherPhone, 40, false, 'Only if you ticked Other.');
  };
  var first = form.addMultipleChoiceItem().setTitle(MEAL_Q.forWhat).setRequired(true);

  var baby = form.addPageBreakItem().setTitle(MEAL_TEXT.babySection).setHelpText(MEAL_TEXT.babyHelp);
  text(MEAL_Q.momName, 80, true);
  text(MEAL_Q.momPhone, 40, true);
  email(MEAL_Q.momEmail, false);
  text(MEAL_Q.dadName, 80, false);
  text(MEAL_Q.dadPhone, 40, false);
  email(MEAL_Q.dadEmail, false);
  form.addDateItem().setTitle(MEAL_Q.due).setRequired(true).setHelpText('Your best guess is fine.');
  form.addDateItem().setTitle(MEAL_Q.induction).setRequired(false);
  form.addMultipleChoiceItem().setTitle(MEAL_Q.gender).setChoiceValues(['Boy', 'Girl', 'Surprise']).setRequired(false);
  coordinate(MEAL_COORD_BABY);

  var hardship = form.addPageBreakItem().setTitle(MEAL_TEXT.hardshipSection).setHelpText(MEAL_TEXT.hardshipHelp);
  text(MEAL_Q.yourName, 80, true);
  text(MEAL_Q.yourPhone, 40, true);
  email(MEAL_Q.yourEmail, false);
  text(MEAL_Q.secondName, 80, false, 'Optional: another adult in your home the sisters may contact.');
  text(MEAL_Q.secondPhone, 40, false);
  email(MEAL_Q.secondEmail, false);
  coordinate(MEAL_COORD_HARDSHIP);

  var shared = form.addPageBreakItem().setTitle(MEAL_TEXT.sharedSection).setHelpText(MEAL_TEXT.sharedHelp);
  // After the baby section, skip the hardship section.
  hardship.setGoToPage(shared);
  form
    .addParagraphTextItem()
    .setTitle(MEAL_Q.address)
    .setRequired(true)
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(200).build());
  text(MEAL_Q.start, 100, false, 'For example: 3 days after baby comes.');
  form.addMultipleChoiceItem().setTitle(MEAL_Q.often).setChoiceValues(MEAL_OFTEN).setRequired(true);
  text(MEAL_Q.dates, 200, false);
  text(MEAL_Q.window, 60, false, 'For example: 5:30–6:30 pm.');
  form.addMultipleChoiceItem().setTitle(MEAL_Q.dropoff).setChoiceValues(MEAL_DROPOFF).setRequired(true);
  text(MEAL_Q.adults, 10, false, 'Including any extra help staying with you.');
  text(MEAL_Q.kids, 10, false);
  form
    .addParagraphTextItem()
    .setTitle(MEAL_Q.allergies)
    .setRequired(false)
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(300).build());
  form
    .addParagraphTextItem()
    .setTitle(MEAL_Q.likes)
    .setRequired(false)
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(300).build());
  form
    .addParagraphTextItem()
    .setTitle(REQ_Q.note)
    .setRequired(false)
    .setHelpText('Optional, up to 200 characters.')
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(200).build());
  // The first question's choices jump to their section (set once the page breaks exist).
  first.setChoices([first.createChoice(MEAL_FOR[0], baby), first.createChoice(MEAL_FOR[1], hardship)]);
}

/**
 * The two prefilled links for the meals form's Help tiles: {baby, hardship}, each the form with
 * the first question already answered. Falls back to the plain link when the form has no such
 * question (an older form) or the prefill fails.
 */
function mealPrefilledUrls_(form) {
  var plain = form.getPublishedUrl();
  try {
    var item = null;
    form.getItems().forEach(function (it) {
      if (!item && it.getTitle() === MEAL_Q.forWhat) item = it;
    });
    if (!item) return { baby: plain, hardship: plain };
    var mc = item.asMultipleChoiceItem();
    return {
      baby: form.createResponse().withItemResponse(mc.createResponse(MEAL_FOR[0])).toPrefilledUrl(),
      hardship: form.createResponse().withItemResponse(mc.createResponse(MEAL_FOR[1])).toPrefilledUrl(),
    };
  } catch (e) {
    log_('meals prefill failed', clip(e && e.message ? e.message : e, 200));
    return { baby: plain, hardship: plain };
  }
}

function addRequestQuestions_(form, c) {
  if (c.Id === MEAL_REQUEST_ID) return addMealQuestions_(form);
  var short = shortText_;
  form.addTextItem().setTitle(REQ_Q.name).setRequired(true).setValidation(short(80));
  form.addTextItem().setTitle(REQ_Q.contact).setRequired(true).setValidation(short(100));
  if (c.Id === 'moving') {
    form.addMultipleChoiceItem().setTitle(REQ_Q.moving).setChoiceValues(['Moving in', 'Moving out']).setRequired(true);
    form.addDateItem().setTitle(REQ_Q.date).setRequired(false);
  }
  if (c.Id === 'christmas') {
    form.addMultipleChoiceItem().setTitle(REQ_Q.forWhom).setChoiceValues(['My family', 'Another family']).setRequired(true);
  }
  if (c.Id === GIVING_ID) {
    form
      .addParagraphTextItem()
      .setTitle(REQ_Q.offer)
      .setRequired(true)
      .setHelpText(GIVING_TEXT.offerHelp)
      .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(300).build());
  }
  form
    .addParagraphTextItem()
    .setTitle(REQ_Q.note)
    .setRequired(false)
    .setHelpText(
      c.Id === GIVING_ID
        ? 'Optional, up to 200 characters, e.g. when you can deliver.'
        : 'Optional, up to 200 characters. Please leave out health or money details; a leader will ask what they need.'
    )
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(200).build());
}

function requestFormConfirmation_(c) {
  if (c.Id === MEAL_REQUEST_ID) return MEAL_TEXT.confirmation;
  return c.Id === GIVING_ID ? GIVING_TEXT.confirmation : 'Thank you. A leader will contact you.';
}

/**
 * The request tab of a request sheet, with any header this version needs added at the end (a
 * sheet made before a header existed, e.g. Offer, keeps working).
 */
function requestTable_(ss, row, categoryId) {
  var t = tabOf_(ss, REQUEST_TAB);
  var missing = Object.keys(row || {}).filter(function (k) {
    return t.headers.indexOf(k) < 0;
  });
  if (!missing.length) return t;
  ensureTab_(ss, REQUEST_TAB, uniq_(t.headers.filter(String).concat(requestHeadersFor_(categoryId)).concat(Object.keys(row))));
  return tabOf_(ss, REQUEST_TAB);
}

/** The request sheet's headers for a kind: the standard ones, then the meals ones (2.6). */
function requestHeadersFor_(categoryId) {
  return categoryId === MEAL_REQUEST_ID ? REQUEST_HEADERS.concat(MEAL_REQUEST_HEADERS) : REQUEST_HEADERS;
}

/** Adds any request-sheet column this version needs (e.g. Make opportunity) to an older sheet. */
function ensureRequestColumns_(ss, categoryId) {
  var t = tabOf_(ss, REQUEST_TAB);
  var want = requestHeadersFor_(categoryId);
  var missing = want.filter(function (h) {
    return t.headers.indexOf(h) < 0;
  });
  if (missing.length) ensureTab_(ss, REQUEST_TAB, uniq_(t.headers.filter(String).concat(want)));
  else writeHeaderNotes_(ss.getSheetByName(REQUEST_TAB), REQUEST_TAB, t.headers); // 2.5.3: Set up refreshes the notes
}

// ---------- turning a request into a draft opportunity (2.2, decision 19) ----------

/**
 * The request kind's Opportunity category row, when it names a live Opportunity category. The
 * meals kind (2.6) names two, [new baby, hardship], and the row's Meals for answer picks one.
 */
function draftCategoryFor_(kind, catsById, r) {
  var ids = splitList(kind['Opportunity category']);
  var hardship = kind.Id === MEAL_REQUEST_ID && String((r && r['Meals for']) || '').trim() === MEAL_FOR[1];
  var id = hardship && ids.length > 1 ? ids[1] : ids[0] || '';
  var oc = id ? catsById[id] : null;
  if (!oc || oc.Kind !== CATEGORY_KIND.opportunity || isTicked(oc.Archived)) return null;
  return oc;
}

/**
 * The Posts and Slots rows for a draft made from request row r of request kind `kind` into
 * opportunity category oc. Public fields come only from the category: nothing from the request
 * but (when Copy contact is ticked) its name and contact in Private details, and its Moving date.
 */
function draftFromRequest_(s, kind, oc, r, todayLocal, nowLocal) {
  var org = splitList(oc['Owning organizations'])[0] || splitList(kind['Owning organizations'])[0] || 'Bishopric';
  var audiences = audiencesOf_(oc['Default audiences']);
  if (!audiences.length) audiences = org === 'Relief Society' ? ['Sisters'] : org === 'Elders Quorum' ? ['Brothers'] : AUDIENCES.slice();
  var date = isDateStr(r['Moving date']) && r['Moving date'] >= todayLocal ? r['Moving date'] : addDays(todayLocal, 7);
  var privateDetails = isTicked(r['Copy contact to private details'])
    ? 'Requested by ' + String(r.Name == null ? '' : r.Name).trim() + ', ' + String(r['Phone or email'] == null ? '' : r['Phone or email']).trim()
    : '';
  var postId = newId_('p');
  return {
    post: {
      'Post id': postId,
      'Public id': newId_(''),
      Organization: org,
      Category: String(oc.Id),
      Title: oc.Name,
      Audiences: audiences.join(', '),
      'Public note': '',
      'Private details': privateDetails,
      'Cancel cutoff hours': s.default_cancel_cutoff_hours,
      Status: POST_STATUS.draft,
      'Created by': 'request ' + r['Request id'],
      'Created at': nowLocal,
      'Last changed by': 'From a request',
      'Last changed at': nowLocal,
    },
    slot: { 'Slot id': newId_('t'), 'Post id': postId, Date: date, Start: '', End: '', Role: 'Help', Needed: 1, 'Role note': '', 'Bringing prompt': '', Filled: 0, Waiting: 0 },
  };
}

/** The first word of a name ('' when blank). */
function firstWord_(name) {
  return String(name == null ? '' : name).trim().split(/\s+/)[0] || '';
}

/**
 * "the Sample" when every named person shares a last name, else their first names joined with
 * "and"; '' when nobody is named. A one-word name has no last name.
 */
function familyName_(names) {
  var list = names
    .map(function (n) {
      return String(n == null ? '' : n).trim();
    })
    .filter(String);
  if (!list.length) return '';
  var lasts = list.map(function (n) {
    var w = n.split(/\s+/);
    return w.length > 1 ? w[w.length - 1] : '';
  });
  var same = lasts.every(function (l) {
    return l && l.toLowerCase() === lasts[0].toLowerCase();
  });
  return same ? lasts[0] : joinNames_(list.map(firstWord_));
}

/**
 * A meals draft (2.6, decision 28; changes decision 19 for meals only, by Sam's choice: "Go ahead
 * and include their names"). Public: the title "Meals for the <family> family", allergies, food
 * likes, how many it feeds, the drop-off window and kind, and the first names to coordinate
 * with. Private: the address, the phones of the people ticked to coordinate with, the Other
 * contact and the schedule asked for. Family emails: the addresses of the people ticked (or all
 * given, when nobody is ticked). No dates (the coordinator adds them once baby is here) and
 * Show on Serve = No (ministering sisters first). Never anything about ministering assignments.
 */
function mealDraftFromRequest_(s, kind, oc, r, nowLocal) {
  var v = function (k) {
    return String(r[k] == null ? '' : r[k]).trim();
  };
  var baby = v('Meals for') !== MEAL_FOR[1];
  var people = baby
    ? [
        { tick: MEAL_COORD_BABY[0], name: v("Mom's name"), phone: v("Mom's phone"), email: v("Mom's email") },
        { tick: MEAL_COORD_BABY[1], name: v("Dad's name"), phone: v("Dad's phone"), email: v("Dad's email") },
      ]
    : [
        { tick: MEAL_COORD_HARDSHIP[0], name: v('Adult name'), phone: v('Adult phone'), email: v('Adult email') },
        { tick: MEAL_COORD_HARDSHIP[1], name: v('Second adult name'), phone: v('Second adult phone'), email: v('Second adult email') },
      ];
  var ticks = splitList(v('Coordinate with'));
  var ticked = people.filter(function (p) {
    return ticks.indexOf(p.tick) >= 0;
  });
  var reach = ticked.length ? ticked : people;
  var family = familyName_(
    people.map(function (p) {
      return p.name;
    })
  );
  var serves = [];
  var adults = v('Adults');
  var kids = v('Kids');
  if (adults) serves.push(adults + (adults === '1' ? ' adult' : ' adults'));
  if (kids) serves.push(kids + (kids === '1' ? ' kid' : ' kids'));
  var dropoff = /^quiet/i.test(v('Drop-off')) ? 'Quiet' : /^regular/i.test(v('Drop-off')) ? 'Regular' : '';
  var lines = [];
  if (v('Address')) lines.push('Address: ' + v('Address'));
  reach.forEach(function (p) {
    if (p.phone) lines.push((firstWord_(p.name) || p.tick) + ': ' + p.phone);
  });
  if (ticks.indexOf('Other') >= 0 && (v('Other contact name') || v('Other contact phone'))) {
    lines.push('Other contact: ' + [v('Other contact name'), v('Other contact phone')].filter(String).join(', '));
  }
  var schedule = [v('Meals start') ? 'start ' + v('Meals start') : '', v('How often') + (v('Specific dates') ? ': ' + v('Specific dates') : '')].filter(String);
  if (schedule.length) lines.push('Asked for: ' + schedule.join('; '));
  var postId = newId_('p');
  return {
    post: {
      'Post id': postId,
      'Public id': newId_(''),
      Organization: splitList(oc['Owning organizations'])[0] || splitList(kind['Owning organizations'])[0] || 'Relief Society',
      Category: String(oc.Id),
      Title: clip(family ? 'Meals for the ' + family + ' family' : 'Meals for a family', 100),
      Audiences: (audiencesOf_(oc['Default audiences']).length ? audiencesOf_(oc['Default audiences']) : ['Sisters']).join(', '),
      'Public note': '',
      'Private details': clip(lines.join('\n'), 1000),
      'Cancel cutoff hours': s.default_cancel_cutoff_hours,
      Status: POST_STATUS.draft,
      'Created by': 'request ' + r['Request id'],
      'Created at': nowLocal,
      'Last changed by': 'From a request',
      'Last changed at': nowLocal,
      'Show on Serve': 'No',
      Allergies: clip(v('Allergies'), 300),
      'Food likes': clip(v('Favorite foods'), 300),
      Serves: clip(serves.join(', '), 60),
      'Drop-off window': clip(v('Drop-off window'), 60),
      'Drop-off': dropoff,
      'Coordinate with': clip(
        joinNames_(
          ticked
            .map(function (p) {
              return firstWord_(p.name);
            })
            .filter(String)
        ),
        100
      ),
      'Family emails': uniq_(
        reach
          .map(function (p) {
            return p.email;
          })
          .filter(isEmail)
          .map(normEmail)
      ).join(', '),
      Progress: '',
    },
    slot: null,
  };
}

/**
 * Hourly job part: every request row with Make opportunity ticked and Posted as blank (or "Not
 * made: ...") becomes a Draft opportunity (never Open). Each request sheet is read without the
 * lock; only a sheet with a ticked row takes the script lock and is read again before anything is
 * written. Posted as is written and the box unticked, so a row is made once: a draft already made
 * for that request id (this run's included) is found by its Created by instead of made again, and
 * a row typed by hand without a Request id first gets one. A sheet without the 2.2 columns has
 * nothing ticked (Set up adds them). Notices go out after the lock, only to people who can edit
 * the draft, and say nothing about the request. A file that fails is reported at the end; the
 * others still run.
 */
function makeDraftsFromRequests_() {
  var s = settings_();
  var today = todayLocal_();
  var categories = serviceTab_(TAB.categories).rows();
  var catsById = indexBy_(categories, 'Id');
  var made = [];
  var errors = [];
  var isMarked = function (r) {
    return isTicked(r['Make opportunity']);
  };
  systemTab_(SYS_TAB.requestFiles)
    .rows()
    .forEach(function (f) {
      var kind = catsById[f['Category id']];
      if (!f['Sheet id'] || !kind) return;
      try {
        var ss = SpreadsheetApp.openById(f['Sheet id']);
        var peek = tabOf_(ss, REQUEST_TAB);
        if (peek.headers.indexOf('Make opportunity') < 0 || !peek.rows().some(isMarked)) return;
        withLock_(function () {
          var t = tabOf_(ss, REQUEST_TAB);
          var ticked = t.rows().filter(isMarked);
          if (!ticked.length) return;
          var now = nowLocal_();
          var postsT = serviceTab_(TAB.posts);
          var byCreator = indexBy_(postsT.rows(), 'Created by');
          ticked.forEach(function (r) {
            // Already made: just untick. A "Not made: ..." row may be ticked again once fixed.
            var postedAs = String(r['Posted as'] == null ? '' : r['Posted as']).trim();
            if (postedAs && postedAs.indexOf('Not made') !== 0) {
              t.update(r, { 'Make opportunity': false });
              return;
            }
            var oc = draftCategoryFor_(kind, catsById, r);
            if (!oc) {
              var set = String(kind['Opportunity category'] == null ? '' : kind['Opportunity category']).trim();
              t.update(r, {
                'Posted as':
                  'Not made: set Opportunity category for ' + kind.Name + ' to the Id of an Opportunity row in Categories (now: ' + (set || 'blank') + ')',
                'Make opportunity': false,
              });
              return;
            }
            // A row typed by hand may have no Request id: give it one, so it never matches another.
            if (!String(r['Request id'] == null ? '' : r['Request id']).trim()) t.update(r, { 'Request id': newId_('r') });
            var key = 'request ' + String(r['Request id']).trim();
            var post = byCreator[key];
            if (!post) {
              var d = kind.Id === MEAL_REQUEST_ID ? mealDraftFromRequest_(s, kind, oc, r, now) : draftFromRequest_(s, kind, oc, r, today, now);
              postsT.append(d.post);
              if (d.slot) serviceTab_(TAB.slots).append(d.slot);
              post = d.post;
              byCreator[key] = post;
              made.push({ kind: kind, post: post });
            }
            t.update(r, {
              'Posted as': 'Draft made ' + today + ' — finish and publish it on the leader page (' + post.Title + ', ' + post['Post id'] + ')',
              'Make opportunity': false,
            });
          });
        });
      } catch (err) {
        var msg = clip(err && err.message ? err.message : err, 200);
        log_('draft from request error', f['Category id'] + ' | ' + msg);
        errors.push(f['Category id'] + ': ' + msg);
      }
    });
  if (made.length) {
    var leaders = leaders_();
    made.forEach(function (m) {
      draftNoticeRecipients_(m.kind, m.post, leaders, s.organizations, categories).forEach(function (to) {
        var t = tplDraftFromRequest_(s, m.kind.Name);
        sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
      });
    });
  }
  if (errors.length) throw new Error(errors.join(' ; '));
  return made.length;
}

/** The request kind's Notify people who can edit the draft, else the post's notice recipients. */
function draftNoticeRecipients_(kind, post, leaders, organizations, categories) {
  var byEmail = {};
  leaders.forEach(function (l) {
    if (isEmail(l.Email)) byEmail[normEmail(l.Email)] = l;
  });
  var to = requestNotifyList(kind, leaders).to.filter(function (e) {
    var l = byEmail[e];
    return !!l && canEditPost(leaderAccess(l, organizations, categories), e, post);
  });
  return to.length ? to : noticeRecipients(post, leaders);
}

/**
 * Lines naming each request form that is not on the Help page, and always the Christmas giving
 * form, with its link and where it shows (decisions 16 and 17).
 */
function privateFormLines_() {
  var files = indexBy_(systemTab_(SYS_TAB.requestFiles).rows(), 'Category id');
  var out = [];
  serviceTab_(TAB.categories)
    .rows()
    .forEach(function (c) {
      if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived)) return;
      var giving = c.Id === GIVING_ID;
      if (!giving && isTicked(c['On Help page'])) return;
      var f = files[c.Id];
      if (!f || !f['Form id']) return;
      var where = !giving
        ? '(not on the Help page; share privately)'
        : isTicked(c['On Serve page'])
        ? '(on the Service Opportunities page; you can also share the link)'
        : '(not on any public page; share privately)';
      try {
        out.push(c.Name + ' ' + where + ': ' + FormApp.openById(f['Form id']).getPublishedUrl());
      } catch (e) {
        out.push(c.Name + ': could not open its form (' + clip(e && e.message ? e.message : e, 120) + ').');
      }
    });
  return out;
}

/** A new month sheet for a category in its folder. Returns the Spreadsheet. */
function newRequestSheet_(folder, categoryName, month, headers) {
  var ss = SpreadsheetApp.create('Requests – ' + categoryName + ' – ' + month);
  var first = ss.getSheets()[0];
  first.setName(REQUEST_TAB);
  var sh = ensureTab_(ss, REQUEST_TAB, headers || REQUEST_HEADERS);
  var t = table_(sh);
  var rowsBelow = sh.getMaxRows() - 1;
  if (rowsBelow > 0) {
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(REQUEST_STATUS, true).setAllowInvalid(false).build();
    sh.getRange(2, t.headers.indexOf('Status') + 1, rowsBelow, 1).setDataValidation(rule);
  }
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  return ss;
}

/**
 * The template form's file id from Settings form_template_url: {id}, {error} or null (blank).
 * Takes the editor link (…/forms/d/<id>/edit) or a bare id. A published …/forms/d/e/…/viewform
 * link is not the file id, so it is refused with what to paste instead.
 */
function formTemplateId_(url) {
  var u = String(url == null ? '' : url).trim();
  if (!u) return null;
  if (/\/forms\/d\/e\//.test(u) || /\/viewform\b/.test(u)) {
    return { error: "form_template_url: paste the form's edit link (from the form editor's address bar), not its viewform link." };
  }
  var m = /\/forms\/d\/([A-Za-z0-9_-]+)/.exec(u);
  if (m) return { id: m[1] };
  if (/^[A-Za-z0-9_-]+$/.test(u)) return { id: u };
  return { error: "form_template_url is not a Google Form edit link (it should look like https://docs.google.com/forms/d/…/edit)." };
}

/**
 * A new, empty request form. With form_template_url set it is a Drive copy of that branded form
 * (FormApp can't set a theme, but a copy keeps it) with every item removed; otherwise, or when the
 * template can't be copied, a plain FormApp form. Problems go into problems; Set up never stops.
 */
function newRequestForm_(s, c, portal, problems) {
  var title = requestFormTitle_(s, c);
  var tpl = formTemplateId_(s.form_template_url);
  if (tpl && tpl.error) {
    if (problems && problems.indexOf(tpl.error) < 0) problems.push(tpl.error);
  } else if (tpl) {
    var copy = null;
    try {
      copy = DriveApp.getFileById(tpl.id).makeCopy(title, portal);
      var form = FormApp.openById(copy.getId());
      form.getItems().forEach(function (item) {
        form.deleteItem(item);
      });
      // A template may carry its own response sheet, old answers or quiz mode: none of them.
      try {
        form.removeDestination();
      } catch (e1) {
        // it had no destination
      }
      try {
        form.deleteAllResponses();
      } catch (e2) {
        // it had no responses
      }
      try {
        form.setIsQuiz(false);
      } catch (e3) {
        // not a quiz
      }
      form.setTitle(title);
      return form;
    } catch (e) {
      // A copy that could not be opened or emptied is not left behind.
      if (copy) {
        try {
          copy.setTrashed(true);
        } catch (e4) {
          // nothing more to do
        }
      }
      var line = 'Could not copy the form template (' + clip(e && e.message ? e.message : e, 120) + '); made plain forms instead. Check form_template_url.';
      if (problems && problems.indexOf(line) < 0) problems.push(line);
    }
  }
  return FormApp.create(title);
}

function requestFormTitle_(s, c) {
  return c.Name + ' — ' + s.ward_name;
}

/**
 * A form made earlier gets the current title and description (so a ward that set up on older
 * wording gets the new one by running Set up again). Returns true when something changed.
 */
function refreshRequestForm_(s, c, formId) {
  var form = FormApp.openById(formId);
  var changed = false;
  var title = requestFormTitle_(s, c);
  if (form.getTitle() !== title) {
    form.setTitle(title);
    changed = true;
  }
  var description = requestFormDescription_(s, c);
  if (form.getDescription() !== description) {
    form.setDescription(description);
    changed = true;
  }
  return changed;
}

/**
 * One form, folder and month sheet per request category that has no form yet; forms already
 * made get their title and description refreshed. Re-runnable. Names of refreshed forms go into
 * refreshed and problems into problems (both optional).
 */
function buildRequestForms_(s, categories, refreshed, problems) {
  var portal = portalFolder_();
  var filesT = systemTab_(SYS_TAB.requestFiles);
  var have = indexBy_(filesT.rows(), 'Category id');
  var month = todayLocal_().slice(0, 7);
  var made = [];
  categories.forEach(function (c) {
    if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived) || !c.Id) return;
    var rec = have[c.Id];
    if (rec && rec['Form id']) {
      try {
        if (refreshRequestForm_(s, c, rec['Form id']) && refreshed) refreshed.push(c.Name);
      } catch (e) {
        if (problems) problems.push('Could not open the ' + c.Name + ' form to refresh its wording (' + clip(e && e.message ? e.message : e, 120) + ').');
      }
      try {
        if (rec['Sheet id']) ensureRequestColumns_(SpreadsheetApp.openById(rec['Sheet id']), c.Id);
      } catch (e) {
        if (problems) problems.push('Could not open the ' + c.Name + ' request sheet to add its new columns (' + clip(e && e.message ? e.message : e, 120) + ').');
      }
      return;
    }
    var folderName = 'Requests – ' + c.Name;
    var existing = portal.getFoldersByName(folderName);
    var folder = existing.hasNext() ? existing.next() : portal.createFolder(folderName);
    var ss = newRequestSheet_(folder, c.Name, month, requestHeadersFor_(c.Id));
    var form = newRequestForm_(s, c, portal, problems);
    form
      .setDescription(requestFormDescription_(s, c))
      .setCollectEmail(false)
      .setAllowResponseEdits(false)
      .setShowLinkToRespondAgain(false)
      .setPublishingSummary(false)
      .setConfirmationMessage(requestFormConfirmation_(c));
    addRequestQuestions_(form, c);
    // A copied template may have asked for sign-in or one response each: requests never do.
    try {
      form.setLimitOneResponsePerUser(false);
      form.setRequireLogin(false);
    } catch (e) {
      // setRequireLogin exists only for Workspace accounts
    }
    if (typeof form.setPublished === 'function') form.setPublished(true);
    form.setAcceptingResponses(true);
    DriveApp.getFileById(form.getId()).moveTo(portal);
    var row = { 'Category id': c.Id, 'Folder id': folder.getId(), 'Form id': form.getId(), 'Sheet id': ss.getId(), Month: month };
    if (rec) filesT.update(rec, row);
    else filesT.append(row);
    made.push(c.Name);
  });
  try {
    cache_().remove('help');
    cache_().remove(GIVING_URL_CACHE_KEY);
  } catch (e) {
    // the help cache expires on its own
  }
  return made;
}

/** Email every administrator once (high priority). */
function alertAdmins_(lines) {
  var s = settings_();
  var t = tplAdminAlert_(s, lines);
  var admins = adminEmails(leaders_(), s.admin_alerts_to);
  if (!admins.length) log_('admin alert with no administrators', lines.join(' / '));
  admins.forEach(function (to) {
    sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
  });
}

/**
 * Meals (2.6): every answer into its own column (MEAL_MAP), plus the standard Name and Phone or
 * email (the mother, or the person asking), so the sheet reads like the other request sheets.
 */
function mealRequestRow_(answers, row) {
  MEAL_MAP.forEach(function (m) {
    if (m[0] in answers) row[m[1]] = clip(String(answers[m[0]]).trim(), m[2]);
  });
  var baby = row['Meals for'] !== MEAL_FOR[1];
  var name = baby ? row["Mom's name"] || row["Dad's name"] : row['Adult name'];
  var phone = baby ? row["Mom's phone"] || row["Dad's phone"] : row['Adult phone'];
  if (name) row.Name = clip(name, 80);
  if (phone) row['Phone or email'] = clip(phone, 100);
  return row;
}

/** Removes every answer string from a message, so logs never carry request text. */
function scrub_(msg, answers) {
  var out = String(msg == null ? '' : msg);
  Object.keys(answers).forEach(function (k) {
    var v = String(answers[k] == null ? '' : answers[k]);
    if (v.length >= 2) out = out.split(v).join('…');
  });
  return clip(out, 300);
}

/** A real form-submit event carries functions; JSON from a web visitor can't. */
function isFormEvent_(e) {
  return !!(
    e &&
    e.source &&
    e.response &&
    typeof e.source.getId === 'function' &&
    typeof e.source.deleteResponse === 'function' &&
    typeof e.response.getItemResponses === 'function' &&
    typeof e.response.getId === 'function'
  );
}

/** What an administrator must do, by the step that failed. */
var REQ_STEP_HELP = {
  read: 'It is kept in the form’s Responses tab; copy it into the request sheet by hand, then delete it from the form.',
  file: 'It is kept in the form’s Responses tab; copy it into the request sheet by hand, then delete it from the form.',
  unform: 'It was filed in the request sheet but is still in the form’s Responses tab; delete it there.',
  notify: 'It was filed in the request sheet, but not every leader was told. Ask them to check their Requests folder.',
};

/** Form-submit trigger (one per request form). */
function gpOnRequestSubmit(e) {
  if (!isFormEvent_(e)) return;
  gpBegin_();
  var answers = {};
  var catId = '?';
  var catName = 'request';
  var step = 'read';
  try {
    e.response.getItemResponses().forEach(function (ir) {
      var v = ir.getResponse();
      answers[ir.getItem().getTitle()] = Array.isArray(v) ? v.join(', ') : String(v == null ? '' : v);
    });
    var formId = e.source.getId();
    step = 'file';
    // Under the lock, so the monthly rotation can't switch sheets between finding and appending.
    var filed = withLock_(function () {
      var file = systemTab_(SYS_TAB.requestFiles).find('Form id', formId);
      if (!file) throw new Error('no Request files row for this form');
      catId = file['Category id'];
      var cat = serviceTab_(TAB.categories).find('Id', catId);
      if (!cat) throw new Error('category missing from the Categories tab');
      catName = cat.Name;
      var row = { 'Request id': newId_(cat.Id === GIVING_ID ? 'o' : 'r'), Received: nowLocal_(), Kind: cat.Name, Status: 'New' };
      REQ_MAP.forEach(function (m) {
        if (m[0] in answers) row[m[1]] = clip(answers[m[0]].trim(), m[2]);
      });
      if (cat.Id === MEAL_REQUEST_ID) mealRequestRow_(answers, row);
      requestTable_(SpreadsheetApp.openById(file['Sheet id']), row, cat.Id).append(row);
      return { file: file, cat: cat };
    });
    step = 'unform';
    e.source.deleteResponse(e.response.getId());
    step = 'notify';
    var s = settings_();
    var t = tplRequestNotice_(s, filed.cat.Name, DriveApp.getFolderById(filed.file['Folder id']).getUrl());
    var notify = requestNotifyList(filed.cat, leaders_());
    if (notify.dropped.length) log_('request notice dropped', catId + ' | not readers of this kind or not addresses: ' + notify.dropped.join(', '));
    notify.to.forEach(function (to) {
      sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
    });
  } catch (err) {
    var msg = scrub_(err && err.message ? err.message : err, answers);
    log_('request error', catId + ' | ' + step + ' | ' + msg);
    alertCapped_('request-error', ['A ' + catName + ' request ran into a problem. ' + REQ_STEP_HELP[step], 'Problem: ' + msg], 3);
  }
}

/**
 * Daily: stamp Closed on, purge after 30 days, rotate on a new month. Each file is handled under
 * the script lock, so a request can't be filed into a sheet that is being replaced. Old files
 * that could only be trashed are reported in one admin alert. Returns problem lines (the daily
 * job reports them).
 */
function dailyRequests_() {
  var today = todayLocal_();
  var filesT = systemTab_(SYS_TAB.requestFiles);
  var cats = indexBy_(serviceTab_(TAB.categories).rows(), 'Id');
  var problems = [];
  var trashed = [];
  filesT.rows().forEach(function (f) {
    if (!f['Sheet id']) return;
    try {
      withLock_(function () {
        var ss = SpreadsheetApp.openById(f['Sheet id']);
        var t = tabOf_(ss, REQUEST_TAB);
        var rows = t.rows();
        stampClosed(rows, today).forEach(function (x) {
          t.update(x.row, { 'Closed on': x.closedOn });
        });
        t.removeMany(rowsToPurge(rows, today));
        if (needsRotation(f.Month, today)) rotateRequestFile_(f, filesT, t, cats[f['Category id']], today, trashed);
      });
    } catch (err) {
      var msg = clip(err && err.message ? err.message : err, 300);
      log_('request daily error', f['Category id'] + ' | ' + msg);
      problems.push('Requests (' + f['Category id'] + '): ' + msg);
    }
  });
  if (trashed.length) alertAdmins_(trashed);
  return problems;
}

function rotateRequestFile_(f, filesT, oldTable, cat, today, trashed) {
  var month = today.slice(0, 7);
  var name = cat ? cat.Name : f['Category id'];
  var headers = uniq_(oldTable.headers.filter(String).concat(requestHeadersFor_(f['Category id'])));
  var folder = DriveApp.getFolderById(f['Folder id']);
  var fresh = newRequestSheet_(folder, name, month, headers);
  var carry = oldTable.rows();
  table_(fresh.getSheetByName(REQUEST_TAB)).appendMany(carry);
  var oldId = f['Sheet id'];
  filesT.update(f, { 'Sheet id': fresh.getId(), Month: month });
  try {
    if (typeof Drive.Files.remove === 'function') Drive.Files.remove(oldId);
    else Drive.Files['delete'](oldId);
    log_('request file rotated', f['Category id'] + ' | ' + month + ' | carried ' + carry.length);
  } catch (err) {
    DriveApp.getFileById(oldId).setTrashed(true);
    var line = 'The old ' + name + ' request sheet could not be permanently deleted, so it was moved to the Trash. Empty it from Drive > Trash (it holds closed requests).';
    log_('request file delete failed', f['Category id'] + ' | ' + clip(err && err.message ? err.message : err, 200));
    trashed.push(line);
  }
}
