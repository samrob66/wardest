/**
 * Interview Router (WardForward template, Start here step 6)
 * ---------------------------------------------------------------------------
 * WHAT IT DOES. Members book interviews on the ward's Google Calendar booking
 * pages. Google always saves a booking to this account's OWN ("staging")
 * calendar. This script runs once a minute on the ward's role account. It
 * reads each new booking's title, finds the calling tag in it, MOVES the
 * booking onto that leader's own calendar, DECLINES this account's own place
 * on it (so it stops blocking the other leaders but stays cancelable from the
 * member's confirmation email), and tidies the title.
 *
 * WHAT TO REPLACE. Only the three PASTE_..._CALENDAR_ID_HERE values in ROUTES
 * below. Find each one in Google Calendar: the leader's calendar, then
 * "Settings and sharing", then "Integrate calendar", then Calendar ID. Keep the
 * quote marks. If your booking-page titles use the suggested tags ([Bishop],
 * [1st Counselor], [2nd Counselor]), leave the tags as they are.
 *
 * HOW TO INSTALL (signed in as the ward's role account):
 *   1. script.google.com, New project, paste this file, name it "Interview Router".
 *   2. Services (+), add "Google Calendar API".
 *   3. Replace the calendar IDs, Save, then run checkCalendarIds() and allow
 *      access. You want one OK line per leader.
 *   4. Triggers (clock icon), Add Trigger: routeAppointments, Time-driven,
 *      Minutes timer, Every minute.
 *
 * Functions in this file:
 *   routeAppointments()   - the every-minute worker (put the trigger on THIS)
 *   checkCalendarIds()    - run by hand: verifies every calendar ID in ROUTES
 *   cleanExistingGuests() - run by hand: declines this account on older bookings
 *   renameTypeLabel()     - run by hand: changes a type label on filed bookings
 *   prettyTitle(), isTransient(), listWithRetry() - helpers
 * ---------------------------------------------------------------------------
 */


// -- ROUTES ------------------------------------------------------------------
// One row per leader. `tag` is matched against each booking's TITLE (not the
// calendar's name), so every booking page for that leader must contain it,
// exactly, and no other page may. The tags are callings in square brackets, so
// nothing here changes when a leader is released. `initial` starts the tidied
// title, e.g. "(1) Jane Doe (Settings Apart)". `label` (optional) is a fixed
// type for pages whose title has nothing before the tag.
const ROUTES = [
  { tag: '[Bishop]',        initial: 'B', calendarId: 'PASTE_BISHOP_CALENDAR_ID_HERE' },
  { tag: '[1st Counselor]', initial: '1', calendarId: 'PASTE_1ST_COUNSELOR_CALENDAR_ID_HERE' },
  { tag: '[2nd Counselor]', initial: '2', calendarId: 'PASTE_2ND_COUNSELOR_CALENDAR_ID_HERE' },
  // Optional, if the Executive Secretary also takes bookings:
  // { tag: '[Exec Sec]',   initial: 'E', calendarId: 'PASTE_EXEC_SEC_CALENDAR_ID_HERE' },
];

const LOOKAHEAD_DAYS   = 120;   // how far ahead (days) to scan the staging calendar
const MAX_LIST_RETRIES = 3;     // retry a flaky Google read this many times per run

function isPlaceholder(calendarId) {
  return /^PASTE_/.test(calendarId);
}


