// One builder per email in spec §6.6. Builders only format: every URL is a parameter (they
// mint nothing) and every piece of user text is escaped. Plain, warm wording; no Church names.
// signupConfirmed, approved and reminder also carry discordText + volunteerId so deliver()
// can DM a connected, approved volunteer (spec §6.9).
import { esc } from './html';
import { safeHref } from './urls';
import type { OutgoingMessage } from './volMessages';

export interface EmailPost {
  orgName: string;
  title: string;
  publicUrl: string;
}

export interface OtherPost extends EmailPost {
  confirmed: number;
  needed: number;
}

function link(url: string, text: string): string {
  return `<a href="${esc(safeHref(url))}">${esc(text)}</a>`;
}

function button(url: string, text: string): string {
  return `<p style="margin:18px 0"><a href="${esc(safeHref(url))}" style="background:#1d3557;color:#fff;padding:10px 18px;border-radius:20px;text-decoration:none;display:inline-block">${esc(text)}</a></p>`;
}

function details(privateDetails: string | null): string {
  if (!privateDetails) return '';
  return `<div style="background:#f4f7fc;border:1px solid #dde3ed;border-radius:8px;padding:10px 14px;margin:12px 0">
    <strong>Details for volunteers</strong><br>${esc(privateDetails).replace(/\n/g, '<br>')}</div>`;
}

function wrap(body: string, footer?: string): string {
  return `<div style="font-family:Georgia,serif;color:#2c3a4a;line-height:1.55;max-width:560px">${body}
<p style="color:#8695a8;font-size:12px;margin-top:24px">${
    footer ??
    'Sent by Wardest for your ward&#39;s leaders. If you didn&#39;t expect this, you can ignore it.'
  }</p></div>`;
}

const VOLUNTEER_FOOTER =
  'You got this because someone signed up with this address. If that wasn&#39;t you, use the cancel link above and nothing more will be sent.';

function otherWays(posts: OtherPost[]): string {
  if (!posts.length) return '';
  return `<h3 style="color:#1d3557;font-size:16px;margin-top:22px">Other ways to serve</h3><ul>${posts
    .map(
      (p) => `<li>${esc(p.orgName)} · ${link(p.publicUrl, p.title)} <span style="color:#8695a8">(${p.confirmed} of ${p.needed} filled)</span></li>`,
    )
    .join('')}</ul>`;
}

function withdrawParagraph(withdrawUrl: string | null): string {
  if (!withdrawUrl) return '';
  return `<p><strong>This need is already met.</strong> The role filled up before your sign-up counted, so
    they have enough help. You're welcome to come anyway — more hands are always fine — or you can
    ${link(withdrawUrl, 'withdraw your offer')} with one click. Either way is fine.</p>`;
}

// ---------------------------------------------------------------- volunteer emails

export function verifyEmail(o: { to: string; name: string; post: EmailPost; verifyUrl: string }): OutgoingMessage {
  return {
    kind: 'vol_verify',
    to: o.to,
    subject: `${o.post.orgName}: please confirm your email — ${o.post.title}`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>Thanks for offering to help with <strong>${esc(o.post.title)}</strong> (${esc(o.post.orgName)}).
       Please confirm this is your email address. After that, one of the ward's leaders will
       confirm you, and we'll email you the details.</p>
       ${button(o.verifyUrl, 'Confirm my email')}
       <p style="color:#8695a8">Your sign-up waits until then; it won't count yet.</p>`,
    ),
  };
}

