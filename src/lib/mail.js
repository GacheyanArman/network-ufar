/**
 * Email utility. Uses nodemailer when SMTP env vars are configured, otherwise
 * falls back to console logging (which is the current dev behaviour).
 *
 * Required env vars for real delivery:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from "nodemailer";

let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

/**
 * Generic send. Returns boolean — never throws so callers can fan-out without
 * losing other recipients.
 *
 * @param {{ to: string, subject: string, html?: string, text?: string }} args
 * @returns {Promise<boolean>}
 */
export async function sendEmail({ to, subject, html, text } = {}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[MAIL] (dev) -> ${to}: ${subject}\n${text || html}`);
    return true;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (err) {
    console.error("[MAIL] sendEmail failed:", err);
    return false;
  }
}

/**
 * Send verification email with OTP code
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit verification code
 * @returns {Promise<boolean>} - Success status
 */
export async function sendVerificationEmail(email, code) {
  // TODO: Configure with your email service (SendGrid, Mailgun, AWS SES, etc.)

  console.log(`
╔════════════════════════════════════════════════════════════╗
║              EMAIL VERIFICATION CODE                       ║
╠════════════════════════════════════════════════════════════╣
║  To: ${email.padEnd(50)}║
║  Code: ${code}                                           ║
║  Valid for: 10 minutes                                     ║
╠════════════════════════════════════════════════════════════╣
║  NOTE: This is a development placeholder.                  ║
║  Configure a real email service for production.            ║
╚════════════════════════════════════════════════════════════╝
  `);

  // In development, always return success
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // Production email sending (configure your service)
  try {
    // Example with nodemailer (install: npm install nodemailer)
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: process.env.SMTP_PORT,
    //   secure: true,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS,
    //   },
    // });
    //
    // await transporter.sendMail({
    //   from: process.env.SMTP_FROM,
    //   to: email,
    //   subject: 'UFAR Network - Email Verification',
    //   html: `
    //     <h1>Welcome to UFAR Network!</h1>
    //     <p>Your verification code is: <strong>${code}</strong></p>
    //     <p>This code will expire in 10 minutes.</p>
    //   `,
    // });

    // For now, just log in production too
    console.log(`[MAIL] Verification code for ${email}: ${code}`);
    return true;
  } catch (error) {
    console.error("[MAIL] Failed to send verification email:", error);
    return false;
  }
}

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 * @returns {Promise<boolean>} - Success status
 */
export async function sendPasswordResetEmail(email, resetToken) {
  console.log(`[MAIL] Password reset for ${email}: ${resetToken}`);

  // TODO: Implement password reset email
  // const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

  return true;
}

/**
 * Send welcome email after successful registration
 * @param {string} email - Recipient email address
 * @param {string} fullName - User's full name
 * @returns {Promise<boolean>} - Success status
 */
export async function sendWelcomeEmail(email, fullName) {
  console.log(`[MAIL] Welcome email to ${email} (${fullName})`);

  // TODO: Implement welcome email

  return true;
}
