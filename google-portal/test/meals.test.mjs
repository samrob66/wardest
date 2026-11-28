// 2.6 (decision 28): meals for new parents and members in hardship (server half).
// Spec docs/superpowers/specs/2026-11-28-google-portal-meals-design.md; API contract 2-6-api-contract.md.
import { describe, it, expect } from 'vitest';
import { loadPortal } from './harness.mjs';
import { formSubmitEvent } from './fakes.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const cats = (gp) => gp.fakes.spreadsheet.rowsOf('Categories');

describe('task 1: Categories columns and the meals seeds', () => {
  it('Set up adds Picture and Sign-up notices to, and the three meals rows once', () => {
    const gp = loadPortal({ seed: true });
    const headers = gp.table_(gp.fakes.spreadsheet.getSheetByName('Categories')).headers;
    expect(headers.slice(-2)).toEqual(['Picture', 'Sign-up notices to']);
    const byId = Object.fromEntries(cats(gp).map((c) => [c.Id, c]));
    expect(byId['meal-request']).toMatchObject({
      Name: 'Meals',
      Kind: 'Request',
      'Owning organizations': 'Relief Society',
      Notify: 'Coordinators',
      'On Help page': true,
      Confidential: false,
      'Opportunity category': 'meals-new-moms, meals-hardship',
    });
    expect(byId['meals-new-moms']).toMatchObject({ Name: 'Meals for New Moms', Kind: 'Opportunity', 'Owning organizations': 'Relief Society', 'Default audiences': 'Sisters' });
    expect(byId['meals-hardship']).toMatchObject({ Name: 'Meals for Members in Hardship', Kind: 'Opportunity', 'Owning organizations': 'Relief Society', 'Default audiences': 'Sisters' });
    // The old meals opportunity row stays as it is.
    expect(byId.meals).toMatchObject({ Name: 'Meals', Kind: 'Opportunity' });
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    expect(cats(gp).filter((c) => c.Id.startsWith('meal'))).toHaveLength(4);
  });

  it('an older install gets the columns and rows from the GP_VERSION upgrade; a row Sam typed is kept; a deleted row is not re-added', () => {
    const gp = loadPortal({ seed: true });
    const t = gp.serviceTab_('Categories');
    // As before 2.6: no meals rows yet, but Sam typed his own meals-hardship row.
    for (const id of ['meal-request', 'meals-new-moms', 'meals-hardship']) t.remove(t.find('Id', id));
    t.append({ Id: 'meals-hardship', Name: 'Hardship meals (ours)', Kind: 'Opportunity', Coordinators: 'sister.meals@example.test' });
    gp.fakes.props.delete('MEALS_SEEDED');
    gp.fakes.props.set('SCHEMA_VERSION', 'phase-2.5.3');
    gp.ensureUpgraded_();
    expect(gp.fakes.props.get('SCHEMA_VERSION')).toBe('phase-2.6');
    const mine = cats(gp).filter((c) => c.Id === 'meals-hardship');
    expect(mine).toHaveLength(1);
    expect(mine[0].Name).toBe('Hardship meals (ours)');
    expect(cats(gp).map((c) => c.Id)).toEqual(expect.arrayContaining(['meal-request', 'meals-new-moms']));
    // Deleted later: never re-added.
    t.remove(t.find('Id', 'meals-new-moms'));
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    expect(cats(gp).map((c) => c.Id)).not.toContain('meals-new-moms');
  });

  it('every new header has a note', () => {
    const gp = loadPortal();
    for (const h of ['Picture', 'Sign-up notices to']) expect(plain(gp.FIELD_NOTES.tabs.Categories[h]).length).toBeGreaterThanOrEqual(2);
  });
});

// ---------- tasks 2 and 3: the meals form and its request sheet ----------

const COORDS = 'sister.meals1@example.test, sister.meals2@example.test';

/** Set up on a ward whose meals rows have their coordinators. */
function mealsWard() {
  const gp = loadPortal({ seed: true });
  const t = gp.serviceTab_('Categories');
  t.update(t.find('Id', 'meal-request'), { Coordinators: COORDS });
  t.update(t.find('Id', 'meals-new-moms'), { Coordinators: COORDS });
  t.update(t.find('Id', 'meals-hardship'), { Coordinators: COORDS });
  gp.fakes.props.delete('SYSTEM_ID');
  gp.gpMenuSetUp();
  gp.gpBegin_();
  gp.fakes.mail.sent.length = 0;
  return gp;
}
const sysOf = (gp) => gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID'));
const mealFile = (gp) => sysOf(gp).rowsOf('Request files').find((f) => f['Category id'] === 'meal-request');
const mealForm = (gp) => gp.fakes.forms.get(mealFile(gp)['Form id']);
const mealSheet = (gp) => gp.fakes.spreadsheets.get(mealFile(gp)['Sheet id']).getSheetByName('Requests');
const mealRows = (gp) => gp.fakes.spreadsheets.get(mealFile(gp)['Sheet id']).rowsOf('Requests');

const BABY_ANSWERS = {
  'What are the meals for?': 'A new baby',
  "Mom's name": 'Anna Sample',
  "Mom's phone": '555-0100',
  "Mom's email": 'anna.sample@example.test',
  "Dad's name": 'Ben Sample',
  "Dad's phone": '555-0101',
  "Dad's email": 'ben.sample@example.test',
  'Due date': '2027-01-15',
  'Boy, girl or surprise?': 'Surprise',
  'Who should the sisters coordinate with?': ['Mom', 'Dad'],
  Address: '123 Example Lane',
  'When should meals start?': '3 days after baby comes',
  'How often?': 'Every other day',
  'Best drop-off time window': '5:30-6:30 pm',
  'Drop-off': 'Quiet drop-off (text on arrival)',
  'How many adults should the meals feed?': '2',
  'How many kids?': '3',
  'Allergies, restrictions or dislikes': 'No peanuts',
  'Favorite foods or cuisines': 'Soups, Mexican',
  Note: 'Thank you!',
};
const HARDSHIP_ANSWERS = {
  'What are the meals for?': 'A member in hardship',
  'Your name': 'Carla Example',
  'Your phone': '555-0102',
  'Your email': 'carla.example@example.test',
  'Who should the sisters coordinate with?': ['Me', 'Other'],
  'Other contact: name': 'Dana Helper',
  'Other contact: phone': '555-0104',
  Address: '9 Sample Court',
  'How often?': 'Daily',
  'Drop-off': 'Regular drop-off (knock or doorbell)',
  'How many adults should the meals feed?': '1',
  'Allergies, restrictions or dislikes': 'Vegetarian',
};