export function signupConfirmed(o: {
  to: string;
  volunteerId: string;
  wardId: string;
  name: string;
  post: EmailPost;
  when: string;
  roleName: string;
  bringing: string | null;
  privateDetails: string | null;
  cancelUrl: string;
  mySignupsUrl: string;
  overLimit: boolean;
  withdrawUrl: string | null;
  otherPosts: OtherPost[];
}): OutgoingMessage {
  const bring = o.bringing ? `<br>You're bringing: ${esc(o.bringing)}` : '';
  return {
    kind: 'vol_confirmed',
    to: o.to,
    volunteerId: o.volunteerId,
    wardId: o.wardId,
    subject: `${o.post.orgName}: you're signed up — ${o.post.title}`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>You're signed up. Thank you!</p>
       <p><strong>${esc(o.post.title)}</strong> · ${esc(o.post.orgName)}<br>
       ${esc(o.when)} · ${esc(o.roleName)}${bring}</p>
       ${details(o.privateDetails)}
       ${o.overLimit ? withdrawParagraph(o.withdrawUrl) : ''}
       <p>Can't make it after all? ${link(o.cancelUrl, 'Cancel this sign-up')}.
       See everything you've signed up for: ${link(o.mySignupsUrl, 'My sign-ups')}.</p>
       ${otherWays(o.otherPosts)}`,
      VOLUNTEER_FOOTER,
    ),
    discordText:
      `You're signed up: ${o.post.title} (${o.post.orgName})\n${o.when} · ${o.roleName}` +
      (o.bringing ? `\nYou're bringing: ${o.bringing}` : '') +
      (o.privateDetails ? `\nDetails: ${o.privateDetails}` : '') +
      (o.overLimit ? `\nThis need is already met; you can withdraw from the link in your email.` : '') +
      `\nMy sign-ups: ${o.mySignupsUrl}`,
  };
}

export interface ApprovedSignup {
  post: EmailPost;
  when: string;
  roleName: string;
  privateDetails: string | null;
  cancelUrl: string;
  overLimit: boolean;
  withdrawUrl: string | null;
}

export function approved(o: {
  to: string;
  volunteerId: string;
  wardId: string;
  name: string;
  wardName: string;
  mySignupsUrl: string;
  signups: ApprovedSignup[];
}): OutgoingMessage {
  const items = o.signups
    .map(
      (s) => `<div style="border-top:1px solid #dde3ed;padding-top:10px;margin-top:10px">
        <p><strong>${esc(s.post.title)}</strong> · ${esc(s.post.orgName)}<br>${esc(s.when)} · ${esc(s.roleName)}</p>
        ${details(s.privateDetails)}
        ${s.overLimit ? withdrawParagraph(s.withdrawUrl) : ''}
        <p>${link(s.cancelUrl, 'Cancel this sign-up')}</p></div>`,
    )
    .join('');
  return {
    kind: 'vol_approved',
    to: o.to,
    volunteerId: o.volunteerId,
    wardId: o.wardId,
    subject: `${o.wardName}: you're confirmed as a volunteer`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>A leader in ${esc(o.wardName)} has confirmed you, so you won't need approval again here.
       ${o.signups.length ? 'You are signed up for:' : ''}</p>
       ${items}
       <p>See everything you've signed up for: ${link(o.mySignupsUrl, 'My sign-ups')}.</p>`,
      VOLUNTEER_FOOTER,
    ),
    discordText:
      `${o.wardName}: you're confirmed as a volunteer.` +
      o.signups
        .map(
          (s) =>
            `\n• ${s.post.title} (${s.post.orgName}) — ${s.when} · ${s.roleName}` +
            (s.privateDetails ? `\n  Details: ${s.privateDetails}` : ''),
        )
        .join('') +
      `\nMy sign-ups: ${o.mySignupsUrl}`,
  };
}

// After the public form: verified, waiting for a leader to confirm them.
export function signupWaiting(o: { to: string; name: string; post: EmailPost; when: string; roleName: string }): OutgoingMessage {
  return {
    kind: 'vol_waiting',
    to: o.to,
    subject: `${o.post.orgName}: thanks for signing up — ${o.post.title}`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>You're signed up for <strong>${esc(o.post.title)}</strong> · ${esc(o.when)} · ${esc(o.roleName)}.
       A leader will confirm you shortly, and we'll email you the details when they do.</p>`,
      VOLUNTEER_FOOTER,
    ),
  };
}

