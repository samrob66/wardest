// Emails about members' requests for help (spec §6). Builders only format; every piece of user
// text is escaped. The leaders' notice NEVER carries the request's details (name, email, phone,
// note, moving or Christmas answers): only that one came in, its category, and a link.
import { esc } from './html';
import { safeHref } from './urls';
import type { OutgoingMessage } from './volMessages';

function button(url: string, text: string): string {
  return `<p style="margin:18px 0"><a href="${esc(safeHref(url))}" style="background:#1d3557;color:#fff;padding:10px 18px;border-radius:20px;text-decoration:none;display:inline-block">${esc(text)}</a></p>`;
}

function wrap(body: string, footer: string): string {
  return `<div style="font-family:Georgia,serif;color:#2c3a4a;line-height:1.55;max-width:560px">${body}
<p style="color:#8695a8;font-size:12px;margin-top:24px">${footer}</p></div>`;
}

const REQUESTER_FOOTER = 'You got this because someone asked your ward for help with this address. If that wasn&#39;t you, you can ignore it.';
const LEADER_FOOTER = 'Sent by WardForward to the people who help with these requests. Please keep the details in person.';

export function requestVerify(o: {
  to: string; name: string; wardName: string; categoryName: string; verifyUrl: string; ref: string; wardId: string;
}): OutgoingMessage {
  return {
    kind: 'req_verify',
    to: o.to,
    ref: o.ref,
    wardId: o.wardId,
    subject: `${o.wardName}: please confirm your request`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>Thanks for reaching out (${esc(o.categoryName)}). Please confirm this is your email address so
       your request reaches the right people. The link works for 48 hours.</p>
       ${button(o.verifyUrl, 'Confirm my request')}
       <p style="color:#8695a8">Nothing is sent to anyone until you confirm.</p>`,
      REQUESTER_FOOTER,
    ),
  };
}

export function requestAck(o: { to: string; name: string; wardName: string; categoryName: string; ref: string; wardId: string }): OutgoingMessage {
  return {
    kind: 'req_ack',
    to: o.to,
    ref: o.ref,
    wardId: o.wardId,
    subject: `${o.wardName}: we've received your request`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>Thank you, we've received your request (${esc(o.categoryName)}). Someone will reach out to you
       soon, and you can talk through the details in person.</p>`,
      REQUESTER_FOOTER,
    ),
  };
}

// To the category's people. Deliberately detail-free.
export function requestNotice(o: { to: string; categoryName: string; url: string; ref: string; wardId: string }): OutgoingMessage {
  return {
    kind: 'req_notice',
    to: o.to,
    ref: o.ref,
    wardId: o.wardId,
    subject: `New request: ${o.categoryName}`,
    html: wrap(
      `<p>A new request came in: <strong>${esc(o.categoryName)}</strong>. Open it in WardForward.</p>
       ${button(o.url, 'Open the request')}`,
      LEADER_FOOTER,
    ),
  };
}

// The leader's optional short message when a request is marked done or declined.
export function requestClosed(o: { to: string; name: string; wardName: string; message: string; ref: string; wardId: string }): OutgoingMessage {
  return {
    kind: 'req_closed',
    to: o.to,
    ref: o.ref,
    wardId: o.wardId,
    subject: `${o.wardName}: about your request`,
    html: wrap(
      `<p>Hi ${esc(o.name)},</p>
       <p>${esc(o.message).replace(/\n/g, '<br>')}</p>`,
      REQUESTER_FOOTER,
    ),
  };
}
