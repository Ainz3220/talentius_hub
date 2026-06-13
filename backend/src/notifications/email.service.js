import sgMail from '@sendgrid/mail';
import { env } from '../config/env.js';
import prisma from '../config/db.js';

if (env.SENDGRID_API_KEY) sgMail.setApiKey(env.SENDGRID_API_KEY);

export async function sendEmail({ to, subject, html, text }) {
  if (env.isDev) {
    console.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}`);
    return;
  }
  if (!env.SENDGRID_API_KEY) {
    console.warn('[EMAIL] No SendGrid API key set, skipping email.');
    return;
  }
  await sgMail.send({
    to,
    from: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME },
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });
}

export async function sendOtp(email, otp) {
  await sendEmail({
    to: email,
    subject: 'Your Talentius Hub OTP Code',
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
        <h2 style="color:#1F4E3D">Talentius Hub</h2>
        <p>Your one-time password is:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1F4E3D;margin:16px 0">${otp}</div>
        <p style="color:#9B9890;font-size:13px">This code expires in ${env.OTP_TTL_MINUTES} minutes. Do not share it.</p>
      </div>`,
  });
}

export async function sendDocumentAlert(email, expat, document, daysUntil) {
  const urgency = daysUntil <= 0 ? 'EXPIRED' : daysUntil <= 7 ? 'URGENT' : 'WARNING';
  const subject = `[${urgency}] Document expiry: ${document.originalName} — ${expat.fullName}`;
  await sendEmail({
    to: email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <h2 style="color:#1F4E3D">Talentius Hub — Document Alert</h2>
        <p><strong>${expat.fullName}</strong> · ${document.documentType}</p>
        <p>Document: <strong>${document.originalName}</strong></p>
        <p>Expiry: <strong>${document.expiryDate?.toDateString()}</strong>
          ${daysUntil <= 0 ? ' — <span style="color:#8B1A1A">EXPIRED</span>' : ` — <span style="color:#C4521A">${daysUntil} days remaining</span>`}
        </p>
      </div>`,
  });
}

export async function createNotification({ userId, type, title, body, entityType, entityId }) {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, entityType, entityId } });
  } catch (err) {
    console.error('[Notification] Failed to create:', err.message);
  }
}