describe('task 2: the meals form (one form, two doors)', () => {
  it('has the opening, the branching first question, both sections and the shared section', () => {
    const gp = mealsWard();
    const f = mealForm(gp);
    expect(f.title).toBe('Meals — Riverbend 1st Ward (example)');
    expect(f.description).toMatch(/^Congratulations on your new baby!/);
    expect(f.description).toContain('at least 3 days after baby arrives');
    expect(f.description).toContain('Best guesses are fine');
    expect(f.description).toContain('Only the bishopric, the Relief Society leaders and the people they name see this request.');
    expect(f.confirmation).toContain("we'd love to share a photo, name, gender and birth date with the Relief Society presidency");
    expect(f.collectEmail).toBe(false);
    const first = f.items[0];
    expect(first).toMatchObject({ type: 'MULTIPLE_CHOICE', title: 'What are the meals for?', required: true, choices: ['A new baby', 'A member in hardship'] });
    expect(f.items.filter((i) => i.type === 'PAGE_BREAK').map((i) => i.title)).toEqual(['About the baby and parents', 'About you', 'The meals']);
    const shared = ['Address', 'When should meals start?', 'How often?', 'Which dates? (only for specific dates)', 'Best drop-off time window', 'Drop-off',
      'How many adults should the meals feed?', 'How many kids?', 'Allergies, restrictions or dislikes', 'Favorite foods or cuisines', 'Note'];
    const coord = ['Who should the sisters coordinate with?', 'Other contact: name', 'Other contact: phone'];
    expect(f.pathFor('A new baby')).toEqual(['What are the meals for?', "Mom's name", "Mom's phone", "Mom's email", "Dad's name", "Dad's phone", "Dad's email",
      'Due date', 'Induction date (if planned)', 'Boy, girl or surprise?', ...coord, ...shared]);
    expect(f.pathFor('A member in hardship')).toEqual(['What are the meals for?', 'Your name', 'Your phone', 'Your email', "Second adult's name",
      "Second adult's phone", "Second adult's email", ...coord, ...shared]);
    const byTitle = (t) => f.items.filter((i) => i.title === t);
    expect(byTitle('Who should the sisters coordinate with?').map((i) => [i.type, i.choices])).toEqual([['CHECKBOX', ['Mom', 'Dad', 'Other']], ['CHECKBOX', ['Me', 'The second adult', 'Other']]]);
    expect(byTitle('Drop-off')[0].choices).toEqual(['Regular drop-off (knock or doorbell)', 'Quiet drop-off (text on arrival)']);
    expect(byTitle('How often?')[0].choices).toEqual(['Daily', 'Every other day', 'Specific dates']);
    expect(byTitle('Induction date (if planned)')[0].required).toBe(false);
    expect(byTitle('Boy, girl or surprise?')[0].required).toBe(false);
    expect(byTitle('Address')[0].required).toBe(true);
  });

  it('the Help page shows two tiles that open the same form with the first question answered', () => {
    const gp = mealsWard();
    const tiles = plain(gp.apiHelp_()).tiles.filter((t) => t.id.startsWith('meal-request'));
    const f = mealForm(gp);
    const entry = `entry.${f.items[0].id}=`;
    expect(tiles).toEqual([
      { id: 'meal-request-baby', name: 'Meals for New Moms & Dads', icon: '🍲', url: `${f.getPublishedUrl()}?usp=pp_url&${entry}A%20new%20baby` },
      { id: 'meal-request-hardship', name: 'Meals for Members in Hardship', icon: '🍲', url: `${f.getPublishedUrl()}?usp=pp_url&${entry}A%20member%20in%20hardship` },
    ]);
  });

  it('an older meals form without the first question still gets both links, plain', () => {
    const gp = mealsWard();
    const f = mealForm(gp);
    f.items = f.items.filter((i) => i.title !== 'What are the meals for?');
    expect(plain(gp.mealPrefilledUrls_(f))).toEqual({ baby: f.getPublishedUrl(), hardship: f.getPublishedUrl() });
  });

  it('Set up again refreshes the wording and never makes a second meals form', () => {
    const gp = mealsWard();
    const f = mealForm(gp);
    f.setDescription('old words');
    const before = gp.fakes.forms.size;
    gp.gpMenuSetUp();
    expect(gp.fakes.forms.size).toBe(before);
    expect(f.description).toMatch(/^Congratulations on your new baby!/);
  });
});

