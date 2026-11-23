# Batched Permission Queries Implementation Plan

> **For agentic workers:** run by the `orchestrator` skill (one implementer, one reviewer, up to
> 3 fix rounds). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Leader pages (service hub, space pages, ward page, `/vol/new` picker, My service
opportunities, requests inbox) stop making ~150–200 sequential D1 queries per view: permission
data is loaded once per request in a fixed handful of queries, and decisions are made in memory.
Every access decision stays exactly the same.

**Architecture:** A per-request *access snapshot* for one (ward, user): ward role, the user's
space memberships (with space kind and role), the ward's service categories with owning spaces,
active delegate rows (joined to `ward_memberships`), and the user's `vol_editors` rows. Pure
functions answer the same questions `serviceAccess.ts` / `volAccess.ts` answer today. The
existing async exports keep their names, signatures and results (they build a snapshot and ask
it), so single-check call sites keep working; loops switch to one snapshot.

**Spec / decision:** coordinator 2026-11-23 (Sam's go, relayed): "Behaviour must not change:
same fail-closed decisions, with the existing access tests unchanged and green, plus a
query-count assertion for the service hub." Background: `docs/superpowers/plans/2026-11-22-test-flakes.md`
(why the slow pages matter) and `src/lib/serviceAccess.ts` header comment (the rules).

## Global Constraints

- **No behaviour change.** Existing tests in `test/serviceAccess.test.ts`, `test/volAccess.test.ts`
  and every route test stay byte-for-byte unchanged (no edits to existing assertions) and green.
- Fail closed exactly as today: unknown / wrong-ward / missing / non-member / stale delegate
  (left the ward) / archived where it matters → deny. Snapshot rows are all filtered by
  `ward_id`; a decision for a category or post not in the snapshot is deny.
- A snapshot is per request, never cached across requests or in module/global state (Workers
  isolates are shared between requests).
- Write paths re-check with fresh data exactly as today (a snapshot taken at the start of a POST
  is fine; no snapshot reused across requests).
- `npm test && npm run typecheck` green before each commit; at most one suite at a time on this
  machine (the coordinator's limit is 2 machine-wide). No `.dev.vars` commit, no push, no merge,
  no deploy. Product code only in `src/lib/serviceAccess.ts`, `src/lib/volAccess.ts` and the
  call sites that loop.

## Review Focus

1. A user who left the ward but still has delegate / vol_editor / space rows → every decision
   false (snapshot must start from `ward_memberships`).
2. Confidential request categories: bishopric counselor (not owner) denied, bishop and
   superadmin allowed — in the snapshot path as in the old one.
3. Posts in `ward_council` / `bishopric` spaces and NULL-category org posts (legacy rule).
4. A category archived after the snapshot loads isn't a concern within one request, but archived
   categories in the snapshot must still block create and keep manage-existing.
5. Cross-ward ids passed to the snapshot (category or post from another ward) → deny.

---

### Task 1: Frozen reference and equivalence harness

**Files:** Create `test/reference/serviceAccessRef.ts`, `test/reference/volAccessRef.ts` (verbatim
copies of `src/lib/serviceAccess.ts` and `src/lib/volAccess.ts` at main, imports adjusted, header
"frozen reference — do not edit"); Create `test/accessEquivalence.test.ts`.

- [ ] Build a cast in one ward (+ a second ward): superadmin, bishop (bishopric owner), counselor
  (bishopric member), RS president (owner), RS member, RS vol_editor, EQ owner, ward-council
  member, meal delegate (member, no spaces), Christmas delegate, a former member with leftover
  delegate/editor/space rows, an outsider from ward 2, and a user with no rows. Categories: all
  11 defaults + one archived + one with delegates + one with council_may_create. Posts: org,
  ward_council, bishopric, NULL-category org, one per archived category, one from ward 2.
  Requests: one per request category.
- [ ] For every user × every category: `isCategoryManager`, `isCategoryDelegate`,
  `canCreateInCategory`, `mayManagePostsInCategory`, `canSeeRequestCategory`; every user × every
  request: `canSeeRequest`; every user × post: `canEditPost`, `canViewPost`; every user:
  `categoriesUserMayCreateIn` (ids), `hasServiceRole`, `isBishopric`; every category:
  `categoryMessageEmails`, `requestNotifyEmails`, `delegateUserIds` — assert new == reference.
  Commit this harness first (it passes trivially against the unchanged code).

### Task 2: Query counter and the hub assertion (red)

**Files:** `test/helpers.ts` (a `countQueries(db)` wrapper, or reuse `interceptDb`), Create
`test/accessQueryCount.test.ts`.

- [ ] Count D1 statements (prepare+run/first/all and each `batch` statement) for one GET of
  `/w/:wardId/service` as the RS president and as the bishop, with the 11 defaults; then add 20
  more categories and count again. Assert: the count does **not** grow with the number of
  categories (equal before/after), and is ≤ 30. Same two assertions for the public space page
  and `/w/:wardId` (ward dashboard) and `/w/:wardId/vol/new` (picker). Record today's counts in
  the test comment. Expect red.

### Task 3: The snapshot

**Files:** `src/lib/serviceAccess.ts` (add `loadAccess(env, wardId, userId):
Promise<AccessSnapshot>` and pure `snap.*` decision functions; reimplement the existing async
exports on top of it without changing signatures); `src/lib/volAccess.ts` (post decisions take an
optional snapshot: `canEditPost(env, userId, post, snap?)`, `canViewPost(..., snap?)`; post rows
still re-read from D1 as today, or batch-read for lists via `loadPosts(env, wardId, ids)`).

- [ ] `loadAccess` uses at most ~6 queries regardless of ward size (ward role; user's space
  memberships with kinds; categories + owning spaces; active delegate rows; user's vol_editors;
  optionally space owners for message lists — load lazily only where used). Use `env.DB.batch`
  where it helps.
- [ ] Task 1 equivalence and all existing tests green.

### Task 4: Switch the loops

**Files:** `src/serviceRoutes.ts`, `src/app.ts` (ward page `hasServiceRole`, space page),
`src/volRoutes.ts` (`/vol/new` picker, post lists), `src/lib/volPosts.ts` /
service mine listing, requests inbox.

- [ ] Each listing route builds one snapshot per request and passes it to every per-item check.
  Task 2 goes green. Report before/after counts for each page.

### Task 5: Prove it

- [ ] `npm test && npm run typecheck`; report the slowest tests before/after (verbose reporter,
  one suite) and whether the leader-page tests now run under ~0.5 s alone. Update the CLAUDE.md
  test-speed note if the N+1 caveat no longer applies, and add one line to the `serviceAccess.ts`
  header: loops must use one snapshot.
