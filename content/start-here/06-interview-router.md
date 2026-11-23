---
id: sol_es_interview_router
step: 6
title: Install the interview router
summary: Install the small script that moves each new booking onto the right leader's calendar every minute.
category: exec_secretary
template_type: file
template_value: /templates/interview-router.gs
---
## What this gives the ward

Each new booking moves from the account's staging calendar onto its leader's calendar within a minute, and its title is tidied to something like "(1) Jane Doe (Settings Apart)". Each leader's open times stay independent, and a member can still cancel from their confirmation email.

## How it works

The interview router is a short Google Apps Script that runs on the role account every minute. It reads each new booking's title, finds the calling tag ([Bishop], [1st Counselor] or [2nd Counselor]), and moves the booking onto that leader's calendar. Then it marks the role account's own place on the booking as "declined". That stops the booking from blocking the other leaders' pages, while the member's cancel link keeps working. (Removing the account from the booking instead would break the cancel link, so the script declines and never removes.)

## Steps

- **1.** Click "Use template" on this page to open the router script, select all of it and copy it.
- **2.** Signed in as the role account, go to [script.google.com](https://script.google.com) and click New project. Delete the sample code, paste the router, and rename the project "Interview Router".
- **3.** In the left sidebar, click the + next to Services, choose "Google Calendar API" and click Add.
- **4.** Find each leader's Calendar ID: in Google Calendar, open the calendar's "Settings and sharing", scroll to "Integrate calendar", and copy the Calendar ID.
- **5.** At the top of the script, in ROUTES, replace each PASTE_..._CALENDAR_ID_HERE with the matching Calendar ID. Keep the quote marks. Click Save.
- **6.** In the function list at the top, choose checkCalendarIds and click Run. Google asks you to allow the script to use the account's calendar: allow it (if it warns that the app isn't verified, click Advanced, then go to Interview Router; it is your own script). In the log you want one OK line per leader. A BAD line means a Calendar ID to fix.
- **7.** Click Triggers (the clock icon), then Add Trigger: function routeAppointments, event source "Time-driven", type "Minutes timer", "Every minute". Save.
- **8.** Test it: book a time on a counselor's page and on one of the bishop's pages. Within a minute each should move to that leader's calendar with a tidy title; the other leaders' pages should still show that time open; and cancelling from the confirmation email should remove it. Then delete the test bookings.

## Done when

- The router runs every minute (its trigger is set).
- checkCalendarIds shows every leader OK.
- A test booking moves to the right leader's calendar and can still be cancelled from the confirmation email.

## Notes

**A booking stays on the staging calendar?** Its page title doesn't contain a tag the script knows. Check the square brackets and spelling in the title.

**Why not Zapier or similar tools?** They can only copy a booking, which breaks the member's cancel link, and their free plans only check every 15 minutes. The script moves the booking itself and costs nothing.

**Occasional failure emails** from Google about "server error" are rare: the script retries Google's hiccups and waits for the next minute. A failure email that keeps coming means something to fix.

**When a leader is released,** the script needs no change: its tags are callings, and the calendar IDs stay the same.