// After the public form: this address is already on that role.
export function alreadySignedUp(o: {
  to: string;
  name: string;
  post: EmailPost;
  when: string;
  roleName: string;
  mySignupsUrl: string | null;
}): OutgoingMessage {
  return {
    kind: 'vol_already',
    to: o.to,
    subject: `${o.post.orgName}: you're already signed up — ${o.post.title}`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>You're already signed up for <strong>${esc(o.post.title)}</strong> · ${esc(o.when)} · ${esc(o.roleName)},
       so there's nothing more to do.</p>
       ${o.mySignupsUrl ? `<p>See or cancel your sign-ups: ${link(o.mySignupsUrl, 'My sign-ups')}.</p>` : ''}`,
      VOLUNTEER_FOOTER,
    ),
  };
}

// After the public form, for an address the leaders declined. Plain wording, no reason given.
export function contactLeaders(o: { to: string; name: string; wardName: string }): OutgoingMessage {
  return {
    kind: 'vol_contact_leaders',
    to: o.to,
    subject: `${o.wardName}: about your volunteer sign-up`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>Thank you for offering to help. To sign up, please contact your ward's leaders.</p>`,
    ),
  };
}

export function declined(o: { to: string; name: string; wardName: string }): OutgoingMessage {
  return {
    kind: 'vol_declined',
    to: o.to,
    subject: `${o.wardName}: about your volunteer sign-up`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>Thank you for offering to help. The ward's leaders weren't able to confirm this email
       address, so your sign-up hasn't been added. If you think this is a mistake, please speak
       with one of the ward's leaders.</p>`,
    ),
  };
}

export function reminder(o: {
  to: string;
  volunteerId: string;
  wardId: string;
  name: string;
  post: EmailPost;
  when: string;
  roleName: string;
  bringing: string | null;
  privateDetails: string | null;
  otherNames: string[];
  cancelUrl: string;
  mySignupsUrl: string;
}): OutgoingMessage {
  const others = o.otherNames.length
    ? `<p>Also helping: ${o.otherNames.map(esc).join(', ')}</p>`
    : '';
  return {
    kind: 'vol_reminder',
    to: o.to,
    volunteerId: o.volunteerId,
    wardId: o.wardId,
    subject: `${o.post.orgName}: reminder for tomorrow — ${o.post.title}`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>A friendly reminder that you're helping tomorrow:</p>
       <p><strong>${esc(o.post.title)}</strong> · ${esc(o.post.orgName)}<br>
       ${esc(o.when)} · ${esc(o.roleName)}${o.bringing ? `<br>You're bringing: ${esc(o.bringing)}` : ''}</p>
       ${details(o.privateDetails)}
       ${others}
       <p>Can't make it? ${link(o.cancelUrl, 'Let them know by cancelling')}. ${link(o.mySignupsUrl, 'My sign-ups')}</p>`,
      VOLUNTEER_FOOTER,
    ),
    discordText:
      `Reminder for tomorrow: ${o.post.title} (${o.post.orgName})\n${o.when} · ${o.roleName}` +
      (o.bringing ? `\nYou're bringing: ${o.bringing}` : '') +
      (o.privateDetails ? `\nDetails: ${o.privateDetails}` : '') +
      (o.otherNames.length ? `\nAlso helping: ${o.otherNames.join(', ')}` : '') +
      `\nCan't make it? ${o.cancelUrl}`,
  };
}

export function roleChanged(o: {
  to: string;
  name: string;
  post: EmailPost;
  roleName: string;
  oldWhen: string;
  newWhen: string;
  mySignupsUrl: string;
}): OutgoingMessage {
  return {
    kind: 'vol_role_changed',
    to: o.to,
    subject: `${o.post.orgName}: time changed — ${o.post.title}`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>The time for <strong>${esc(o.roleName)}</strong> on <strong>${esc(o.post.title)}</strong> has changed.</p>
       <p>Was: ${esc(o.oldWhen)}<br>Now: <strong>${esc(o.newWhen)}</strong></p>
       <p>If the new time doesn't work, you can cancel from ${link(o.mySignupsUrl, 'My sign-ups')}.</p>`,
      VOLUNTEER_FOOTER,
    ),
  };
}