// -- The every-minute worker --------------------------------------------------
// Put your time-based trigger on THIS function. It re-scans the staging
// calendar each run, so if one run is skipped (a Google hiccup), the next run
// catches whatever was missed. Nothing is lost.
function routeAppointments() {
  const now   = new Date();
  const until = new Date(now.getTime() + LOOKAHEAD_DAYS * 864e5);
  let pageToken = null;

  try {
    do {
      var resp = listWithRetry({
        timeMin: now.toISOString(), timeMax: until.toISOString(),
        singleEvents: true, showDeleted: false, maxResults: 250, pageToken: pageToken
      });

      (resp.items || []).forEach(function (ev) {
        if (ev.recurringEventId) return;     // recurring meetings are never bookings
        var title = ev.summary || '';
        var route = ROUTES.find(function (r) { return title.indexOf(r.tag) !== -1; });
        if (!route) return;                  // not one of our bookings: leave it
        if (isPlaceholder(route.calendarId)) {
          console.error('Calendar ID for ' + route.tag + ' is still a placeholder; not moving "' + title + '"');
          return;
        }

        // Already filed on an earlier run? Filing DECLINES this account's own
        // place, so a declined self-attendee means "done". Skip it.
        if ((ev.attendees || []).some(function (a) { return a.self && a.responseStatus === 'declined'; })) return;

        try {
          // 1) Move the booking onto the leader's own calendar.
          Calendar.Events.move('primary', ev.id, route.calendarId);

          var patch = {};

          // 2) DECLINE this account's own place. Google adds the account as a
          //    guest, which blocks the shared staging calendar for every leader.
          //    Declining frees it while the leader's copy stays booked, and,
          //    unlike REMOVING the guest, keeps the member's cancel link working.
          var atts = ev.attendees || [];
          var changed = false;
          atts.forEach(function (a) {
            if (a.self) { a.responseStatus = 'declined'; changed = true; }
          });
          if (changed) patch.attendees = atts;

          // 3) Tidy the title, e.g. "(1) Jane Doe (Settings Apart)".
          var nice = prettyTitle(title, route);
          if (nice && nice !== title) patch.summary = nice;

          // Steps 2 and 3 in one patch (sends no email to the member).
          if (Object.keys(patch).length) {
            Calendar.Events.patch(patch, route.calendarId, ev.id, { sendUpdates: 'none' });
          }

          console.log('Moved "' + title + '"');
        } catch (err) {
          // A problem with THIS booking: log it and carry on with the next.
          console.error('Could not process "' + title + '": ' + err);
        }
      });

      pageToken = resp.nextPageToken;
    } while (pageToken);
  } catch (err) {
    // The scan itself failed. A Google hiccup is skipped (the next run retries);
    // a real error is re-thrown so you still get a failure email.
    if (isTransient(err)) {
      console.warn('Transient Google error this run; the next run will retry: ' + err);
      return;
    }
    throw err;
  }
}


// -- Helper: tidy a booking title ----------------------------------------------
// "Settings Apart [1st Counselor] (Jane Doe)"     ->  "(1) Jane Doe (Settings Apart)"
// "Interview 15 min [Bishop] (John Roe)"           ->  "(B) John Roe (Interview 15 min)"
// "Tithing Declaration [Bishop] (Sam Poe)"         ->  "(B) Sam Poe (Tithing Declaration)"
// The member's name is the last (parentheses). The tag never stays in the
// tidied title; otherwise the next run would match it again.
function prettyTitle(original, route) {
  var m = original.match(/\(([^)]+)\)\s*$/);
  if (!m) return original;                            // no name found: leave it
  var member = m[1].trim();
  var iParen = original.indexOf(' (');
  var base = (iParen >= 0 ? original.substring(0, iParen) : original).trim();
  var t = base.indexOf(route.tag);
  var type = t > 0 ? base.substring(0, t).replace(/[-\s]+$/, '').trim() : '';
  if (!type) type = route.label || '';
  return type
    ? '(' + route.initial + ') ' + member + ' (' + type + ')'
    : '(' + route.initial + ') ' + member;
}


// -- Helper: is this just a temporary Google-side error? -----------------------
function isTransient(err) {
  var m = String((err && err.message) || err);
  return /server error|try again|DEADLINE_EXCEEDED|internal error|backend|temporar|reading from storage|rate limit|user rate|quota exceeded/i.test(m);
}


// -- Helper: read the staging calendar, retrying brief hiccups -----------------
function listWithRetry(params) {
  var lastErr;
  for (var i = 0; i < MAX_LIST_RETRIES; i++) {
    try {
      return Calendar.Events.list('primary', params);
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;   // a real error: surface it now
      Utilities.sleep(1500 * (i + 1));    // back off, then try again
    }
  }
  throw lastErr;
}


