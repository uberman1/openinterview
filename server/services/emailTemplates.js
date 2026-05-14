
import { formatMeetingTime } from './timeFormatter.js';

// Helper to escape HTML to prevent XSS in email content
const esc = (s = "") => s.replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
}[c]));

const BASE_STYLE = `
  body { background:#f7f7f7; font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif; color:#141414; }
  .card { max-width: 640px; margin: 32px auto; background:#fff; border:1px solid #e5e5e5; border-radius:12px; overflow:hidden; }
  .header, .footer { padding:20px 24px; border-bottom:1px solid #e5e5e5; }
  .footer { border-top:1px solid #e5e5e5; border-bottom:none; text-align:center; color:#141414; font-size:12px; background:#fff; }
  .footer a { color:#141414; text-decoration: underline; font-weight: 600; }
  .content { padding:24px; }
  .title { font-weight:900; font-size:24px; margin:0 0 16px 0; line-height:1.2; }
  .subtitle { font-size: 16px; color: #374151; margin-bottom: 24px; }
  .msg { background:#f7f7f7; border-radius:10px; padding:16px; color:#374151; font-style:italic; margin-bottom: 24px; }
  .btn { display:inline-block; padding:12px 24px; border-radius:8px; background:#141414; color:#fff !important; text-decoration:none !important; font-weight:600; font-size: 14px; }
  .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .details-table td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
  .details-label { color: #6b7280; width: 140px; font-size: 14px; }
  .details-value { font-weight: 500; font-size: 14px; }
  .muted { color:#6b7280; font-size: 12px; }
`;

