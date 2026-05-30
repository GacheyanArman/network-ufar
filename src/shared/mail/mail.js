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
export async function sendVerificationEmail({ to, code, fullName } = {}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #1e3a5f; margin-bottom: 8px;">UFARnet Email Verification</h2>
      <p>Hello ${fullName || ""},</p>
      <p>Your verification code is:</p>
      <div style="background: #f0f4f8; border-radius: 8px; padding: 16px; text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #1e3a5f; margin: 16px 0;">${code}</div>
      <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">UFARnet &mdash; French University in Armenia</p>
    </div>
  `;

  const text = `UFARnet Email Verification\n\nHello ${fullName || ""},\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.`;

  return sendEmail({ to, subject: "UFARnet — Email Verification Code", html, text });
}

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 * @returns {Promise<boolean>} - Success status
 */
export async function sendPasswordResetEmail({ to, token, fullName } = {}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #1e3a5f; margin-bottom: 8px;">UFARnet Password Reset</h2>
      <p>Hello ${fullName || ""},</p>
      <p>We received a request to reset your password. Click the button below to choose a new one:</p>
      <a href="${resetUrl}" style="display: inline-block; background: #1e3a5f; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0;">Reset Password</a>
      <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">UFARnet &mdash; French University in Armenia</p>
    </div>
  `;

  const text = `UFARnet Password Reset\n\nHello ${fullName || ""},\n\nWe received a request to reset your password.\n\nReset link: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.`;

  return sendEmail({ to, subject: "UFARnet — Password Reset", html, text });
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
