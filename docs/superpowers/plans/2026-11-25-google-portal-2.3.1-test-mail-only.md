# Google-only portal 2.3.1 — test-mode email switch

> Run by the orchestrator skill: one implementer, then one reviewer. Small branch off main (0667610).

Sam's words (relayed verbatim, 2026-11-25): "Let's do #2 but give me detailed instructions how I
can restrict testing emails to go only go to myself while testing (and how to turn it all back on
afterwards)".

## Rule

- New Settings row `test_mail_only` (added by ensureSettingsRows_, blank = off; GP_VERSION bump so
  a pasted Code.gs adds it on the next job). Value: comma-separated addresses that may still get
  real mail. The FIRST valid address is the catch-all.
- Matching uses normEmail on both sides (trim, lower-case). Gmail `+tag` variants are distinct
  addresses: list each one you want (e.g. `b@…`, `b+c@…`); no wildcard.
- When set, at the single choke point every email passes through (sendMailNow_ / the final send
  in 06-mail.js, so sendOrQueue_, drainOutbox_ retries, sendAll_, admin alerts, leader links, the
  health email and anything future are covered): a recipient on the list gets the message
  unchanged; any other recipient's message goes to the catch-all instead, with the subject prefixed
  `[TEST for <original address>] `. Still one message per original recipient (quota and routing
  checks unchanged). The Outbox/Log record the ORIGINAL recipient plus "redirected to test
  address" so routing can be checked; no extra copies.
- **Fail closed:** if any entry in the row is not a valid address, the row is treated as broken:
  EVERY message (even to listed addresses) goes to the first valid address with the prefix; if
  there is no valid address at all, NOTHING is sent: each message is logged "test mode: not sent
  (test_mail_only has no valid address)" and dropped (not queued — queued mail would reach real
  people when the switch is turned off). Check health shows PROBLEM for the bad entry.
- Check health (and so the daily health email, which itself goes through the switch) shows a
  PROBLEM line whenever the row is non-blank: "Test mode: email to anyone not in test_mail_only
  goes to <first>" — so it can't be forgotten at go-live.
- Nothing else changes (sharing, Notify, approvals, who is chosen as a recipient).

## Tests (Node fakes)
- Blank: mail unchanged.
- Set: a listed address receives normally; an unlisted one goes to the first address with the
  exact prefix; case/whitespace variants of a listed address match; `b+c@` listed separately works,
  unlisted `b+d@` is redirected.
- Every path redirects: sign-up confirmation, approval notice to bishopric, request notice, admin
  alert, leader link, outbox drain retry, health email.
- One message per original recipient; quota accounting unchanged.
- Bad entry → all mail to first valid with prefix + PROBLEM; no valid entry → nothing sent, logged.
- Check health PROBLEM line while on; none when blank.
- web-exposure allow-list green.

## Docs
- SETUP-GUIDE: a "Test mode (send all email only to yourself)" section: how to turn it on (type the
  addresses in Settings → test_mail_only), what it does, what the subject prefix means, the Check
  health line, and how to turn it off (empty the cell, run Check health: the line is gone). Mention
  it in §9 (test checklist).
- Wording fixes folded in: a job refused for the wrong account "does nothing" (guide §9 and
  wherever it says it writes "job refused" in the Log from a personal account); test-plan row 16.8
  mentions the required "Moving in or out" answer.
- Test plan: make `F:\!SLRFam\AI\Claude-Apps\Wardest.com\drafts\Service-Portal-Test-Plan-DRAFT-2.docx`
  from DRAFT-1 (outside the repo; docx skill; render and check every page): section 0 sets
  test_mail_only (Sam, his wife, Test address B and its +c/+d variants) and checks the Check
  health line; old row 0.10 (warn real people) becomes optional; routing checks in 15–17 (and any
  other step where mail would go to someone not on the list) read the "[TEST for …]" prefix in the
  catch-all inbox; row 16.8 wording fix; section 20 empties test_mail_only and runs Check health
  (the Test mode line is gone). Then move DRAFT-1 to `F:\!SLRFam\AI\Claude-Apps\Wardest.com\drafts\archive\`.
- Spec: §12 decision 21 with Sam's quote.

## Done
Build check, `npm test && npm run typecheck` green; commits end with the Co-Authored-By line;
DRAFT-2 rendered and checked; DRAFT-1 archived; Sam's on/off steps in the report.