function wrapHtml(content) {
  const baseUrl = (process.env.BASE_URL || 'https://openinterview.me').replace(/\/$/, '');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>${BASE_STYLE}</style>
</head>
<body>
  <div class="card">
    <div class="header"><strong>OpenInterview.me</strong></div>
    <div class="content">
      ${content}
    </div>
    <div class="footer" style="background:#ffffff; color:#141414; padding:20px 24px; border-top:1px solid #e5e5e5; text-align:center; font-size:12px;">
      Powered by <a href="${esc(baseUrl)}" style="color:#141414; text-decoration:underline; font-weight:600;">openinterview.me</a>
    </div>
  </div>
</body></html>`;
}

function primaryButton({ href, label }) {
  return `
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate; margin-top:24px;">
      <tr>
        <td bgcolor="#141414" style="background:#141414; border-radius:8px; padding:12px 24px;">
          <a href="${esc(href)}" target="_blank" style="display:inline-block; color:#ffffff !important; -webkit-text-fill-color:#ffffff; text-decoration:none !important; font-weight:600; font-size:14px; line-height:20px;">
            <span style="color:#ffffff !important; -webkit-text-fill-color:#ffffff; text-decoration:none !important;">${esc(label)}</span>
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function bookingRequestOwner({ ownerName, recruiterName, startTime, profileTitle, link, profileTimezone, recruiterTimezone, message }) {
  const subject = `New Interview Request: ${recruiterName}`;
  
  const { pretty, tzLabel } = formatMeetingTime({ startISO: startTime, tz: profileTimezone });
  
  let recruiterTimeInfo = '';
  if (recruiterTimezone) {
      const recT = formatMeetingTime({ startISO: startTime, tz: recruiterTimezone });
      recruiterTimeInfo = `<br/><span class="muted" style="font-size:12px">(Recruiter local time: ${esc(recT.pretty)} ${esc(recT.tzLabel)})</span>`;
  }

  const html = wrapHtml(`
    <h1 class="title">New Interview Request</h1>
    <p class="subtitle"><strong>${esc(recruiterName)}</strong> has requested an interview via <strong>${esc(profileTitle)}</strong>.</p>
    
    ${message ? `<div class="msg">"${esc(message)}"</div>` : ''}

    <table class="details-table">
      <tr>
        <td class="details-label">Recruiter</td>
        <td class="details-value">${esc(recruiterName)}</td>
      </tr>
      <tr>
        <td class="details-label">Requested Time</td>
        <td class="details-value">
          ${esc(pretty)}<br/>
          <span class="muted">(Profile timezone: ${esc(tzLabel)})</span>
          ${recruiterTimeInfo}
        </td>
      </tr>
    </table>

    ${primaryButton({ href: link, label: 'Manage Booking' })}
  `);
  return { subject, html };
}

export function profileInvite({ senderName, profileTitle, profileUrl, message }) {
  const subject = `${senderName} invited you to view their profile`;
  
  const html = wrapHtml(`
    <h1 class="title">You're Invited</h1>
    <p class="subtitle"><strong>${esc(senderName)}</strong> has invited you to view their profile <strong>${esc(profileTitle)}</strong> on OpenInterview.</p>
    
    ${message ? `<div class="msg">"${esc(message)}"</div>` : ''}

    ${primaryButton({ href: profileUrl, label: 'View Profile' })}
    
    <p class="muted" style="margin-top: 32px;">
      You received this email because ${esc(senderName)} wanted to share their professional profile with you.
    </p>
  `);
  return { subject, html };
}

export function bookingConfirmedRecruiter({ recruiterName, ownerName, startTime, profileTitle, icsAttached, cancelLink, recruiterTimezone, profileTimezone }) {
  const subject = `Interview Confirmed: ${ownerName}`;
  
  // Always get profile formatted time as fallback/reference
  const profileT = formatMeetingTime({ startISO: startTime, tz: profileTimezone });
  
  let timeDisplay = '';
  
  if (recruiterTimezone) {
    const recruiterT = formatMeetingTime({ startISO: startTime, tz: recruiterTimezone });
    timeDisplay = `
      ${esc(recruiterT.pretty)}<br/>
      <span class="muted">(${esc(recruiterT.tzLabel)})</span><br/>
      <span class="muted" style="font-size:11px">Profile Time: ${esc(profileT.pretty)} (${esc(profileT.tzLabel)})</span><br/>
      <span class="muted" style="font-size:11px">UTC: ${esc(profileT.utcPretty)}</span>
    `;
  } else {
    timeDisplay = `
      ${esc(profileT.pretty)}<br/>
      <span class="muted">(Profile timezone: ${esc(profileT.tzLabel)})</span><br/>
      <span class="muted" style="font-size:11px">UTC: ${esc(profileT.utcPretty)}</span>
    `;
  }

  const html = wrapHtml(`
    <h1 class="title">Interview Confirmed</h1>
    <p class="subtitle">Your interview with <strong>${esc(ownerName)}</strong> has been confirmed.</p>
    
    <table class="details-table">
      <tr>
        <td class="details-label">Candidate</td>
        <td class="details-value">${esc(ownerName)}</td>
      </tr>
      <tr>
        <td class="details-label">Time</td>
        <td class="details-value">${timeDisplay}</td>
      </tr>
    </table>

    ${icsAttached ? `<p class="msg">A calendar invitation (ICS) has been attached to this email.</p>` : ''}

    ${cancelLink ? `<p style="margin-top:16px; margin-bottom:0;"><a href="${esc(cancelLink)}" style="color:#ef4444; font-size:12px;">Cancel Booking</a></p>` : ''}
  `);
  return { subject, html };
}

export function bookingCancelled({ recipientName, role, startTime, profileTitle, recruiterTimezone, profileTimezone }) {
  const subject = `Interview Cancelled: ${profileTitle}`;
  
  const profileT = formatMeetingTime({ startISO: startTime, tz: profileTimezone });
  let timeDisplay = '';
  
  if (role === 'owner') {
    // Owner always sees profile timezone
    timeDisplay = `${esc(profileT.pretty)} (${esc(profileT.tzLabel)})`;
  } else {
    // Recruiter sees recruiter timezone if available
    if (recruiterTimezone) {
      const recruiterT = formatMeetingTime({ startISO: startTime, tz: recruiterTimezone });
      timeDisplay = `${esc(recruiterT.pretty)} (${esc(recruiterT.tzLabel)})`;
    } else {
      timeDisplay = `${esc(profileT.pretty)} (${esc(profileT.tzLabel)})`;
    }
  }

  const html = wrapHtml(`
    <h1 class="title">Interview Cancelled</h1>
    <p class="subtitle">The interview scheduled for <strong>${timeDisplay}</strong> has been cancelled.</p>
    
    <div class="msg">
      This booking is no longer active. If this was a mistake, please book a new time.
    </div>
  `);
  return { subject, html };
}
