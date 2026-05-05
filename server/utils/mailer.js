import nodemailer from "nodemailer";

let emailTransporter = null;
let initialized = false;

function getTransporter() {
  if (initialized) return emailTransporter;
  initialized = true;

  const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (EMAIL_USER && EMAIL_PASS && !EMAIL_USER.includes("your-gmail")) {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      tls: { 
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
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
      console.log(`[Email Sent] Gmail SMTP SUCCESS to: ${to}`);
      return { messageId: info.messageId, preview: "" };
    } catch (e) {
      console.error("[Email Failed] Gmail SMTP error:", e.message);
      // If it fails, we don't catch it silently in production to notify the user
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

  throw new Error("Gmail SMTP provider failed to connect. Please ensure Port 587 is open and App Password is correct.");
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
