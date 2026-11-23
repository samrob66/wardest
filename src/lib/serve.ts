// The public Service Opportunities page's data (spec §5.1): a ward's open posts grouped by who
// they're for (brothers, sisters, youth, children). Counts only: never a name, an email or a
// post's private details. A post whose dates are all over (or that has no dates) is left out.
import type { Env } from '../types';
import { getPost, isDateOver, roleStartTime, whenText } from './volPosts';
import { AUDIENCES, AUDIENCE_LABELS, parseAudiences, type Audience } from './serviceCategories';
import { addDays, wardToday } from './wardTime';

export interface ServeEntry {
  publicId: string;
  title: string;
  orgName: string;
  categoryName: string | null;
  categoryIcon: string | null;
  when: string; // the next upcoming date (and start time)
  nextDate: string;
  confirmed: number; // summed over that date's roles
  needed: number;
  filled: boolean; // every role on every upcoming date is full
}

export interface ServeSection {
  audience: Audience;
  label: string;
  entries: ServeEntry[];
}

export async function listServePosts(env: Env, wardId: string, now: Date): Promise<ServeSection[]> {
  // Only posts with a date from yesterday on (ward-local) can still have an upcoming date; the
  // ward's older posts are never loaded. The exact "is over" test runs below, per date.
  const ward = await env.DB.prepare(`SELECT timezone FROM wards WHERE id = ?`).bind(wardId).first<{ timezone: string }>();
  if (!ward) return [];
  const since = addDays(wardToday(ward.timezone, now), -1);
  const rows = await env.DB.prepare(
    `SELECT p.id FROM vol_posts p
      WHERE p.ward_id = ? AND EXISTS (SELECT 1 FROM vol_dates d WHERE d.post_id = p.id AND d.ward_id = p.ward_id AND d.date >= ?)
      ORDER BY p.created_at, p.id`,
  )
    .bind(wardId, since)
    .all<{ id: string }>();
  const byAudience = new Map<Audience, ServeEntry[]>(AUDIENCES.map((a) => [a, []]));
  for (const r of rows.results ?? []) {
    const post = await getPost(env, wardId, r.id);
    if (!post) continue;
    const upcoming = post.dates.filter((d) => !isDateOver(d.date, post.ward.timezone, now));
    if (!upcoming.length) continue;
    const next = upcoming[0]!; // dates come sorted by date, start time
    const starts = next.roles.map((role) => roleStartTime(next, role)).filter((t) => t !== '00:00').sort();
    const start = next.start_time ?? starts[0] ?? null;
    const upcomingRoles = upcoming.flatMap((d) => d.roles);
    const entry: ServeEntry = {
      publicId: post.public_id,
      title: post.title,
      orgName: post.org_name,
      categoryName: post.category_name,
      categoryIcon: post.category_icon,
      when: whenText({ date: next.date, start_time: start }, { start_time: null, end_time: null }),
      nextDate: next.date + (start ?? ''),
      confirmed: next.roles.reduce((a, x) => a + x.confirmed, 0),
      needed: next.roles.reduce((a, x) => a + x.needed, 0),
      filled: upcomingRoles.length > 0 && upcomingRoles.every((x) => x.confirmed >= x.needed),
    };
    for (const a of parseAudiences(post.audiences)) byAudience.get(a)!.push(entry);
  }
  const out: ServeSection[] = [];
  for (const a of AUDIENCES) {
    const entries = byAudience.get(a)!;
    if (!entries.length) continue;
    // Open ones first (soonest first), fully filled ones at the bottom.
    entries.sort((x, y) => Number(x.filled) - Number(y.filled) || x.nextDate.localeCompare(y.nextDate) || x.title.localeCompare(y.title));
    out.push({ audience: a, label: AUDIENCE_LABELS[a], entries });
  }
  return out;
}
