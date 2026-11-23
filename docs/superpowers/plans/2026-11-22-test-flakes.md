# Intermittent Test Failures Fix Plan

> **For agentic workers:** run by the `orchestrator` skill (one implementer, one reviewer, up to
> 3 fix rounds). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Find why `npm test` intermittently fails a few route tests (cold first run after a
merge, or under load) and fix the cause so the suite is reliably green.

**Background (observed, not yet explained):**
- On main @ 8ce5075, the first `npm test` right after the merge had 5 failures in 4 files; the
  next six runs were 320/320. Which tests failed was not captured.
- On the service-opportunities branch, one full run of ~10 failed 3 route tests
  (`test/serviceRoutes.test.ts` hub, `test/volAccess.test.ts` editors card,
  `test/volPublicRoutes.test.ts` IP rate limit); each passed alone.
- The rename build also saw a one-off failure.
- Suspicion (coordinator's): cold start — transform cache cold, ~35 isolated test files in the
  Workers pool. Unconfirmed. Other candidates worth checking: tests that depend on wall-clock
  time (`Date.now()` / `new Date()` vs. the fixed `NOW` in `test/volFixtures.ts`, rate-limit
  windows, token expiry, cutoffs, "yesterday" in the ward time zone), shared D1 state across
  tests in one file (unique emails/prefixes from `tag()` / `uniqueEmail` colliding, IP buckets
  shared through a fixed `CF-Connecting-IP`), fire-and-forget work (`waitUntil`, un-awaited
  promises) still running when assertions or the next test run, `waitFor` deadlines (4 s default
  in `test/helpers.ts`) that a slow cold isolate exceeds, and global mutable state
  (`mailRetry`, fetch/email fakes) not restored between tests.

**Spec:** none; the requirement is "the suite is green on every run, cold or warm, without
blindly raising timeouts" (coordinator, 2026-11-22).

## Global Constraints

- Branch `claude/test-flakes` in worktree
  `F:\!SLRFam\AI\Claude-Apps\Wardest.com\.claude\worktrees\loving-brahmagupta-a6ed90`, cut from
  main @ 8ce5075. No push, no merge, no deploy.
- Fix causes, not symptoms. A timeout may change only where you show the operation is
  legitimately slow on a cold start and the old value was arbitrary; say so in a comment.
- Never weaken an assertion, skip, or `retry:` a test to hide a flake.
- Don't change product behaviour unless the investigation shows a real product bug (then fix it
  with a test, and report it under Decisions).
- `npm test && npm run typecheck` green before each commit. Never commit `.dev.vars`.

## Review Focus

1. A test that passes at one time of day / date fails at another (date boundaries in the ward's
   time zone, near midnight UTC, month ends). Check by faking the clock where the code takes a
   `now`.
2. Two tests in one file sharing a rate-limit bucket or unique key.
3. Work started by a route via `waitUntil` that outlives the test.

---

### Task 1: Reproduce and capture

- [ ] **Step 1:** Write a small script under the session scratchpad (not the repo) that runs
  the suite N times (≥ 15) with a cold cache each time (delete `node_modules/.vite`,
  `node_modules/.vitest` and any vitest/miniflare cache dirs you find), and also N times under
  CPU load (e.g. two suites in parallel, or `--maxWorkers` variations), saving each run's failing
  test names and error messages.
- [ ] **Step 2:** Summarise: which tests fail, how often, under which condition, and the exact
  error text. If nothing reproduces after a reasonable effort, also audit the suite for the
  candidate causes above and list concrete hazards with file:line.

### Task 2: Fix each cause

- [ ] For each failing test or hazard: state the root cause, fix it (test code or, if a real
  bug, product code with a test), and show it no longer fails under the Task 1 conditions. One
  commit per cause, message naming it.

### Task 3: Prove it

- [ ] Re-run the Task 1 script (cold and loaded) at least 15 times each on the final head;
  report pass counts. Note any residual unexplained failure honestly. Add a short note to
  CLAUDE.md's `npm test` line only if there's a rule future tests must follow (e.g. "never use
  wall-clock time in route tests; pass `now`").
