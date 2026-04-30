import nodemailer from "nodemailer";

function isDevEmailMode() {
  return process.env.EMAIL_DEV_MODE === "true";
}

function getTransporter() {
  if (isDevEmailMode()) return null;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendVerificationEmail({ to, code, fullName }) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transporter || !from) {
    console.log("");
    console.log("======================================");
    console.log(`[UFARnet DEV EMAIL CODE]`);
    console.log(`To: ${to}`);
    console.log(`Code: ${code}`);
    console.log("======================================");
    console.log("");
    return;
  }

  await transporter.sendMail({
    from,
    to,
    subject: "Your UFARnet verification code",
    text: `Hello ${fullName || "student"}, your UFARnet verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>UFARnet verification</h2>
        <p>Hello ${fullName || "student"},</p>
        <p>Your verification code is:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">
          ${code}
        </div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}