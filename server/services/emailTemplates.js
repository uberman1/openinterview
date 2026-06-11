
import { formatMeetingTime } from './timeFormatter.js';

// Helper to escape HTML to prevent XSS in email content
const esc = (s = "") => s.replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
}[c]));

const BASE_STYLE = `
  body { margin:0; padding:0; background-color:#f4f4f5; font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif; color:#141414; }
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
  @media only screen and (max-width: 600px) {
    body, table, td, div, p, a { box-sizing: border-box !important; }
    .card { width: 100% !important; max-width: 100% !important; }
    .content { padding-left: 20px !important; padding-right: 20px !important; }
    p, td, div { overflow-wrap: break-word !important; word-break: normal !important; font-size: 16px !important; line-height: 1.55 !important; }
    h1 { font-size: 30px !important; line-height: 1.15 !important; }
    h2 { font-size: 24px !important; line-height: 1.2 !important; }
    img { max-width: 100% !important; height: auto !important; }
    .btn { max-width: 100% !important; box-sizing: border-box !important; white-space: normal !important; }
  }
`;

function wrapHtml(content) {
  const baseUrl = (process.env.BASE_URL || 'https://openinterview.me').replace(/\/$/, '');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<style>${BASE_STYLE}</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
  <div class="card">
    <div class="content">
      ${content}
    </div>
    <div class="footer" style="background:#ffffff; color:#141414; padding:20px 24px; border-top:1px solid #e5e5e5; text-align:center; font-size:12px;">
      <a href="${esc(baseUrl)}" style="display:inline-block;text-decoration:none;color:#111111;font-size:16px;font-weight:700;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">openinterview.me</a>
    </div>
  </div>
</body></html>`;
}

function primaryButton({ href, label }) {
  return `
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate; margin-top:24px;">
      <tr>
        <td bgcolor="#141414" style="background:#141414; border-radius:8px; padding:12px 24px;">
          <a href="${esc(href)}" target="_blank" style="display:inline-block; max-width:100%; white-space:normal; box-sizing:border-box; text-align:center; color:#ffffff !important; -webkit-text-fill-color:#ffffff; text-decoration:none !important; font-weight:600; font-size:14px; line-height:20px;">
            <span style="color:#ffffff !important; -webkit-text-fill-color:#ffffff; text-decoration:none !important;">${esc(label)}</span>
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function bookingRequestOwner({ ownerName, recruiterName, startTime, profileTitle, link, profileTimezone, recruiterTimezone, message }) {
  const subject = `Interview Request Received: ${recruiterName}`;
  const baseUrl = (process.env.BASE_URL || 'https://openinterview.me').replace(/\/$/, '');
  const HEADER_IMG_URL = `${baseUrl}/images/headerimage.png`;

  const { pretty, tzLabel } = formatMeetingTime({ startISO: startTime, tz: profileTimezone });

  let recruiterPretty   = '';
  let recruiterTzLabel  = '';
  if (recruiterTimezone) {
    const recT = formatMeetingTime({ startISO: startTime, tz: recruiterTimezone });
    recruiterPretty  = recT.pretty;
    recruiterTzLabel = recT.tzLabel;
  }

  const messageBlock = message
    ? `<tr><td style="padding:0 44px 20px;">
        <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#111111;text-transform:uppercase;letter-spacing:0.5px;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Message From Recruiter</p>
        <div style="background:#f9fafb;border-left:3px solid #e5e7eb;border-radius:0 8px 8px 0;padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;font-style:italic;
                    font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">&ldquo;${esc(message)}&rdquo;</p>
        </div>
       </td></tr>`
    : `<tr><td style="padding:0 44px 20px;">
        <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#111111;text-transform:uppercase;letter-spacing:0.5px;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Message From Recruiter</p>
        <div style="background:#f9fafb;border-left:3px solid #e5e7eb;border-radius:0 8px 8px 0;padding:12px 16px;">
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;font-style:italic;
                    font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">No message was included with this request.</p>
        </div>
       </td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>${esc(subject)}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0!important; padding:0!important; background:#f0f0f0; }
  @media only screen and (max-width: 600px) {
    body, table, td, div, p, a { box-sizing: border-box !important; }
    .email-card, .mobile-full-width { width: 100% !important; max-width: 100% !important; }
    p, td, div { overflow-wrap: break-word !important; word-break: normal !important; font-size: 16px !important; line-height: 1.55 !important; }
    h1 { font-size: 30px !important; line-height: 1.15 !important; }
    h2 { font-size: 24px !important; line-height: 1.2 !important; }
    img { max-width: 100% !important; height: auto !important; }
    .email-cta-btn { max-width: 100% !important; box-sizing: border-box !important; white-space: normal !important; }
    .hero-left  { display:block!important; width:100%!important; border-right:none!important; border-bottom:1px solid #e5e5e5!important; padding:36px 28px 28px!important; text-align:center!important; }
    .hero-right { display:block!important; width:100%!important; padding:28px 28px 36px!important; }
    .band-left  { display:block!important; width:100%!important; padding:32px 28px 16px!important; text-align:center!important; }
    .band-right { display:block!important; width:100%!important; padding:8px 28px 36px!important; }
    .band-img   { width:100%!important; max-width:300px!important; }
    h1.hero-title { font-size:28px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0f0">
<tr><td align="center" style="padding:36px 16px 48px;">
  <table class="email-card" width="660" cellpadding="0" cellspacing="0" border="0" style="max-width:660px;width:100%;">

    <!-- HEADER -->
    <tr>
      <td align="center" style="padding:0 0 24px;">
        <table cellpadding="0" cellspacing="0" border="0" align="center">

        </table>
      </td>
    </tr>

    <!-- WHITE HERO CARD -->
    <tr>
      <td bgcolor="#ffffff" style="background:#ffffff;border-radius:14px 14px 0 0;border:1px solid #e0e0e0;border-bottom:none;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>

            <!-- LEFT: notification panel -->
            <td class="hero-left" width="220" valign="top" align="center"
                style="padding:44px 28px 44px 44px;border-right:1px solid #e8e8e8;vertical-align:top;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr><td align="center" style="padding-bottom:14px;">
                  <table cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr><td align="center" bgcolor="#f0fdf4"
                            style="width:72px;height:72px;border-radius:36px;background:#f0fdf4;
                                   font-size:32px;line-height:72px;text-align:center;">
                      &#128276;
                    </td></tr>
                  </table>
                </td></tr>
                <tr><td align="center"
                        style="font-size:21px;font-weight:900;color:#111111;letter-spacing:-0.3px;
                               font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;
                               padding-bottom:7px;line-height:1.1;">
                  Good News!
                </td></tr>
                <tr><td align="center"
                        style="font-size:13px;color:#6b7280;line-height:1.45;
                               font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                  You have a new<br/>interview request.
                </td></tr>
              </table>
            </td>

            <!-- RIGHT: headline + copy + CTA -->
            <td class="hero-right" valign="top"
                style="padding:44px 40px 44px 32px;vertical-align:top;">
              <h1 class="hero-title"
                  style="margin:0 0 14px 0;font-size:28px;font-weight:900;color:#111111;
                         line-height:1.08;letter-spacing:-0.4px;
                         font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Interview Request<br/>Received
              </h1>
              <p style="margin:0 0 10px 0;font-size:14px;color:#374151;line-height:1.5;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                <strong style="color:#111111;">${esc(recruiterName)}</strong> has requested an interview
                with you for the <strong style="color:#111111;">${esc(profileTitle)}</strong> position.
              </p>
              <p style="margin:0 0 24px 0;font-size:13px;color:#6b7280;line-height:1.45;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Your OpenInterview is doing exactly what it was built to do &mdash; helping recruiters
                discover and engage with you faster.
              </p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#111111" style="border-radius:10px;background:#111111;">
                    <a href="https://openinterview.me/login-page.html" target="_blank"
                       style="display:inline-block;padding:16px 36px;color:#ffffff !important;
                              text-decoration:none !important;font-weight:700;font-size:15px;
                              line-height:1;letter-spacing:0.1px;
                              font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                      View My Bookings
                    </a>
                  </td>
                </tr>
              </table>
            </td>

          </tr>
        </table>
      </td>
    </tr>

    <!-- DETAILS SECTION -->
    <tr>
      <td bgcolor="#ffffff"
          style="background:#ffffff;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">

          <tr><td style="padding:24px 44px 16px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#111111;
                      text-transform:uppercase;letter-spacing:0.5px;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Interview Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280;
                           width:140px;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Recruiter</td>
                <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;
                           color:#111111;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">${esc(recruiterName)}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;font-size:12px;color:#6b7280;width:140px;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Requested Time</td>
                <td style="padding:7px 0;font-size:13px;font-weight:600;color:#111111;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                  ${esc(pretty)}<br/>
                  <span style="font-size:11px;font-weight:400;color:#6b7280;line-height:1.35;">(Profile timezone: ${esc(tzLabel)})</span>
                  ${recruiterPretty ? `<br/><span style="font-size:11px;font-weight:400;color:#6b7280;line-height:1.35;">(Recruiter local time: ${esc(recruiterPretty)} ${esc(recruiterTzLabel)})</span>` : ''}
                </td>
              </tr>
            </table>
          </td></tr>

          ${messageBlock}

          <!-- ACTION REQUIRED -->
          <tr><td style="padding:22px 44px 0;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#111111;
                      text-transform:uppercase;letter-spacing:0.5px;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Action Required</p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#374151;line-height:1.45;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">To confirm your interview request:</p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;">
              <tr><td style="padding:3px 0;font-size:13px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                <strong style="color:#111111;">1.</strong>&nbsp; Go to <strong>My Bookings</strong>
              </td></tr>
              <tr><td style="padding:3px 0;font-size:13px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                <strong style="color:#111111;">2.</strong>&nbsp; Locate the interview marked <strong>Pending</strong>
              </td></tr>
              <tr><td style="padding:3px 0;font-size:13px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                <strong style="color:#111111;">3.</strong>&nbsp; Click the <strong>calendar icon</strong>
              </td></tr>
              <tr><td style="padding:3px 0;font-size:13px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                <strong style="color:#111111;">4.</strong>&nbsp; Select <strong>Accept</strong> or <strong>Decline</strong>
              </td></tr>
            </table>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:10px;">
              <p style="margin:0;font-size:12px;font-weight:700;color:#92400e;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Your interview is not confirmed until you respond.
              </p>
            </div>
            <p style="margin:0 0 18px 0;font-size:12px;color:#6b7280;line-height:1.45;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
              Prompt responses help keep your hiring process moving and show recruiters you are engaged.
            </p>
          </td></tr>

        </table>
      </td>
    </tr>

    <!-- BLACK CONVERSION BAND -->
    <tr>
      <td bgcolor="#111111" style="background:#111111;border-radius:0 0 14px 14px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="band-left" width="300" valign="middle"
                style="padding:36px 16px 36px 36px;vertical-align:middle;">
              <img class="band-img" src="${HEADER_IMG_URL}" width="270" alt="OpenInterview profile preview"
                   style="display:block;width:270px;max-width:270px;height:auto;border-radius:10px;
                          border:0;box-shadow:0 6px 28px rgba(0,0,0,0.5);"/>
            </td>
            <td class="band-right" valign="middle"
                style="padding:36px 36px 36px 16px;vertical-align:middle;">
              <h2 style="margin:0 0 24px 0;font-size:19px;font-weight:900;color:#ffffff;
                         line-height:1.3;letter-spacing:-0.2px;
                         font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Create custom OpenInterviews for your most important applications.
              </h2>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:12px;font-size:15px;line-height:1.5;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:12px;font-size:13px;color:#d1d5db;line-height:1.5;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Stand out before the interview</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:12px;font-size:15px;line-height:1.5;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:12px;font-size:13px;color:#d1d5db;line-height:1.5;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Show more than just a resume</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:12px;font-size:15px;line-height:1.5;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:12px;font-size:13px;color:#d1d5db;line-height:1.5;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Tailor your introduction for each opportunity</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;font-size:15px;line-height:1.5;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="font-size:13px;color:#d1d5db;line-height:1.5;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Present your strongest first impression</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FINAL FOOTER -->
    <tr>
      <td align="center" style="padding:32px 24px 28px;">
        <p style="margin:0 0 6px 0;font-size:11px;color:#9ca3af;font-style:italic;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Powered by:</p>
        <a href="https://openinterview.me" style="display:inline-block;text-decoration:none;color:#111111;font-size:16px;font-weight:700;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">openinterview.me</a>
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#111111;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          The #1 Modern Interview Platform.
        </p>
        <p style="margin:0 0 14px 0;font-size:12px;color:#6b7280;line-height:1.5;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          Connecting 1B openinterviews to real opportunities by 2030.
        </p>
        <p style="margin:0 0 3px 0;font-size:11px;color:#aaaaaa;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          openinterview.me&reg; registered trademark &copy; 2024 openinterview.me
        </p>
        <p style="margin:0;font-size:11px;color:#aaaaaa;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          Need Help?&nbsp;<a href="mailto:support@openinterview.me"
            style="color:#aaaaaa;text-decoration:underline;">support@openinterview.me</a>
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}

export function profileInvite({ senderName, profileTitle, profileUrl, message, avatarUrl }) {
  const subject = `${senderName} invited you to view their profile`;
  const baseUrl = (process.env.BASE_URL || 'https://openinterview.me').replace(/\/$/, '');
  const HEADER_IMG_URL = `${baseUrl}/images/headerimage.png`;
  const DEFAULT_AVATAR = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%23e5e7eb'/%3E%3Ccircle cx='60' cy='46' r='24' fill='%239ca3af'/%3E%3Cellipse cx='60' cy='100' rx='36' ry='26' fill='%239ca3af'/%3E%3C/svg%3E`;
  const resolvedAvatar = (avatarUrl && avatarUrl.trim()) ? avatarUrl.trim() : DEFAULT_AVATAR;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>${esc(subject)}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0!important; padding:0!important; background:#f0f0f0; }
  @media only screen and (max-width: 600px) {
    body, table, td, div, p, a { box-sizing: border-box !important; }
    .email-card, .mobile-full-width { width: 100% !important; max-width: 100% !important; }
    p, td, div { overflow-wrap: break-word !important; word-break: normal !important; font-size: 16px !important; line-height: 1.55 !important; }
    h1 { font-size: 30px !important; line-height: 1.15 !important; }
    h2 { font-size: 24px !important; line-height: 1.2 !important; }
    img { max-width: 100% !important; height: auto !important; }
    .email-cta-btn { max-width: 100% !important; box-sizing: border-box !important; white-space: normal !important; }
    .hero-left  { display:block!important; width:100%!important; border-right:none!important; border-bottom:1px solid #e5e5e5!important; padding:36px 28px 28px!important; text-align:center!important; }
    .hero-right { display:block!important; width:100%!important; padding:28px 28px 36px!important; }
    .band-left  { display:block!important; width:100%!important; padding:32px 28px 16px!important; text-align:center!important; }
    .band-right { display:block!important; width:100%!important; padding:8px 28px 36px!important; }
    .band-img   { width:100%!important; max-width:300px!important; }
    h1.hero-title { font-size:28px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0f0">
<tr><td align="center" style="padding:36px 16px 48px;">
  <table class="email-card" width="660" cellpadding="0" cellspacing="0" border="0" style="max-width:660px;width:100%;">

    <!-- ── HEADER ── -->
    <tr>
      <td align="center" style="padding:0 0 24px;">
        <table cellpadding="0" cellspacing="0" border="0" align="center">

        </table>
      </td>
    </tr>

    <!-- ── WHITE HERO CARD ── -->
    <tr>
      <td bgcolor="#ffffff" style="background:#ffffff;border-radius:14px 14px 0 0;border:1px solid #e0e0e0;border-bottom:none;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>

            <!-- LEFT: avatar + name + title -->
            <td class="hero-left" width="220" valign="top" align="center"
                style="padding:52px 28px 52px 44px;border-right:1px solid #e8e8e8;vertical-align:top;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr><td align="center" style="padding-bottom:18px;">
                  <img src="${resolvedAvatar}" width="120" height="120"
                       alt="${esc(senderName)} profile image"
                       style="display:block;width:120px;height:120px;border-radius:60px;background:#e5e7eb;object-fit:cover;"/>
                </td></tr>
                <tr><td align="center"
                        style="font-size:18px;font-weight:700;color:#111111;letter-spacing:-0.3px;
                               font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;padding-bottom:6px;line-height:1.2;">
                  ${esc(senderName)}
                </td></tr>
                <tr><td align="center"
                        style="font-size:13px;color:#6b7280;
                               font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;line-height:1.5;">
                  ${esc(profileTitle)}
                </td></tr>
              </table>
            </td>

            <!-- RIGHT: headline + copy + CTA -->
            <td class="hero-right" valign="top"
                style="padding:52px 44px 52px 36px;vertical-align:top;">
              <h1 class="hero-title"
                  style="margin:0 0 20px 0;font-size:34px;font-weight:900;color:#111111;
                         line-height:1.1;letter-spacing:-0.5px;
                         font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                You&#8217;re&nbsp;Invited
              </h1>
              <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.7;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                ${esc(senderName)} has invited you to view their OpenInterview profile for the
                <strong style="color:#111111;font-weight:700;">${esc(profileTitle)}</strong> opportunity.
              </p>
              <p style="margin:0 0 36px 0;font-size:15px;color:#374151;line-height:1.7;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                OpenInterview gives candidates a more complete way to present themselves
                beyond a traditional resume.
              </p>
              ${message ? `<p style="margin:0 0 28px 0;font-size:14px;color:#6b7280;line-height:1.65;font-style:italic;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">&ldquo;${esc(message)}&rdquo;</p>` : ''}
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#111111"
                      style="border-radius:10px;background:#111111;">
                    <a href="${esc(profileUrl)}" target="_blank"
                       style="display:inline-block;padding:16px 44px;color:#ffffff !important;
                              text-decoration:none !important;font-weight:700;font-size:16px;
                              line-height:1;letter-spacing:0.1px;
                              font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                      View Profile
                    </a>
                  </td>
                </tr>
              </table>
            </td>

          </tr>
        </table>
      </td>
    </tr>

    <!-- ── BLACK CONVERSION BAND ── -->
    <tr>
      <td bgcolor="#111111" style="background:#111111;border-radius:0 0 14px 14px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>

            <!-- LEFT: real product screenshot -->
            <td class="band-left" width="300" valign="middle"
                style="padding:36px 16px 36px 36px;vertical-align:middle;">
              <img class="band-img" src="${HEADER_IMG_URL}" width="270" alt="OpenInterview profile preview"
                   style="display:block;width:270px;max-width:270px;height:auto;border-radius:10px;
                          border:0;box-shadow:0 6px 28px rgba(0,0,0,0.5);"/>
            </td>

            <!-- RIGHT: headline + bullets -->
            <td class="band-right" valign="middle"
                style="padding:36px 36px 36px 16px;vertical-align:middle;">
              <h2 style="margin:0 0 24px 0;font-size:20px;font-weight:900;color:#ffffff;
                         line-height:1.25;letter-spacing:-0.2px;
                         font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Use OpenInterview.me<br/>for all of your hiring.
              </h2>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:12px;font-size:15px;line-height:1.5;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:12px;font-size:13px;color:#d1d5db;line-height:1.5;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Quickly evaluate communication skills</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:12px;font-size:15px;line-height:1.5;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:12px;font-size:13px;color:#d1d5db;line-height:1.5;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Reduce wasted screening calls</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:12px;font-size:15px;line-height:1.5;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:12px;font-size:13px;color:#d1d5db;line-height:1.5;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Schedule interviews in just a few clicks</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;font-size:15px;line-height:1.5;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="font-size:13px;color:#d1d5db;line-height:1.5;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Candidates confirm interviews directly</td>
                </tr>
              </table>
            </td>

          </tr>
        </table>
      </td>
    </tr>

    <!-- ── FINAL FOOTER ── -->
    <tr>
      <td align="center" style="padding:32px 24px 28px;">
        <p style="margin:0 0 6px 0;font-size:11px;color:#9ca3af;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;font-style:italic;">
          Powered by:
        </p>
        <a href="https://openinterview.me" style="display:inline-block;text-decoration:none;color:#111111;font-size:16px;font-weight:700;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">openinterview.me</a>
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#111111;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          The #1 Modern Interview Platform.
        </p>
        <p style="margin:0 0 14px 0;font-size:12px;color:#6b7280;line-height:1.5;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          Connecting 1B openinterviews to real opportunities by 2030.
        </p>
        <p style="margin:0 0 3px 0;font-size:11px;color:#aaaaaa;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          openinterview.me&reg; registered trademark &copy; 2024 openinterview.me
        </p>
        <p style="margin:0;font-size:11px;color:#aaaaaa;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          Need Help?&nbsp;<a href="mailto:support@openinterview.me"
            style="color:#aaaaaa;text-decoration:underline;">support@openinterview.me</a>
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}

export function bookingConfirmedRecruiter({ recruiterName, ownerName, startTime, profileTitle, icsAttached, cancelLink, recruiterTimezone, profileTimezone }) {
  const subject = `Interview Confirmed: ${ownerName}`;
  const baseUrl = (process.env.BASE_URL || 'https://openinterview.me').replace(/\/$/, '');
  const HEADER_IMG_URL = `${baseUrl}/images/headerimage.png`;

  const profileT = formatMeetingTime({ startISO: startTime, tz: profileTimezone });

  let confirmedPretty   = profileT.pretty;
  let confirmedTzLabel  = profileT.tzLabel;
  let recruiterPretty   = '';
  let recruiterTzLabel  = '';
  if (recruiterTimezone) {
    const recT = formatMeetingTime({ startISO: startTime, tz: recruiterTimezone });
    confirmedPretty  = recT.pretty;
    confirmedTzLabel = recT.tzLabel;
    recruiterPretty  = profileT.pretty;
    recruiterTzLabel = profileT.tzLabel;
  }

  const ctaLink = cancelLink || '#';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>${esc(subject)}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0!important; padding:0!important; background:#f0f0f0; }
  @media only screen and (max-width: 600px) {
    body, table, td, div, p, a { box-sizing: border-box !important; }
    .email-card, .mobile-full-width { width: 100% !important; max-width: 100% !important; }
    p, td, div { overflow-wrap: break-word !important; word-break: normal !important; font-size: 16px !important; line-height: 1.55 !important; }
    h1 { font-size: 30px !important; line-height: 1.15 !important; }
    h2 { font-size: 24px !important; line-height: 1.2 !important; }
    img { max-width: 100% !important; height: auto !important; }
    .email-cta-btn { max-width: 100% !important; box-sizing: border-box !important; white-space: normal !important; }
    .hero-left  { display:block!important; width:100%!important; border-right:none!important; border-bottom:1px solid #e5e5e5!important; padding:36px 28px 28px!important; text-align:center!important; }
    .hero-right { display:block!important; width:100%!important; padding:28px 28px 36px!important; }
    .band-left  { display:block!important; width:100%!important; padding:32px 28px 16px!important; text-align:center!important; }
    .band-right { display:block!important; width:100%!important; padding:8px 28px 36px!important; }
    .band-img   { width:100%!important; max-width:300px!important; }
    h1.hero-title { font-size:28px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0f0">
<tr><td align="center" style="padding:36px 16px 48px;">
  <table class="email-card" width="660" cellpadding="0" cellspacing="0" border="0" style="max-width:660px;width:100%;">

    <!-- HEADER -->
    <tr>
      <td align="center" style="padding:0 0 24px;">
        <table cellpadding="0" cellspacing="0" border="0" align="center">

        </table>
      </td>
    </tr>

    <!-- WHITE HERO CARD -->
    <tr>
      <td bgcolor="#ffffff" style="background:#ffffff;border-radius:14px 14px 0 0;border:1px solid #e0e0e0;border-bottom:none;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>

            <!-- LEFT: confirmation panel -->
            <td class="hero-left" width="220" valign="top" align="center"
                style="padding:44px 28px 44px 44px;border-right:1px solid #e8e8e8;vertical-align:top;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr><td align="center" style="padding-bottom:14px;">
                  <table cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr><td align="center" bgcolor="#f0fdf4"
                            style="width:72px;height:72px;border-radius:36px;background:#f0fdf4;
                                   font-size:34px;line-height:72px;text-align:center;">
                      &#10003;
                    </td></tr>
                  </table>
                </td></tr>
                <tr><td align="center"
                        style="font-size:21px;font-weight:900;color:#111111;letter-spacing:-0.3px;
                               font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;
                               padding-bottom:7px;line-height:1.1;">
                  Confirmed
                </td></tr>
                <tr><td align="center"
                        style="font-size:13px;color:#6b7280;line-height:1.45;
                               font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                  Your interview has<br/>been accepted.
                </td></tr>
              </table>
            </td>

            <!-- RIGHT: headline + copy + CTA -->
            <td class="hero-right" valign="top"
                style="padding:44px 40px 44px 32px;vertical-align:top;">
              <h1 class="hero-title"
                  style="margin:0 0 14px 0;font-size:28px;font-weight:900;color:#111111;
                         line-height:1.08;letter-spacing:-0.4px;
                         font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Interview<br/>Confirmed
              </h1>
              <p style="margin:0 0 10px 0;font-size:14px;color:#374151;line-height:1.5;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                <strong style="color:#111111;">${esc(ownerName)}</strong> has confirmed their interview
                for the <strong style="color:#111111;">${esc(profileTitle)}</strong> position.
              </p>
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.45;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Your interview is now scheduled and ready to move forward.
              </p>
            </td>

          </tr>
        </table>
      </td>
    </tr>

    <!-- DETAILS SECTION -->
    <tr>
      <td bgcolor="#ffffff"
          style="background:#ffffff;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">

          <tr><td style="padding:24px 44px 16px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#111111;
                      text-transform:uppercase;letter-spacing:0.5px;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Interview Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280;
                           width:140px;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Candidate</td>
                <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;
                           color:#111111;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">${esc(ownerName)}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280;
                           width:140px;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Role</td>
                <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;
                           color:#111111;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">${esc(profileTitle)}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;font-size:12px;color:#6b7280;width:140px;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Confirmed Time</td>
                <td style="padding:7px 0;font-size:13px;font-weight:600;color:#111111;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                  ${esc(confirmedPretty)}<br/>
                  <span style="font-size:11px;font-weight:400;color:#6b7280;line-height:1.35;">(${esc(confirmedTzLabel)})</span>
                  ${recruiterPretty ? `<br/><span style="font-size:11px;font-weight:400;color:#6b7280;line-height:1.35;">(Profile time: ${esc(recruiterPretty)} ${esc(recruiterTzLabel)})</span>` : ''}
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- BEFORE THE INTERVIEW -->
          <tr><td style="padding:22px 44px 0;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#111111;
                      text-transform:uppercase;letter-spacing:0.5px;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Before the Interview</p>
            <p style="margin:0 0 ${icsAttached ? '10px' : '18px'} 0;font-size:13px;color:#374151;line-height:1.45;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
              Review the candidate&rsquo;s OpenInterview profile before the meeting so you can focus the
              conversation on fit, experience, and next steps.
            </p>
            ${icsAttached ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-bottom:18px;">
              <p style="margin:0;font-size:12px;font-weight:600;color:#166534;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &#128197;&nbsp; A calendar invitation (.ICS) has been attached to this email.
              </p>
            </div>` : ''}
          </td></tr>

          <!-- CALENDAR BACKUP -->
          <tr><td style="padding:20px 44px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#111111;
                      text-transform:uppercase;letter-spacing:0.5px;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Calendar Backup Instructions</p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#374151;line-height:1.45;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
              If the Add to Calendar button does not work, you can still add the interview to your calendar manually:
            </p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:10px;">
              <tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &bull;&nbsp; Locate the attached calendar invite file (.ICS) in this email.
              </td></tr>
              <tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &bull;&nbsp; Download the .ICS file to your device.
              </td></tr>
              <tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &bull;&nbsp; Open the file by double-clicking it, or choose Open With from your device menu.
              </td></tr>
              <tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &bull;&nbsp; Select your preferred calendar application (Google Calendar, Outlook, Apple Calendar, or another calendar app).
              </td></tr>
              <tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &bull;&nbsp; Follow the prompts to save or add the event to your calendar.
              </td></tr>
            </table>
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.45;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
              <strong style="color:#374151;">Tip:</strong> Once added, you can enable reminders in your calendar app so you do not miss your interview.
            </p>
          </td></tr>

        </table>
      </td>
    </tr>

    <!-- BLACK CONVERSION BAND -->
    <tr>
      <td bgcolor="#111111" style="background:#111111;border-radius:0 0 14px 14px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="band-left" width="300" valign="middle"
                style="padding:36px 16px 36px 36px;vertical-align:middle;">
              <img class="band-img" src="${HEADER_IMG_URL}" width="270" alt="OpenInterview profile preview"
                   style="display:block;width:270px;max-width:270px;height:auto;border-radius:10px;
                          border:0;box-shadow:0 6px 28px rgba(0,0,0,0.5);"/>
            </td>
            <td class="band-right" valign="middle"
                style="padding:36px 36px 36px 16px;vertical-align:middle;">
              <h2 style="margin:0 0 20px 0;font-size:19px;font-weight:900;color:#ffffff;
                         line-height:1.25;letter-spacing:-0.2px;
                         font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Use OpenInterview.me<br/>for all of your hiring.
              </h2>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:10px;font-size:15px;line-height:1.45;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:10px;font-size:13px;color:#d1d5db;line-height:1.45;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Quickly evaluate communication skills</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:10px;font-size:15px;line-height:1.45;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:10px;font-size:13px;color:#d1d5db;line-height:1.45;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Reduce wasted screening calls</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:10px;font-size:15px;line-height:1.45;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:10px;font-size:13px;color:#d1d5db;line-height:1.45;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Schedule interviews in just a few clicks</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;font-size:15px;line-height:1.45;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="font-size:13px;color:#d1d5db;line-height:1.45;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Candidates confirm interviews directly</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FINAL FOOTER -->
    <tr>
      <td align="center" style="padding:32px 24px 28px;">
        <p style="margin:0 0 6px 0;font-size:11px;color:#9ca3af;font-style:italic;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Powered by:</p>
        <a href="https://openinterview.me" style="display:inline-block;text-decoration:none;color:#111111;font-size:16px;font-weight:700;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">openinterview.me</a>
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#111111;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          The #1 Modern Interview Platform.
        </p>
        <p style="margin:0 0 14px 0;font-size:12px;color:#6b7280;line-height:1.5;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          Connecting 1B openinterviews to real opportunities by 2030.
        </p>
        <p style="margin:0 0 3px 0;font-size:11px;color:#aaaaaa;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          openinterview.me&reg; registered trademark &copy; 2024 openinterview.me
        </p>
        <p style="margin:0;font-size:11px;color:#aaaaaa;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          Need Help?&nbsp;<a href="mailto:support@openinterview.me"
            style="color:#aaaaaa;text-decoration:underline;">support@openinterview.me</a>
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}

export function bookingConfirmedOwner({ recruiterName, ownerName, startTime, profileTitle, icsAttached, bookingsLink, recruiterTimezone, profileTimezone }) {
  const subject = `Interview Confirmed: ${profileTitle}`;
  const baseUrl = (process.env.BASE_URL || 'https://openinterview.me').replace(/\/$/, '');
  const HEADER_IMG_URL = `${baseUrl}/images/headerimage.png`;

  const profileT = formatMeetingTime({ startISO: startTime, tz: profileTimezone });

  let confirmedPretty  = profileT.pretty;
  let confirmedTzLabel = profileT.tzLabel;
  let recruiterPretty  = '';
  let recruiterTzLabel = '';
  if (recruiterTimezone) {
    const recT = formatMeetingTime({ startISO: startTime, tz: recruiterTimezone });
    recruiterPretty  = recT.pretty;
    recruiterTzLabel = recT.tzLabel;
  }

  const ctaLink = bookingsLink || '#';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>${esc(subject)}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0!important; padding:0!important; background:#f0f0f0; }
  @media only screen and (max-width: 600px) {
    body, table, td, div, p, a { box-sizing: border-box !important; }
    .email-card, .mobile-full-width { width: 100% !important; max-width: 100% !important; }
    p, td, div { overflow-wrap: break-word !important; word-break: normal !important; font-size: 16px !important; line-height: 1.55 !important; }
    h1 { font-size: 30px !important; line-height: 1.15 !important; }
    h2 { font-size: 24px !important; line-height: 1.2 !important; }
    img { max-width: 100% !important; height: auto !important; }
    .email-cta-btn { max-width: 100% !important; box-sizing: border-box !important; white-space: normal !important; }
    .hero-left  { display:block!important; width:100%!important; border-right:none!important; border-bottom:1px solid #e5e5e5!important; padding:36px 28px 28px!important; text-align:center!important; }
    .hero-right { display:block!important; width:100%!important; padding:28px 28px 36px!important; }
    .band-left  { display:block!important; width:100%!important; padding:32px 28px 16px!important; text-align:center!important; }
    .band-right { display:block!important; width:100%!important; padding:8px 28px 36px!important; }
    .band-img   { width:100%!important; max-width:300px!important; }
    h1.hero-title { font-size:28px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0f0">
<tr><td align="center" style="padding:36px 16px 48px;">
  <table class="email-card" width="660" cellpadding="0" cellspacing="0" border="0" style="max-width:660px;width:100%;">

    <!-- HEADER -->
    <tr>
      <td align="center" style="padding:0 0 24px;">
        <table cellpadding="0" cellspacing="0" border="0" align="center">

        </table>
      </td>
    </tr>

    <!-- WHITE HERO CARD -->
    <tr>
      <td bgcolor="#ffffff" style="background:#ffffff;border-radius:14px 14px 0 0;border:1px solid #e0e0e0;border-bottom:none;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>

            <!-- LEFT: confirmation panel -->
            <td class="hero-left" width="220" valign="top" align="center"
                style="padding:44px 28px 44px 44px;border-right:1px solid #e8e8e8;vertical-align:top;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr><td align="center" style="padding-bottom:14px;">
                  <table cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr><td align="center" bgcolor="#f0fdf4"
                            style="width:72px;height:72px;border-radius:36px;background:#f0fdf4;
                                   font-size:34px;line-height:72px;text-align:center;">
                      &#10003;
                    </td></tr>
                  </table>
                </td></tr>
                <tr><td align="center"
                        style="font-size:21px;font-weight:900;color:#111111;letter-spacing:-0.3px;
                               font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;
                               padding-bottom:7px;line-height:1.1;">
                  Confirmed
                </td></tr>
                <tr><td align="center"
                        style="font-size:13px;color:#6b7280;line-height:1.45;
                               font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                  Your interview is scheduled.
                </td></tr>
              </table>
            </td>

            <!-- RIGHT: headline + copy + CTA -->
            <td class="hero-right" valign="top"
                style="padding:44px 40px 44px 32px;vertical-align:top;">
              <h1 class="hero-title"
                  style="margin:0 0 14px 0;font-size:28px;font-weight:900;color:#111111;
                         line-height:1.08;letter-spacing:-0.4px;
                         font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Interview<br/>Confirmed
              </h1>
              <p style="margin:0 0 10px 0;font-size:14px;color:#374151;line-height:1.5;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Your interview with <strong style="color:#111111;">${esc(recruiterName)}</strong> for the
                <strong style="color:#111111;">${esc(profileTitle)}</strong> position has been confirmed.
              </p>
              <p style="margin:0 0 24px 0;font-size:13px;color:#6b7280;line-height:1.45;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Your interview is officially scheduled and ready to move forward.
              </p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#111111" style="border-radius:10px;background:#111111;">
                    <a href="${esc(ctaLink)}" target="_blank"
                       style="display:inline-block;padding:16px 36px;color:#ffffff !important;
                              text-decoration:none !important;font-weight:700;font-size:15px;
                              line-height:1;letter-spacing:0.1px;
                              font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                      View My Bookings
                    </a>
                  </td>
                </tr>
              </table>
            </td>

          </tr>
        </table>
      </td>
    </tr>

    <!-- DETAILS SECTION -->
    <tr>
      <td bgcolor="#ffffff"
          style="background:#ffffff;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">

          <tr><td style="padding:24px 44px 16px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#111111;
                      text-transform:uppercase;letter-spacing:0.5px;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Interview Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280;
                           width:140px;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Recruiter</td>
                <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;
                           color:#111111;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">${esc(recruiterName)}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#6b7280;
                           width:140px;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Role</td>
                <td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;
                           color:#111111;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">${esc(profileTitle)}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;font-size:12px;color:#6b7280;width:140px;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Confirmed Time</td>
                <td style="padding:7px 0;font-size:13px;font-weight:600;color:#111111;vertical-align:top;line-height:1.4;
                           font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                  ${esc(confirmedPretty)}<br/>
                  <span style="font-size:11px;font-weight:400;color:#6b7280;line-height:1.35;">(${esc(confirmedTzLabel)})</span>
                  ${recruiterPretty ? `<br/><span style="font-size:11px;font-weight:400;color:#6b7280;line-height:1.35;">(Recruiter time: ${esc(recruiterPretty)} ${esc(recruiterTzLabel)})</span>` : ''}
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- BEFORE THE INTERVIEW -->
          <tr><td style="padding:22px 44px 0;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#111111;
                      text-transform:uppercase;letter-spacing:0.5px;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Before the Interview</p>
            <p style="margin:0 0 ${icsAttached ? '10px' : '18px'} 0;font-size:13px;color:#374151;line-height:1.45;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
              Review your OpenInterview profile before the interview and be prepared to discuss your experience,
              skills, and next steps.
            </p>
            ${icsAttached ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-bottom:18px;">
              <p style="margin:0;font-size:12px;font-weight:600;color:#166534;
                        font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &#128197;&nbsp; A calendar invitation (.ICS) has been attached to this email.
              </p>
            </div>` : ''}
          </td></tr>

          <!-- CALENDAR BACKUP -->
          <tr><td style="padding:20px 44px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#111111;
                      text-transform:uppercase;letter-spacing:0.5px;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Calendar Backup Instructions</p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#374151;line-height:1.45;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
              If the Add to Calendar button does not work, you can still add the interview to your calendar manually:
            </p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:10px;">
              <tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &bull;&nbsp; Locate the attached calendar invite file (.ICS) in this email.
              </td></tr>
              <tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &bull;&nbsp; Download the .ICS file to your device.
              </td></tr>
              <tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &bull;&nbsp; Open the file by double-clicking it, or choose Open With from your device menu.
              </td></tr>
              <tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &bull;&nbsp; Select your preferred calendar application (Google Calendar, Outlook, Apple Calendar, or another calendar app).
              </td></tr>
              <tr><td style="padding:2px 0 2px 12px;font-size:12px;color:#374151;line-height:1.45;
                             font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                &bull;&nbsp; Follow the prompts to save or add the event to your calendar.
              </td></tr>
            </table>
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.45;
                      font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
              <strong style="color:#374151;">Tip:</strong> Once added, you can enable reminders in your calendar app so you do not miss your interview.
            </p>
          </td></tr>

        </table>
      </td>
    </tr>

    <!-- BLACK CONVERSION BAND -->
    <tr>
      <td bgcolor="#111111" style="background:#111111;border-radius:0 0 14px 14px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="band-left" width="300" valign="middle"
                style="padding:36px 16px 36px 36px;vertical-align:middle;">
              <img class="band-img" src="${HEADER_IMG_URL}" width="270" alt="OpenInterview profile preview"
                   style="display:block;width:270px;max-width:270px;height:auto;border-radius:10px;
                          border:0;box-shadow:0 6px 28px rgba(0,0,0,0.5);"/>
            </td>
            <td class="band-right" valign="middle"
                style="padding:36px 36px 36px 16px;vertical-align:middle;">
              <h2 style="margin:0 0 20px 0;font-size:19px;font-weight:900;color:#ffffff;
                         line-height:1.25;letter-spacing:-0.2px;
                         font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
                Create custom OpenInterviews<br/>for your most important applications.
              </h2>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:10px;font-size:15px;line-height:1.45;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:10px;font-size:13px;color:#d1d5db;line-height:1.45;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Stand out before the interview</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:10px;font-size:15px;line-height:1.45;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:10px;font-size:13px;color:#d1d5db;line-height:1.45;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Show more than just a resume</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;padding-bottom:10px;font-size:15px;line-height:1.45;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="padding-bottom:10px;font-size:13px;color:#d1d5db;line-height:1.45;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Tailor your introduction for each opportunity</td>
                </tr>
                <tr>
                  <td valign="top" width="28" style="width:28px;font-size:15px;line-height:1.45;color:#ffffff;font-weight:700;font-family:Arial,sans-serif;">&#10003;</td>
                  <td valign="top" style="font-size:13px;color:#d1d5db;line-height:1.45;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Present your strongest first impression</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FINAL FOOTER -->
    <tr>
      <td align="center" style="padding:32px 24px 28px;">
        <p style="margin:0 0 6px 0;font-size:11px;color:#9ca3af;font-style:italic;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">Powered by:</p>
        <a href="https://openinterview.me" style="display:inline-block;text-decoration:none;color:#111111;font-size:16px;font-weight:700;font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">openinterview.me</a>
        <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#111111;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          The #1 Modern Interview Platform.
        </p>
        <p style="margin:0 0 14px 0;font-size:12px;color:#6b7280;line-height:1.5;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          Connecting 1B openinterviews to real opportunities by 2030.
        </p>
        <p style="margin:0 0 3px 0;font-size:11px;color:#aaaaaa;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          openinterview.me&reg; registered trademark &copy; 2024 openinterview.me
        </p>
        <p style="margin:0;font-size:11px;color:#aaaaaa;
                  font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
          Need Help?&nbsp;<a href="mailto:support@openinterview.me"
            style="color:#aaaaaa;text-decoration:underline;">support@openinterview.me</a>
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;

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

/**
 * Widget flow: sent after anonymous user is converted to a registered account.
 * Contains their auto-generated password and a one-time magic login link.
 */
export function widgetAccountWelcome({ name, email, plainPassword, magicLinkUrl }) {
  const subject = 'Your OpenInterview account is ready';
  const html = wrapHtml(`
    <h1 class="title">Welcome to OpenInterview!</h1>
    <p class="subtitle">Your profile has been submitted and your account is ready. Here are your login details:</p>

    <table class="details-table">
      <tr>
        <td class="details-label">Email</td>
        <td class="details-value">${esc(email)}</td>
      </tr>
      <tr>
        <td class="details-label">Password</td>
        <td class="details-value" style="font-family:monospace;">${esc(plainPassword)}</td>
      </tr>
    </table>

    <p style="margin-bottom:8px; font-size:14px; color:#374151;">
      Click the button below to log in instantly — no password required. The link expires in 1 hour and can only be used once.
    </p>

    ${primaryButton({ href: magicLinkUrl, label: 'Log In to My Account' })}

    <p class="muted" style="margin-top:32px;">
      You can also log in at any time with your email and password above.<br/>
      We recommend changing your password after your first login.
    </p>
  `);
  return { subject, html };
}
