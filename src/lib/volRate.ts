// D1-backed rate limits for the public volunteer forms (they send email to any address typed
// in, so they must not become a way to spam strangers). Events are pruned by the hourly cron.
import type { Env } from '../types';
import { newId } from './ids';

// Records one event in `bucket` and returns true when the bucket already had `max` or more
// events in the last `windowMinutes` (i.e. this one is over the limit).
export async function hitLimit(
  env: Env,
  wardId: string,
  bucket: string,
  max: number,
  windowMinutes: number,
  now: Date,
): Promise<boolean> {
  const since = new Date(now.getTime() - windowMinutes * 60_000).toISOString();
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM vol_rate_events WHERE ward_id = ? AND bucket = ? AND created_at > ?`,
  )
    .bind(wardId, bucket, since)
    .first<{ n: number }>();
  await env.DB.prepare(`INSERT INTO vol_rate_events (id, ward_id, bucket, created_at) VALUES (?, ?, ?, ?)`)
    .bind(newId('vre'), wardId, bucket, now.toISOString())
    .run();
  return (row?.n ?? 0) >= max;
}