export function signupRemoved(o: {
  to: string;
  name: string;
  post: EmailPost;
  when: string;
  roleName: string;
  reason: 'removed' | 'deleted';
}): OutgoingMessage {
  const why =
    o.reason === 'deleted'
      ? 'The organizers have taken this off the schedule, so your help is no longer needed for it.'
      : 'The organizers have taken you off this one, so you are no longer expected.';
  return {
    kind: 'vol_removed',
    to: o.to,
    subject: `${o.post.orgName}: no longer needed — ${o.post.title}`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p><strong>${esc(o.post.title)}</strong> · ${esc(o.when)} · ${esc(o.roleName)}</p>
       <p>${why} Thank you for offering.</p>`,
      VOLUNTEER_FOOTER,
    ),
  };
}

export function accessLink(o: { to: string; wardName: string; accessUrl: string }): OutgoingMessage {
  return {
    kind: 'vol_access',
    to: o.to,
    subject: `${o.wardName}: your sign-ups link`,
    html: wrap(
      `<p>Here's your link to see and manage your volunteer sign-ups in ${esc(o.wardName)}:</p>
       ${button(o.accessUrl, 'Open my sign-ups')}
       <p style="color:#8695a8">Keep it to yourself; anyone with it can see and cancel your sign-ups.</p>`,
    ),
  };
}

// ---------------------------------------------------------------- organizer (approver) emails

export function approverWaiting(o: {
  to: string;
  volunteerName: string;
  volunteerEmail: string;
  posts: Array<EmailPost & { manageUrl: string }>;
}): OutgoingMessage {
  const first = o.posts[0];
  return {
    kind: 'approver_waiting',
    to: o.to,
    subject: `${first?.orgName ?? 'Volunteers'}: someone new is waiting for approval`,
    html: wrap(
      `<p><strong>${esc(o.volunteerName)}</strong> (${esc(o.volunteerEmail)}) confirmed their email and
       is waiting for a leader to approve them. Please check them against the ward's directory, then
       approve or decline. One approval covers the whole ward.</p>
       <ul>${o.posts.map((p) => `<li>${esc(p.orgName)} · ${link(p.manageUrl, p.title)}</li>`).join('')}</ul>`,
    ),
  };
}

export function approverNudge48h(o: {
  to: string;
  post: EmailPost;
  when: string;
  waitingNames: string[];
  manageUrl: string;
}): OutgoingMessage {
  return {
    kind: 'approver_nudge',
    to: o.to,
    subject: `${o.post.orgName}: still waiting for approval — ${o.post.title}`,
    html: wrap(
      `<p><strong>${esc(o.post.title)}</strong> is on ${esc(o.when)}, and these volunteers are still
       waiting for approval: ${o.waitingNames.map(esc).join(', ')}.</p>
       <p>They don't count toward the total until someone approves or declines them.</p>
       ${button(o.manageUrl, 'Review volunteers')}`,
    ),
  };
}

export function approverFilled(o: { to: string; post: EmailPost; manageUrl: string }): OutgoingMessage {
  return {
    kind: 'approver_filled',
    to: o.to,
    subject: `${o.post.orgName}: fully filled — ${o.post.title}`,
    html: wrap(
      `<p>Good news: every role on <strong>${esc(o.post.title)}</strong> is filled.</p>
       <p>${link(o.manageUrl, 'See who is coming')}</p>`,
    ),
  };
}

export function approverCancelled(o: {
  to: string;
  post: EmailPost;
  when: string;
  roleName: string;
  volunteerName: string;
  urgent: boolean;
  stillFull: boolean;
  confirmed: number;
  needed: number;
  manageUrl: string;
}): OutgoingMessage {
  const status = o.stillFull
    ? `The role is still full (${o.confirmed} of ${o.needed}).`
    : `You're now short: ${o.confirmed} of ${o.needed} filled.`;
  const subject = o.stillFull
    ? `${o.post.orgName}: a volunteer cancelled (still full) — ${o.post.title}`
    : o.urgent
      ? `${o.post.orgName}: URGENT, you're now short — ${o.post.title}`
      : `${o.post.orgName}: a volunteer cancelled, you're now short — ${o.post.title}`;
  return {
    kind: 'approver_cancelled',
    to: o.to,
    subject,
    html: wrap(
      `<p><strong>${esc(o.volunteerName)}</strong> cancelled <strong>${esc(o.roleName)}</strong> on
       ${esc(o.when)} for <strong>${esc(o.post.title)}</strong>.</p>
       <p>${o.urgent && !o.stillFull ? '<strong>This is after your cancel cutoff.</strong> ' : ''}${esc(status)}</p>
       ${button(o.manageUrl, 'Open the post')}`,
    ),
  };
}
