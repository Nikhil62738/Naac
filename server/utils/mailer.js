import nodemailer from "nodemailer";
import https from "https";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_USER = process.env.SMTP_USER;
const EMAIL_PASS = process.env.SMTP_PASS;

let emailTransporter = null;

if (EMAIL_USER && EMAIL_PASS && !EMAIL_USER.includes("your-gmail")) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465 || !process.env.SMTP_PORT, // true for 465, false for 587
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false }, // Useful for Render/hosting platforms
    family: 4 // Force IPv4 to avoid ENETUNREACH on IPv6, very common on Render
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendViaBrevo(to, subject, html) {
  if (!BREVO_API_KEY) return false;
  
  const data = JSON.stringify({
    sender: { name: "NAAC Portal", email: EMAIL_USER || "no-reply@naac.local" },
    to: [{ email: to }],
    subject,
    htmlContent: html
  });

  const options = {
    hostname: 'api.brevo.com',
    port: 443,
    path: '/v3/smtp/email',
    method: 'POST',
    headers: { 
      'Accept': 'application/json', 
      'Content-Type': 'application/json', 
      'api-key': BREVO_API_KEY 
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      if (res.statusCode >= 300) {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => console.error(`[Brevo Email Failed] Code: ${res.statusCode} | Error: ${body}`));
        resolve(false);
      } else {
        resolve(true);
      }
    });
    req.on('error', (e) => { 
      console.error("Brevo Email Request Error:", e.message); 
      resolve(false); 
    });
    req.write(data);
    req.end();
  });
}

async function sendEmailUniversal(to, subject, html, text) {
  // 1. Try Nodemailer first (Primary protocol)
  if (emailTransporter) {
    try {
      const info = await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || `"NAAC Portal" <${EMAIL_USER || 'no-reply@naac.local'}>`,
        to,
        subject,
        text,
        html
      });
      console.log(`[Email Sent] Nodemailer SUCCESS to: ${to}`);
      return { messageId: info.messageId, preview: "" };
    } catch (e) {
      console.error("[Email Failed] Nodemailer error:", e.message);
    }
  }

  // 2. Try Brevo HTTPS fallback (Secondary protocol)
  if (BREVO_API_KEY) {
    const success = await sendViaBrevo(to, subject, html);
    if (success) {
      console.log(`[Email Sent] Brevo SUCCESS to: ${to}`);
      return { messageId: "brevo-id", preview: "" };
    }
  }

  // 3. Mock Fallback (for local development without keys)
  console.log(`\n📧 [Email Mock] To: ${to} | Subject: ${subject}\n`);
  return { messageId: "mock-id", preview: "" };
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