// -- Run by hand: verify your calendar IDs -------------------------------------
// Choose it in the function list and click Run. You want one OK line per
// leader, naming the right calendar. A BAD line is an ID to fix in ROUTES.
function checkCalendarIds() {
  ROUTES.forEach(function (r) {
    if (isPlaceholder(r.calendarId)) {
      console.error('BAD  ' + r.tag + '  ->  still a placeholder: paste this leader\'s Calendar ID');
      return;
    }
    try {
      var cal = Calendar.Calendars.get(r.calendarId);
      console.log('OK   ' + r.tag + '  ->  ' + cal.summary);
    } catch (e) {
      console.error('BAD  ' + r.tag + '  ->  ' + r.calendarId + '   ' + e);
    }
  });
}


// -- Run by hand: decline this account on older bookings ------------------------
// For bookings filed before the router was installed. Safe to run again; skips
// anything already declined and sends no emails.
function cleanExistingGuests() {
  const now   = new Date();
  const until = new Date(now.getTime() + LOOKAHEAD_DAYS * 864e5);
  ROUTES.forEach(function (route) {
    if (isPlaceholder(route.calendarId)) return;
    let pageToken = null;
    do {
      const resp = Calendar.Events.list(route.calendarId, {
        timeMin: now.toISOString(), timeMax: until.toISOString(),
        singleEvents: true, showDeleted: false, maxResults: 250, pageToken: pageToken
      });
      (resp.items || []).forEach(function (ev) {
        var atts = ev.attendees || [];
        var changed = false;
        atts.forEach(function (a) {
          if (a.self && a.responseStatus !== 'declined') {
            a.responseStatus = 'declined';
            changed = true;
          }
        });
        if (changed) {
          try {
            Calendar.Events.patch({ attendees: atts }, route.calendarId, ev.id, { sendUpdates: 'none' });
            console.log('Declined on "' + (ev.summary || '') + '"');
          } catch (err) {
            console.error('Could not update "' + (ev.summary || '') + '": ' + err);
          }
        }
      });
      pageToken = resp.nextPageToken;
    } while (pageToken);
  });
}


// -- Run by hand: change a type label on bookings already filed -----------------
// When you rename a booking page, NEW bookings get the new name, but bookings
// already on a leader's calendar keep the old label. Set OLD and NEW, run once
// with DRY_RUN = true and read the log, then set DRY_RUN = false and run again.
function renameTypeLabel() {
  var OLD = '(Old Label)';          // exact text to replace, including the parentheses
  var NEW = '(New Label)';          // what to replace it with
  var DRY_RUN = true;               // true = only log what WOULD change

  var cals = [];
  ROUTES.forEach(function (r) {
    if (!isPlaceholder(r.calendarId) && cals.indexOf(r.calendarId) === -1) cals.push(r.calendarId);
  });
  var from = new Date(Date.now() - 180 * 864e5);
  var to   = new Date(Date.now() + 180 * 864e5);
  var count = 0;
  cals.forEach(function (calId) {
    var pageToken = null;
    do {
      var resp = Calendar.Events.list(calId, {
        timeMin: from.toISOString(), timeMax: to.toISOString(),
        singleEvents: true, showDeleted: false, maxResults: 250, pageToken: pageToken
      });
      (resp.items || []).forEach(function (ev) {
        var title = ev.summary || '';
        if (title.indexOf(OLD) === -1) return;
        var fixed = title.split(OLD).join(NEW);
        count++;
        if (DRY_RUN) { console.log('WOULD rename: "' + title + '"  ->  "' + fixed + '"'); return; }
        try {
          Calendar.Events.patch({ summary: fixed }, calId, ev.id, { sendUpdates: 'none' });
          console.log('Renamed: "' + title + '"  ->  "' + fixed + '"');
        } catch (err) {
          console.error('Could not rename "' + title + '": ' + err);
        }
      });
      pageToken = resp.nextPageToken;
    } while (pageToken);
  });
  console.log((DRY_RUN ? 'DRY RUN: ' : '') + count + ' title(s) ' + (DRY_RUN ? 'would be ' : '') + 'renamed.');
}
