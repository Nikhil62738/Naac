import nodemailer from "nodemailer";

let emailTransporter = null;
let initialized = false;

function getTransporter() {
  if (initialized) return emailTransporter;
  initialized = true;

  const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
  
  // OAuth2 Credentials for Gmail API (Required for Render)
  const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
  const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
  const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

  if (EMAIL_USER && GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN) {
    // Gmail API via OAuth2 (uses Port 443, not blocked by Render)
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: EMAIL_USER,
        clientId: GMAIL_CLIENT_ID,
        clientSecret: GMAIL_CLIENT_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN
      }
    });
    console.log("[Mailer] Configured using Gmail API (OAuth2)");
  } else {
    // Fallback to SMTP for local development
    const EMAIL_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    if (EMAIL_USER && EMAIL_PASS && !EMAIL_USER.includes("your-gmail")) {
      emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
      });
      console.log("[Mailer] Configured using Gmail SMTP (Local/Legacy)");
    }
  }
  
  return emailTransporter;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmailUniversal(to, subject, html, text) {
  const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
  const transporter = getTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"NAAC Portal" <${EMAIL_USER}>`,
        to,
        subject,
        text,
        html
      });
      console.log(`[Email Sent] SUCCESS to: ${to}`);
      return { messageId: info.messageId, preview: "" };
    } catch (e) {
      console.error("[Email Failed] Error:", e.message);
      if (process.env.NODE_ENV === "production") {
        throw e;
      }
    }
  }

  // Local development fallback
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📧 [Email Mock] To: ${to} | Subject: ${subject}\n`);
    return { messageId: "mock-id", preview: "" };
  }

  throw new Error("Email provider failed. For Render, ensure Gmail API OAuth2 credentials are set.");
}

export async function sendReminderEmail({ to, teacherName, senderName, message }) {
  const subject = "NAAC Documentation Reminder";
  const text = [
    `Hello ${teacherName},`,
    "",
    message,
    "",
    `Reminder sent by: ${senderName}`,
    "",
    "Please log in to the NAAC File Management System and complete the pending work."
  ].join("\n");
  const html = `
    <p>Hello ${teacherName},</p>
    <p>${escapeHtml(message)}</p>
    <p><strong>Reminder sent by:</strong> ${escapeHtml(senderName)}</p>
    <p>Please log in to the NAAC File Management System and complete the pending work.</p>
  `;

  return sendEmailUniversal(to, subject, html, text);
}

export async function sendVerificationEmail({ to, teacherName, senderName, criterionCode, status, comment }) {
  const message = `${criterionCode} has been marked ${status}.${comment ? ` Comment: ${comment}` : ""}`;
  const subject = `NAAC ${criterionCode} ${status}`;
  const text = [
    `Hello ${teacherName},`,
    "",
    message,
    "",
    `Reviewed by: ${senderName}`,
    "",
    "Please log in to the NAAC File Management System to view the updated status."
  ].join("\n");
  const html = `
    <p>Hello ${escapeHtml(teacherName)},</p>
    <p>${escapeHtml(message)}</p>
    <p><strong>Reviewed by:</strong> ${escapeHtml(senderName)}</p>
    <p>Please log in to the NAAC File Management System to view the updated status.</p>
  `;

  return sendEmailUniversal(to, subject, html, text);
}

export async function sendPasswordOtpEmail({ to, name, otp }) {
  const subject = "NAAC Portal Password Reset OTP";
  const text = [
    `Hello ${name},`,
    "",
    `Your password reset OTP is: ${otp}`,
    "",
    "This OTP is valid for 10 minutes. If you did not request this, ignore this email."
  ].join("\n");
  const html = `
    <p>Hello ${escapeHtml(name)},</p>
    <p>Your password reset OTP is:</p>
    <h2>${escapeHtml(otp)}</h2>
    <p>This OTP is valid for 10 minutes. If you did not request this, ignore this email.</p>
  `;

  return sendEmailUniversal(to, subject, html, text);
}

export async function sendLoginOtpEmail({ to, name, otp }) {
  const subject = "NAAC Portal Login OTP";
  const text = [
    `Hello ${name},`,
    "",
    `Your login OTP is: ${otp}`,
    "",
    "This OTP is valid for 5 minutes."
  ].join("\n");
  const html = `
    <p>Hello ${escapeHtml(name)},</p>
    <p>Your login OTP is:</p>
    <h2>${escapeHtml(otp)}</h2>
    <p>This OTP is valid for 5 minutes.</p>
  `;

  return sendEmailUniversal(to, subject, html, text);
}
