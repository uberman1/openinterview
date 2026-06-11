import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_SECURE === 'true', 
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

export async function sendMail({ to, subject, html, attachments = [] }) {
  if (!process.env.MAIL_HOST) {
    console.warn('[mailer] No MAIL_HOST configured, skipping email to:', to);
    return null;
  }

  const from = `"${process.env.MAIL_FROM_NAME || 'OpenInterview'}" <${process.env.MAIL_FROM_ADDRESS || 'no-reply@openinterview.me'}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments,
    });
    console.log('[mailer] Email sent:', info.messageId, 'to:', to);
    return info;
  } catch (error) {
    console.error('[mailer] Error sending email:', error);
    return null;
  }
}