describe('task 3: the meals request sheet', () => {
  it('has a column per answer after the standard ones, then the hand columns, each with a note', () => {
    const gp = mealsWard();
    const sh = mealSheet(gp);
    const headers = gp.table_(sh).headers;
    expect(headers).toEqual([...gp.REQUEST_HEADERS, ...gp.MEAL_REQUEST_HEADERS]);
    const col = headers.indexOf('Shared with RS') + 1;
    expect(sh.validations.get(`2,${col}`)).toBe('checkbox');
    expect(sh.getRange(1, col).getNote()).toBe(
      'Tick this when baby is here, this row is complete, and the Relief Society presidency has been told they can open and review it.\nUnticked: not shared yet.\nExample: ticked'
    );
    // Other request sheets keep the standard columns only.
    const moving = sysOf(gp).rowsOf('Request files').find((f) => f['Category id'] === 'moving');
    expect(gp.table_(gp.fakes.spreadsheets.get(moving['Sheet id']).getSheetByName('Requests')).headers).toEqual(gp.REQUEST_HEADERS);
  });

  it('files a new-baby answer into its columns and emails only the coordinators, with no details', () => {
    const gp = mealsWard();
    gp.gpOnRequestSubmit(formSubmitEvent(mealForm(gp), BABY_ANSWERS));
    const row = mealRows(gp)[0];
    expect(row).toMatchObject({
      Kind: 'Meals',
      Status: 'New',
      Name: 'Anna Sample',
      'Phone or email': '555-0100',
      'Meals for': 'A new baby',
      "Mom's email": 'anna.sample@example.test',
      "Dad's name": 'Ben Sample',
      'Due date': '2027-01-15',
      'Boy, girl or surprise': 'Surprise',
      'Coordinate with': 'Mom, Dad',
      Address: '123 Example Lane',
      'Meals start': '3 days after baby comes',
      'How often': 'Every other day',
      'Drop-off window': '5:30-6:30 pm',
      'Drop-off': 'Quiet drop-off (text on arrival)',
      Adults: '2',
      Kids: '3',
      Allergies: 'No peanuts',
      'Favorite foods': 'Soups, Mexican',
      Note: 'Thank you!',
      'Shared with RS': false,
    });
    expect(row['Request id']).toMatch(/^r/);
    expect(mealForm(gp).deletedResponses).toEqual(['resp-1']);
    const to = gp.fakes.mail.sent.filter((m) => m.subject.startsWith('New Meals request')).map((m) => m.to).sort();
    expect(to).toEqual(['sister.meals1@example.test', 'sister.meals2@example.test']);
    for (const m of gp.fakes.mail.sent) for (const bad of ['Anna', '555-0100', 'Example Lane', 'peanuts']) expect(m.body).not.toContain(bad);
  });

  it('files a hardship answer: the adult in Name, the Other contact in its columns', () => {
    const gp = mealsWard();
    gp.gpOnRequestSubmit(formSubmitEvent(mealForm(gp), HARDSHIP_ANSWERS));
    expect(mealRows(gp)[0]).toMatchObject({
      Name: 'Carla Example',
      'Phone or email': '555-0102',
      'Meals for': 'A member in hardship',
      'Adult email': 'carla.example@example.test',
      'Coordinate with': 'Me, Other',
      'Other contact name': 'Dana Helper',
      'Other contact phone': '555-0104',
      "Mom's name": '',
    });
  });

  it('readers are unchanged (bishopric, Relief Society leaders, coordinators); notices go to the coordinators', () => {
    const gp = mealsWard();
    const cat = gp.serviceTab_('Categories').find('Id', 'meal-request');
    const readers = plain(gp.requestReaders(cat, gp.leaders_()));
    expect(readers).toEqual(expect.arrayContaining(['bishop.example@example.test', 'sister.example@example.test', 'sister.meals1@example.test', 'sister.meals2@example.test']));
    expect(readers).not.toContain('brother.sample@example.test'); // Elders Quorum
    expect(plain(gp.requestNotifyList(cat, gp.leaders_())).to.sort()).toEqual(['sister.meals1@example.test', 'sister.meals2@example.test']);
  });
});

// ---------- task 7: family and Sign-up notices to emails ----------

