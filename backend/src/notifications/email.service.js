import sgMail from '@sendgrid/mail';
import { env } from '../config/env.js';

sgMail.setApiKey(env.SENDGRID_API_KEY);

async function sendEmail({ to, subject, html, text }) {
  try {
    await sgMail.send({
      to,
      from: { email: env.SENDGRID_FROM_EMAIL, name: 'Talentius Hub' },
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
  } catch (err) {
    console.error('SendGrid error:', err.response?.body || err.message);
    throw err;
  }
}

function layout(title, body) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0}
.wrap{max-width:520px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.header{background:#1e40af;padding:24px 32px;color:#fff;font-size:18px;font-weight:bold}
.body{padding:32px;color:#333;font-size:15px;line-height:1.6}
.otp{font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e40af;text-align:center;margin:24px 0;padding:16px;background:#eff6ff;border-radius:6px}
.btn{display:inline-block;background:#1e40af;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0}
.footer{padding:16px 32px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee}
</style></head>
<body><div class="wrap">
<div class="header">Talentius Hub</div>
<div class="body">${body}</div>
<div class="footer">© ${new Date().getFullYear()} Talentius Hub. This is an automated message.</div>
</div></body></html>`;
}

export async function sendOtpEmail({ to, otpCode, expiresInMinutes, appName }) {
  await sendEmail({
    to,
    subject: 'Your sign-in verification code',
    html: layout('Sign-in Code', `
      <p>Use the code below to complete your sign-in. It expires in <strong>${expiresInMinutes} minutes</strong>.</p>
      <div class="otp">${otpCode}</div>
      <p>If you did not request this code, you can safely ignore this email.</p>
    `),
  });
}

export async function sendEmailVerification({ to, userName, verifyUrl, expiresInHours, appName, createdByName }) {
  await sendEmail({
    to,
    subject: 'Verify your email address',
    html: layout('Email Verification', `
      <p>Hi ${userName},</p>
      <p>Your account was created by <strong>${createdByName}</strong>. Please verify your email address to activate it.</p>
      <p><a class="btn" href="${verifyUrl}">Verify Email</a></p>
      <p style="font-size:13px;color:#666">This link expires in ${expiresInHours} hours. If you did not expect this email, please ignore it.</p>
    `),
  });
}

export async function sendDocAlert({ to, entityName, entityType, docType, expiryDate, daysLeft, appName }) {
  await sendEmail({
    to,
    subject: `Document expiring soon — ${docType} (${daysLeft} days left)`,
    html: layout('Document Expiry Alert', `
      <p>The following document is expiring soon:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#666">Entity</td><td><strong>${entityName}</strong> (${entityType})</td></tr>
        <tr><td style="padding:6px 0;color:#666">Document</td><td><strong>${docType}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Expiry Date</td><td><strong>${expiryDate}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Days Left</td><td><strong style="color:#dc2626">${daysLeft} days</strong></td></tr>
      </table>
      <p>Please take action to renew this document before it expires.</p>
    `),
  });
}

export async function sendDocExpired({ to, entityName, entityType, docType, expiryDate, appName }) {
  await sendEmail({
    to,
    subject: `Document expired — ${docType}`,
    html: layout('Document Expired', `
      <p>The following document has expired and requires immediate attention:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#666">Entity</td><td><strong>${entityName}</strong> (${entityType})</td></tr>
        <tr><td style="padding:6px 0;color:#666">Document</td><td><strong>${docType}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Expired On</td><td><strong style="color:#dc2626">${expiryDate}</strong></td></tr>
      </table>
      <p>Please renew this document as soon as possible.</p>
    `),
  });
}

export async function sendTransferPending({ to, expatName, requestedBy, changeType, reason, approveUrl, appName }) {
  await sendEmail({
    to,
    subject: `Transfer request pending approval — ${expatName}`,
    html: layout('Transfer Request', `
      <p>A transfer request requires your approval:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#666">Expat</td><td><strong>${expatName}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Type</td><td><strong>${changeType}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Requested By</td><td>${requestedBy}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Reason</td><td>${reason}</td></tr>
      </table>
      ${approveUrl ? `<p><a class="btn" href="${approveUrl}">Review Transfer</a></p>` : ''}
    `),
  });
}

export async function sendTransferApproved({ to, expatName, approvedBy, effectiveDate, appName }) {
  await sendEmail({
    to,
    subject: `Transfer approved — ${expatName}`,
    html: layout('Transfer Approved', `
      <p>The transfer for <strong>${expatName}</strong> has been approved.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#666">Approved By</td><td>${approvedBy}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Effective Date</td><td>${effectiveDate || 'Immediately'}</td></tr>
      </table>
    `),
  });
}

export async function sendChecklistOverdue({ to, entityName, checklistName, itemText, overdueDays, itemNotes, appName }) {
  await sendEmail({
    to,
    subject: `Overdue checklist item — ${checklistName}`,
    html: layout('Checklist Item Overdue', `
      <p>A checklist item is overdue and requires attention:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#666">Entity</td><td><strong>${entityName}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Checklist</td><td>${checklistName}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Item</td><td><strong>${itemText}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Overdue By</td><td><strong style="color:#dc2626">${overdueDays} days</strong></td></tr>
        ${itemNotes ? `<tr><td style="padding:6px 0;color:#666">Notes</td><td>${itemNotes}</td></tr>` : ''}
      </table>
    `),
  });
}
