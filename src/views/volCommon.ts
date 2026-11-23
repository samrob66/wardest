// Pieces shared by the leader, public and volunteer volunteer-post pages.

// "7 of 10 filled · 3 waiting" (over-filled reads "12 of 10 filled").
export function fillText(confirmed: number, needed: number, waiting: number): string {
  return `${confirmed} of ${needed} filled${waiting > 0 ? ` · ${waiting} waiting` : ''}`;
}

export function fillBar(confirmed: number, needed: number, waiting = 0): string {
  const pct = needed > 0 ? Math.min(100, Math.round((confirmed / needed) * 100)) : 0;
  const full = needed > 0 && confirmed >= needed;
  return `<div class="volbar" role="img" aria-label="${fillText(confirmed, needed, waiting)}">
    <div class="volbar-fill${full ? ' full' : ''}" style="width:${pct}%"></div></div>
    <span class="voltext">${fillText(confirmed, needed, waiting)}</span>`;
}

export const VOL_CSS = `<style>
  .volbar{height:10px;background:#e4e9f1;border-radius:6px;overflow:hidden;margin:.35rem 0 .15rem}
  .volbar-fill{height:100%;background:#4a6fa5}
  .volbar-fill.full{background:#2b6b43}
  .voltext{font-size:.85rem;color:#516074}
  .role{border-top:1px solid #e4e9f1;padding:.7rem 0}
  .role:first-of-type{border-top:none}
  .filled{color:#2b6b43;font-weight:700}
  .short{background:#fff7e6;border-color:#f0d9a8}
  .tag{font-size:.72rem;border-radius:20px;padding:.1rem .5rem;background:#eaf0fb;color:#4a6fa5}
  .tag.warn{background:#fff1d6;color:#8a5a00}
  .tag.ok{background:#e9f5ec;color:#2b6b43}
  details summary{cursor:pointer;color:#4a6fa5;margin:.4rem 0}
  .pre{white-space:pre-wrap}
</style>`;