describe('task 7: the family and the Sign-up notices to address hear about every sign-up and cancellation', () => {
  const GROUP = 'rb1-meals@example.test';
  const VOL = 'brother.volunteer@example.test';
  const tokenFrom = (text, page) => new RegExp(page + '[^\\s"]*#t=([0-9a-f]{64})').exec(text)[1];

  /** A published meal post (two dates, 1 needed each) with family emails and a Sign-up notices to group. */
  function mealPost() {
    const gp = loadPortal({ seed: true });
    const c = gp.serviceTab_('Categories');
    c.update(c.find('Id', 'meals-new-moms'), { 'Sign-up notices to': `${GROUP}, not an address` });
    gp.serviceTab_('Volunteers').append({ Email: VOL, Name: 'Brother Volunteer', Status: 'Approved', 'Decided by': 'Bishop Example', 'First post': 'p1' });
    gp.serviceTab_('Posts').append({
      'Post id': 'pm', 'Public id': 'pubbaby001', Organization: 'Relief Society', Category: 'meals-new-moms', Title: 'Meals for the Sample family',
      Audiences: 'Sisters, Brothers', 'Cancel cutoff hours': 24, Status: 'Open', 'Created by': 'request r1', 'Show on Serve': 'No',
      'Family emails': 'anna.sample@example.test, ben.sample@example.test', 'Private details': '123 Example Lane',
    });
    gp.serviceTab_('Slots').appendMany([
      { 'Slot id': 'sm1', 'Post id': 'pm', Date: '2026-12-05', Start: '17:30', Role: 'Bring a meal', Needed: 1, Filled: 0, Waiting: 0 },
      { 'Slot id': 'sm2', 'Post id': 'pm', Date: '2026-12-07', Start: '17:30', Role: 'Bring a meal', Needed: 1, Filled: 0, Waiting: 0 },
    ]);
    gp.gpBegin_();
    gp.fakes.mail.sent.length = 0;
    return gp;
  }
  const familyMail = (gp) => gp.fakes.mail.sent.filter((m) => ['anna.sample@example.test', 'ben.sample@example.test', GROUP].includes(m.to));
  const signUp = (gp, slotId = 'sm1') => {
    gp.apiSignup_({ publicId: 'pubbaby001', slotId, name: 'Brother Volunteer', email: VOL });
    gp.gpBegin_();
  };

  it('a sign-up that counts: one email to each family address and the group, first name only', () => {
    const gp = mealPost();
    signUp(gp);
    const mail = familyMail(gp);
    expect(mail.map((m) => m.to).sort()).toEqual(['anna.sample@example.test', 'ben.sample@example.test', GROUP]);
    for (const m of mail) {
      expect(m.subject).toBe('New sign-up: Bring a meal, Sat, Dec 5 (Meals for the Sample family)');
      expect(m.body).toContain('Volunteer signed up for Bring a meal on Saturday, December 5');
      expect(m.body).not.toContain(VOL);
      expect(m.body).not.toContain('Brother');
      expect(m.htmlBody).not.toContain(VOL);
      expect(m.body).not.toContain('123 Example Lane');
    }
  });

  it('a first-timer waiting for approval sends nothing until approved; then the family hears once', () => {
    const gp = mealPost();
    gp.apiSignup_({ publicId: 'pubbaby001', slotId: 'sm1', name: 'Sister New', email: 'sister.new@example.test' });
    const confirm = gp.fakes.mail.sent.find((m) => m.to === 'sister.new@example.test');
    gp.apiConfirm_({ t: tokenFrom(confirm.body, 'confirm') });
    expect(familyMail(gp)).toEqual([]);
    gp.apiDecide_({ k: linkFor(gp, 'bishop.example@example.test'), email: 'sister.new@example.test', decision: 'approve' });
    expect(familyMail(gp).map((m) => m.subject)).toEqual(Array(3).fill('New sign-up: Bring a meal, Sat, Dec 5 (Meals for the Sample family)'));
    expect(familyMail(gp)[0].body).toContain('New signed up');
  });

  it('every cancel path tells them: cancel link, My sign-ups, withdraw, leader Remove, cancel date, cancel post', () => {
    const cancelled = (gp) => familyMail(gp).filter((m) => m.subject.startsWith('Cancelled: '));
    // Cancel link.
    let gp = mealPost();
    signUp(gp);
    const conf = gp.fakes.mail.sent.find((m) => m.to === VOL && m.subject.startsWith("You're signed up"));
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiCancel_({ t: tokenFrom(conf.body, 'confirm') })).ok).toBe(true);
    expect(cancelled(gp)).toHaveLength(3);
    expect(cancelled(gp)[0].body).toContain('Volunteer is no longer signed up for Bring a meal on Saturday, December 5');
    expect(cancelled(gp)[0].body).not.toContain(VOL);
    // My sign-ups.
    gp = mealPost();
    signUp(gp);
    const me = gp.fakes.mail.sent.find((m) => m.to === VOL && m.subject.startsWith("You're signed up"));
    const meT = /me[^\s"]*#t=([0-9a-f]{64})/.exec(me.body)[1];
    const su = gp.fakes.spreadsheet.rowsOf('Sign-ups')[0];
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiCancelMine_({ t: meT, signupId: su['Sign-up id'] })).ok).toBe(true);
    expect(cancelled(gp)).toHaveLength(3);
    // Leader Remove.
    gp = mealPost();
    signUp(gp);
    gp.fakes.mail.sent.length = 0;
    const sid = gp.fakes.spreadsheet.rowsOf('Sign-ups')[0]['Sign-up id'];
    expect(plain(gp.apiRemoveSignup_({ k: linkFor(gp, 'sister.example@example.test'), signupId: sid })).ok).toBe(true);
    expect(cancelled(gp)).toHaveLength(3);
    // Cancel one date (the post has two).
    gp = mealPost();
    signUp(gp);
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiCancelDate_({ k: linkFor(gp, 'sister.example@example.test'), postId: 'pm', date: '2026-12-05' })).ok).toBe(true);
    expect(cancelled(gp)).toHaveLength(3);
    // Cancel the whole post.
    gp = mealPost();
    signUp(gp, 'sm2');
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiCancelPost_({ k: linkFor(gp, 'sister.example@example.test'), postId: 'pm' })).ok).toBe(true);
    expect(cancelled(gp).map((m) => m.subject)).toEqual(Array(3).fill('Cancelled: Bring a meal, Mon, Dec 7 (Meals for the Sample family)'));
  });

  it('withdrawing an over-the-number offer tells the family, even though the role stays full', () => {
    const gp = mealPost();
    signUp(gp); // fills sm1
    gp.apiSignup_({ publicId: 'pubbaby001', slotId: 'sm1', name: 'Sister New', email: 'sister.new@example.test' });
    gp.apiConfirm_({ t: tokenFrom(gp.fakes.mail.sent.find((m) => m.to === 'sister.new@example.test').body, 'confirm') });
    gp.fakes.mail.sent.length = 0;
    gp.apiDecide_({ k: linkFor(gp, 'bishop.example@example.test'), email: 'sister.new@example.test', decision: 'approve' });
    const over = gp.fakes.mail.sent.find((m) => m.to === 'sister.new@example.test' && m.subject.startsWith('Thank you:'));
    gp.fakes.mail.sent.length = 0;
    expect(plain(gp.apiWithdraw_({ t: tokenFrom(over.body, 'confirm') })).ok).toBe(true);
    expect(familyMail(gp).map((m) => m.subject)).toEqual(Array(3).fill('Cancelled: Bring a meal, Sat, Dec 5 (Meals for the Sample family)'));
    // The leaders hear nothing (the role is still full), as before.
    expect(gp.fakes.mail.sent.filter((m) => m.to === 'sister.example@example.test')).toEqual([]);
  });

  it('test mode sends them to the tester; a post with no family emails and no group sends none', () => {
    const gp = mealPost();
    gp.serviceTab_('Settings');
    const s = gp.fakes.spreadsheet.getSheetByName('Settings');
    const keys = s.getRange(1, 1, s.getLastRow(), 1).getValues().map((r) => r[0]);
    s.getRange(keys.indexOf('test_mail_only') + 1, 2).setValue('exec.home@example.test');
    gp.gpBegin_();
    signUp(gp);
    const tagged = gp.fakes.mail.sent.filter((m) => m.subject.startsWith('[TEST for anna.sample@example.test] New sign-up'));
    expect(tagged.map((m) => m.to)).toEqual(['exec.home@example.test']);
    expect(gp.fakes.mail.sent.some((m) => m.to === 'anna.sample@example.test')).toBe(false);

    const gp2 = loadPortal({ seed: true });
    seedPostPlain(gp2);
    gp2.gpBegin_();
    gp2.fakes.mail.sent.length = 0;
    gp2.serviceTab_('Volunteers').append({ Email: VOL, Name: 'Brother Volunteer', Status: 'Approved', 'Decided by': 'Bishop Example', 'First post': 'p1' });
    gp2.gpBegin_();
    gp2.apiSignup_({ publicId: 'pubmeals01', slotId: 'p1-s1', name: 'Brother Volunteer', email: VOL });
    expect(gp2.fakes.mail.sent.filter((m) => /New sign-up/.test(m.subject))).toEqual([]);
  });
});

function seedPostPlain(gp) {
  gp.serviceTab_('Posts').append({ 'Post id': 'p1', 'Public id': 'pubmeals01', Organization: 'Relief Society', Category: 'meals', Title: 'Soup night', Audiences: 'Sisters, Brothers', 'Cancel cutoff hours': 24, Status: 'Open', 'Created by': 'sister.example@example.test' });
  gp.serviceTab_('Slots').append({ 'Slot id': 'p1-s1', 'Post id': 'p1', Date: '2026-12-05', Start: '17:00', Role: 'Help', Needed: 3, Filled: 0, Waiting: 0 });
}

// ---------- tasks 4, 5, 6 and 8: meal drafts, Show on Serve, progress, zero-slot drafts ----------

const linkFor = (gp, email) => gp.issueToken_('leader', email, '2027-01-01 00:00');
const postsOf = (gp) => gp.fakes.spreadsheet.rowsOf('Posts');
const COORD1 = 'sister.meals1@example.test';

/** A meals ward with one coordinator on the Leaders tab (she edits meals posts). */
function mealsWardWithLeader() {
  const gp = mealsWard();
  gp.serviceTab_('Leaders').append({ Name: 'Sister Meals', Email: COORD1, Calling: 'Meal coordinator', Organization: 'Relief Society', Coordinator: true });
  gp.gpBegin_();
  return gp;
}

/** Submits a meals answer, ticks Make opportunity on it and runs the hourly job. Returns the draft row. */
function draftFrom(gp, answers) {
  gp.gpOnRequestSubmit(formSubmitEvent(mealForm(gp), answers));
  const t = gp.table_(mealSheet(gp));
  const rows = t.rows();
  t.update(rows[rows.length - 1], { 'Make opportunity': true });
  gp.gpBegin_();
  gp.makeDraftsFromRequests_();
  gp.gpBegin_();
  const id = t.rows()[rows.length - 1]['Request id'];
  return postsOf(gp).find((p) => p['Created by'] === 'request ' + id);
}

describe('task 4: Make opportunity makes a meal draft', () => {
  it('new baby: a hidden Draft in Meals for New Moms with the public and private fields split', () => {
    const gp = mealsWardWithLeader();
    const p = draftFrom(gp, BABY_ANSWERS);
    expect(p).toMatchObject({
      Category: 'meals-new-moms',
      Organization: 'Relief Society',
      Audiences: 'Sisters',
      Status: 'Draft',
      Title: 'Meals for the Sample family',
      'Public note': 'Meals start: 3 days after baby comes. How often: Every other day.',
      'Show on Serve': 'No',
      Allergies: 'No peanuts',
      'Food likes': 'Soups, Mexican',
      Serves: '2 adults, 3 kids',
      'Drop-off window': '5:30-6:30 pm',
      'Drop-off': 'Quiet',
      'Coordinate with': 'Anna and Ben',
      'Family emails': 'anna.sample@example.test, ben.sample@example.test',
      Progress: '',
    });
    expect(p['Private details']).toBe('Address: 123 Example Lane\nAnna: 555-0100\nBen: 555-0101');
    // No dates yet: the coordinator adds them once baby is here.
    expect(gp.fakes.spreadsheet.rowsOf('Slots').filter((s) => s['Post id'] === p['Post id'])).toEqual([]);
    // Public fields never carry the address, phones or emails.
    for (const k of ['Title', 'Public note', 'Allergies', 'Food likes', 'Serves', 'Drop-off window', 'Drop-off', 'Coordinate with']) {
      for (const bad of ['Example Lane', '555-01', '@']) expect(String(p[k])).not.toContain(bad);
    }
    const row = mealRows(gp)[0];
    expect(row['Posted as']).toMatch(/^Draft made .* \(Meals for the Sample family, p/);
    expect(row['Make opportunity']).toBe(false);
  });

  it('hardship: Meals for Members in Hardship, the adult and the Other contact', () => {
    const gp = mealsWardWithLeader();
    const p = draftFrom(gp, HARDSHIP_ANSWERS);
    expect(p).toMatchObject({
      Category: 'meals-hardship',
      Title: 'Meals for the Example family',
      'Coordinate with': 'Carla',
      'Family emails': 'carla.example@example.test',
      Serves: '1 adult',
      'Drop-off': 'Regular',
      Allergies: 'Vegetarian',
      'Show on Serve': 'No',
    });
    expect(p['Private details']).toBe('Address: 9 Sample Court\nCarla: 555-0102\nOther contact: Dana Helper, 555-0104');
    expect(p['Public note']).toBe('How often: Daily.');
  });

  it('title: different last names give the first names; only Mom ticked gives only her email and phone', () => {
    const gp = mealsWardWithLeader();
    const p = draftFrom(gp, { ...BABY_ANSWERS, "Dad's name": 'Ben Other', 'Who should the sisters coordinate with?': ['Mom'] });
    expect(p.Title).toBe('Meals for the Anna and Ben family');
    expect(p['Coordinate with']).toBe('Anna');
    expect(p['Family emails']).toBe('anna.sample@example.test');
    expect(p['Private details']).toContain('Anna: 555-0100');
    expect(p['Private details']).not.toContain('555-0101');
  });

  it('nobody ticked: every parent email and phone; no names at all: "Meals for a family"', () => {
    const gp = mealsWardWithLeader();
    const p = draftFrom(gp, { ...BABY_ANSWERS, 'Who should the sisters coordinate with?': [] });
    expect(p['Coordinate with']).toBe('');
    expect(p['Family emails']).toBe('anna.sample@example.test, ben.sample@example.test');
    const q = draftFrom(gp, { ...HARDSHIP_ANSWERS, 'Your name': '' });
    expect(q.Title).toBe('Meals for a family');
    const r = draftFrom(gp, { ...BABY_ANSWERS, 'When should meals start?': 'Right away.', 'How often?': 'Specific dates', 'Which dates? (only for specific dates)': 'Jan 18, 20 and 22' });
    expect(r['Public note']).toBe('Meals start: Right away. How often: Specific dates (Jan 18, 20 and 22).');
  });

  it('decision 19 is unchanged for other request kinds (Moving keeps a blank public draft with one date)', () => {
    const gp = mealsWardWithLeader();
    const form = gp.fakes.forms.get(sysOf(gp).rowsOf('Request files').find((f) => f['Category id'] === 'moving')['Form id']);
    gp.gpOnRequestSubmit(formSubmitEvent(form, { Name: 'Sister Requester', 'Phone or email': '555-0142', 'Moving in or out': 'Moving in', Note: 'Two rooms' }));
    const file = sysOf(gp).rowsOf('Request files').find((f) => f['Category id'] === 'moving');
    const t = gp.table_(gp.fakes.spreadsheets.get(file['Sheet id']).getSheetByName('Requests'));
    t.update(t.rows()[0], { 'Make opportunity': true });
    gp.gpBegin_();
    gp.makeDraftsFromRequests_();
    const p = postsOf(gp).find((x) => x.Category === 'moving-help');
    expect(p).toMatchObject({ Title: 'Moving', 'Public note': '', 'Private details': '', Allergies: '', 'Family emails': '', 'Coordinate with': '' });
    expect(gp.fakes.spreadsheet.rowsOf('Slots').filter((s) => s['Post id'] === p['Post id'])).toHaveLength(1);
  });

  it('a meals kind whose Opportunity category names one id uses it for both paths', () => {
    const gp = mealsWardWithLeader();
    const c = gp.serviceTab_('Categories');
    c.update(c.find('Id', 'meal-request'), { 'Opportunity category': 'meals-new-moms' });
    gp.gpBegin_();
    expect(draftFrom(gp, HARDSHIP_ANSWERS).Category).toBe('meals-new-moms');
  });
});

describe('task 8: zero-slot drafts', () => {
  it('a draft may be saved with no dates; publishing needs one', () => {
    const gp = mealsWardWithLeader();
    const p = draftFrom(gp, BABY_ANSWERS);
    const k = linkFor(gp, COORD1);
    const post = { postId: p['Post id'], organization: 'Relief Society', category: 'meals-new-moms', title: p.Title, audiences: ['Sisters'], publicNote: '', privateDetails: p['Private details'], cutoffHours: 24, slots: [] };
    expect(plain(gp.apiSavePost_({ k, mode: 'draft', post })).ok).toBe(true);
    const pub = plain(gp.apiSavePost_({ k, mode: 'publish', post }));
    expect(pub.ok).toBe(false);
    expect(pub.fields.slots).toBe('Add at least one date.');
    const withDate = { ...post, slots: [{ date: '2026-12-10', start: '17:30', end: '', role: 'Bring a meal', needed: 1 }] };
    expect(plain(gp.apiSavePost_({ k, mode: 'publish', post: withDate })).ok).toBe(true);
  });
});

describe('task 5: Show on Serve', () => {
  function published(gp, show) {
    const p = draftFrom(gp, BABY_ANSWERS);
    const k = linkFor(gp, COORD1);
    const post = { postId: p['Post id'], organization: 'Relief Society', category: 'meals-new-moms', title: p.Title, audiences: ['Sisters'], publicNote: '', privateDetails: '', cutoffHours: 24,
      slots: [{ date: '2026-12-05', start: '17:30', end: '', role: 'Bring a meal', needed: 2 }] };
    expect(plain(gp.apiSavePost_({ k, mode: 'publish', post })).ok).toBe(true);
    if (show !== undefined) gp.apiSetShowOnServe_({ k, postId: p['Post id'], show });
    gp.gpBegin_();
    return { p: postsOf(gp).find((x) => x['Post id'] === p['Post id']), k };
  }

  it('a hidden post is off Serve, Other ways to serve and Needs help soon; its own link works', () => {
    const gp = mealsWardWithLeader();
    const { p } = published(gp);
    expect(p['Show on Serve']).toBe('No'); // publishing keeps the draft's No
    expect(plain(gp.apiServe_()).posts.map((x) => x.publicId)).not.toContain(p['Public id']);
    const d = gp.volunteerData_();
    expect(plain(gp.otherWays_(gp.settings_(), d, 'nothing')).map((x) => x.title)).not.toContain(p.Title);
    expect(plain(gp.needsHelpRows_(gp.settings_())).map((x) => x.postId)).not.toContain(p['Post id']);
    const direct = plain(gp.apiPost_(p['Public id']));
    expect(direct.ok).toBe(true);
    expect(direct.post.title).toBe('Meals for the Sample family');
    // And anyone with the link can sign up.
    expect(plain(gp.apiSignup_({ publicId: p['Public id'], slotId: gp.fakes.spreadsheet.rowsOf('Slots').find((s) => s['Post id'] === p['Post id'])['Slot id'], name: 'Sister Minister', email: 'sister.minister@example.test' })).ok).toBe(true);
  });

  it('setShowOnServe shows it everywhere and ticks Shown on portal (who and when); hiding unticks it', () => {
    const gp = mealsWardWithLeader();
    const { p, k } = published(gp);
    gp.fakes.setNow('2026-12-02 09:30');
    const r = plain(gp.apiSetShowOnServe_({ k, postId: p['Post id'], show: true }));
    expect(r.ok).toBe(true);
    expect(r.showOnServe).toBe(true);
    expect(r.progress.find((x) => x.key === 'shown_on_portal')).toEqual({ key: 'shown_on_portal', label: 'Shown on portal', done: true, by: 'Sister Meals', at: '2026-12-02 09:30' });
    gp.gpBegin_();
    expect(plain(gp.apiServe_()).posts.map((x) => x.publicId)).toContain(p['Public id']);
    expect(plain(gp.needsHelpRows_(gp.settings_())).map((x) => x.postId)).toContain(p['Post id']);
    const off = plain(gp.apiSetShowOnServe_({ k, postId: p['Post id'], show: false }));
    expect(off.showOnServe).toBe(false);
    expect(off.progress.find((x) => x.key === 'shown_on_portal').done).toBe(false);
    gp.gpBegin_();
    expect(plain(gp.apiServe_()).posts.map((x) => x.publicId)).not.toContain(p['Public id']);
  });

  it('savePost showOnServe works too; a new post is shown by default; an edit without it keeps it', () => {
    const gp = mealsWardWithLeader();
    const k = linkFor(gp, COORD1);
    const post = { organization: 'Relief Society', category: 'meals-hardship', title: 'Meals for a neighbor', audiences: ['Sisters'], publicNote: '', privateDetails: '', cutoffHours: 24,
      slots: [{ date: '2026-12-06', start: '', end: '', role: 'Bring a meal', needed: 1 }] };
    const made = plain(gp.apiSavePost_({ k, mode: 'publish', post }));
    expect(made.ok).toBe(true);
    const row = () => postsOf(gp).find((x) => x['Post id'] === made.postId);
    expect(row()['Show on Serve']).toBe('Yes');
    expect(plain(gp.apiSavePost_({ k, mode: 'publish', post: { ...post, postId: made.postId, showOnServe: false } })).ok).toBe(true);
    expect(row()['Show on Serve']).toBe('No');
    expect(plain(gp.apiSavePost_({ k, mode: 'publish', post: { ...post, postId: made.postId, title: 'Meals for a neighbour' } })).ok).toBe(true);
    expect(row()['Show on Serve']).toBe('No');
  });

  it('only editors may change it', () => {
    const gp = mealsWardWithLeader();
    const { p } = published(gp);
    const eq = linkFor(gp, 'brother.sample@example.test');
    expect(plain(gp.apiSetShowOnServe_({ k: eq, postId: p['Post id'], show: true }))).toEqual({ ok: false, error: "You can't change this opportunity." });
  });
});

describe('task 6: the progress checklist', () => {
  it('setProgress records who and when; listPosts and getPost answer as the contract says', () => {
    const gp = mealsWardWithLeader();
    const p = draftFrom(gp, BABY_ANSWERS);
    const k = linkFor(gp, COORD1);
    gp.fakes.setNow('2026-12-01 11:15');
    const r = plain(gp.apiSetProgress_({ k, postId: p['Post id'], key: 'parents_reviewed', done: true }));
    expect(r.ok).toBe(true);
    expect(r.progress).toEqual([
      { key: 'parents_reviewed', label: 'Parents reviewed', done: true, by: 'Sister Meals', at: '2026-12-01 11:15' },
      { key: 'sent_ministering', label: 'Sent to ministering sisters', done: false, by: '', at: '' },
      { key: 'shown_on_portal', label: 'Shown on portal', done: false, by: '', at: '' },
      { key: 'ward_email', label: 'Ward email sent', done: false, by: '', at: '' },
      { key: 'discord', label: 'Posted on Discord', done: false, by: '', at: '' },
    ]);
    const listed = plain(gp.apiListPosts_({ k })).posts.find((x) => x.postId === p['Post id']);
    expect(listed).toMatchObject({
      showOnServe: false,
      picture: '',
      isMeal: true,
      meal: { allergies: 'No peanuts', likes: 'Soups, Mexican', serves: '2 adults, 3 kids', dropoffWindow: '5:30-6:30 pm', dropoff: 'Quiet', coordinateWith: 'Anna and Ben' },
      familyEmails: ['anna.sample@example.test', 'ben.sample@example.test'],
      slots: [],
    });
    expect(listed.progress[0].done).toBe(true);
    const got = plain(gp.apiGetPost_({ k, postId: p['Post id'] })).post;
    expect(got).toMatchObject({ showOnServe: false, isMeal: true, familyEmails: ['anna.sample@example.test', 'ben.sample@example.test'] });
    expect(got.progress).toEqual(listed.progress);
    // Untick.
    expect(plain(gp.apiSetProgress_({ k, postId: p['Post id'], key: 'parents_reviewed', done: false })).progress[0]).toEqual({ key: 'parents_reviewed', label: 'Parents reviewed', done: false, by: '', at: '' });
  });

  it('shown_on_portal cannot be set by hand; unknown keys and non-editors are refused', () => {
    const gp = mealsWardWithLeader();
    const p = draftFrom(gp, BABY_ANSWERS);
    const k = linkFor(gp, COORD1);
    expect(plain(gp.apiSetProgress_({ k, postId: p['Post id'], key: 'shown_on_portal', done: true })).ok).toBe(false);
    expect(plain(gp.apiSetProgress_({ k, postId: p['Post id'], key: 'nope', done: true }))).toEqual({ ok: false, error: 'That checklist step was not found.' });
    const eq = linkFor(gp, 'brother.sample@example.test');
    expect(plain(gp.apiSetProgress_({ k: eq, postId: p['Post id'], key: 'ward_email', done: true })).ok).toBe(false);
  });

  it('a leader who can see but not edit gets no familyEmails; a post with no meal fields has no meal', () => {
    const gp = mealsWardWithLeader();
    const p = draftFrom(gp, BABY_ANSWERS);
    const k = linkFor(gp, COORD1);
    gp.apiSavePost_({ k, mode: 'publish', post: { postId: p['Post id'], organization: 'Relief Society', category: 'meals-new-moms', title: p.Title, audiences: ['Sisters'], publicNote: '', privateDetails: '', cutoffHours: 24,
      slots: [{ date: '2026-12-05', start: '', end: '', role: 'Bring a meal', needed: 1 }] } });
    gp.gpBegin_();
    // Brother Sample (Elders Quorum, ward council) sees every opportunity but doesn't edit meals.
    const seen = plain(gp.apiListPosts_({ k: linkFor(gp, 'brother.sample@example.test') })).posts.find((x) => x.postId === p['Post id']);
    expect(seen.canEdit).toBe(false);
    expect(seen).not.toHaveProperty('familyEmails');
    expect(seen.meal.allergies).toBe('No peanuts');
    const plainPost = { organization: 'Relief Society', category: 'meals', title: 'Soup night', audiences: ['Sisters'], publicNote: '', privateDetails: '', cutoffHours: 24, slots: [{ date: '2026-12-06', start: '', end: '', role: 'Help', needed: 1 }] };
    const made = plain(gp.apiSavePost_({ k: linkFor(gp, 'sister.example@example.test'), mode: 'draft', post: plainPost }));
    const other = plain(gp.apiListPosts_({ k: linkFor(gp, 'sister.example@example.test') })).posts.find((x) => x.postId === made.postId);
    expect(other).not.toHaveProperty('meal');
    expect(other).toMatchObject({ isMeal: false, showOnServe: true, familyEmails: [] });
  });

  it('savePost takes meal fields and family emails, checked', () => {
    const gp = mealsWardWithLeader();
    const p = draftFrom(gp, BABY_ANSWERS);
    const k = linkFor(gp, COORD1);
    const base = { postId: p['Post id'], organization: 'Relief Society', category: 'meals-new-moms', title: p.Title, audiences: ['Sisters'], publicNote: '', privateDetails: '', cutoffHours: 24, slots: [] };
    const bad = plain(gp.apiSavePost_({ k, mode: 'draft', post: { ...base, familyEmails: 'anna.sample@example.test, not an address', meal: { dropoff: 'Loud', allergies: 'x'.repeat(301) } } }));
    expect(bad.ok).toBe(false);
    expect(Object.keys(bad.fields).sort()).toEqual(['familyEmails', 'meal.allergies', 'meal.dropoff']);
    const ok = plain(gp.apiSavePost_({ k, mode: 'draft', post: { ...base, familyEmails: ['Anna.Sample@example.test', 'grandma@example.test'], meal: { allergies: 'Shellfish', dropoff: 'Regular' } } }));
    expect(ok.ok).toBe(true);
    const row = postsOf(gp).find((x) => x['Post id'] === p['Post id']);
    expect(row).toMatchObject({ 'Family emails': 'anna.sample@example.test, grandma@example.test', Allergies: 'Shellfish', 'Drop-off': 'Regular', 'Food likes': 'Soups, Mexican' });
  });
});

// ---------- task 9: a picture for each category; the public post's meal fields ----------

describe('task 9: Categories Picture on serve, post, listPosts and getPost', () => {
  const PIC = 'https://rb1.example.test/links/meals-baby.jpg';

  function shownMealPost(picture) {
    const gp = mealsWardWithLeader();
    const c = gp.serviceTab_('Categories');
    c.update(c.find('Id', 'meals-new-moms'), { Picture: picture });
    gp.gpBegin_();
    const p = draftFrom(gp, BABY_ANSWERS);
    const k = linkFor(gp, COORD1);
    gp.apiSavePost_({ k, mode: 'publish', post: { postId: p['Post id'], organization: 'Relief Society', category: 'meals-new-moms', title: p.Title, audiences: ['Sisters'], publicNote: p['Public note'], privateDetails: p['Private details'], cutoffHours: 24, showOnServe: true,
      slots: [{ date: '2026-12-05', start: '17:30', end: '', role: 'Bring a meal', needed: 2 }] } });
    gp.gpBegin_();
    return { gp, p: postsOf(gp).find((x) => x['Post id'] === p['Post id']), k };
  }

  it('a valid https picture is answered everywhere; the post page also gets the meal fields and no private details', () => {
    const { gp, p, k } = shownMealPost(PIC);
    expect(plain(gp.apiServe_()).posts.find((x) => x.publicId === p['Public id']).picture).toBe(PIC);
    const pub = plain(gp.apiPost_(p['Public id'])).post;
    expect(pub.picture).toBe(PIC);
    expect(pub.meal).toEqual({ allergies: 'No peanuts', likes: 'Soups, Mexican', serves: '2 adults, 3 kids', dropoffWindow: '5:30-6:30 pm', dropoff: 'Quiet', coordinateWith: 'Anna and Ben' });
    expect(pub.publicNote).toBe('Meals start: 3 days after baby comes. How often: Every other day.');
    const json = JSON.stringify(pub);
    for (const bad of ['Example Lane', '555-01', 'anna.sample@', 'Family']) expect(json).not.toContain(bad);
    expect(plain(gp.apiListPosts_({ k })).posts.find((x) => x.postId === p['Post id']).picture).toBe(PIC);
    expect(plain(gp.apiGetPost_({ k, postId: p['Post id'] })).post.picture).toBe(PIC);
  });

  it('blank, http or quoted pictures are ignored and Check health names the category', () => {
    for (const bad of ['http://rb1.example.test/x.jpg', 'https://rb1.example.test/a b.jpg', 'javascript:alert(1)', 'https://x.example.test/"onerror=']) {
      const { gp, p } = shownMealPost(bad);
      expect(plain(gp.apiPost_(p['Public id'])).post.picture).toBe('');
      expect(plain(gp.apiServe_()).posts.find((x) => x.publicId === p['Public id']).picture).toBe('');
      expect(gp.gpMenuCheckHealth()).toContain('PROBLEM Meals for New Moms Picture must be a full https address of a picture (no spaces or quotes); it is ignored.');
    }
    const { gp, p } = shownMealPost('');
    expect(plain(gp.apiPost_(p['Public id'])).post.picture).toBe('');
    expect(gp.gpMenuCheckHealth().some((l) => l.includes('Picture'))).toBe(false);
  });

  it('a post with no meal fields has no meal on its public page', () => {
    const gp = loadPortal({ seed: true });
    seedPostPlain(gp);
    gp.gpBegin_();
    const pub = plain(gp.apiPost_('pubmeals01')).post;
    expect(pub).not.toHaveProperty('meal');
    expect(pub.picture).toBe('');
  });
});
