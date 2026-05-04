import nodemailer from "nodemailer";

function createTransporter() {
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const hasRealCredentials = user && pass && !user.includes("your-gmail") && !pass.includes("your-gmail-app-password");

  if (!process.env.SMTP_HOST || !hasRealCredentials) {
    return nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      : undefined
  });
}

export async function sendReminderEmail({ to, teacherName, senderName, message }) {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "NAAC Portal <no-reply@naac.local>",
    to,
    subject: "NAAC Documentation Reminder",
    text: [
      `Hello ${teacherName},`,
      "",
      message,
      "",
      `Reminder sent by: ${senderName}`,
      "",
      "Please log in to the NAAC File Management System and complete the pending work."
    ].join("\n"),
    html: `
      <p>Hello ${teacherName},</p>
      <p>${escapeHtml(message)}</p>
      <p><strong>Reminder sent by:</strong> ${escapeHtml(senderName)}</p>
      <p>Please log in to the NAAC File Management System and complete the pending work.</p>
    `
  });

  return {
    messageId: info.messageId,
    preview: info.message?.toString?.() || ""
  };
}

export async function sendVerificationEmail({ to, teacherName, senderName, criterionCode, status, comment }) {
  const message = `${criterionCode} has been marked ${status}.${comment ? ` Comment: ${comment}` : ""}`;
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "NAAC Portal <no-reply@naac.local>",
    to,
    subject: `NAAC ${criterionCode} ${status}`,
    text: [
      `Hello ${teacherName},`,
      "",
      message,
      "",
      `Reviewed by: ${senderName}`,
      "",
      "Please log in to the NAAC File Management System to view the updated status."
    ].join("\n"),
    html: `
      <p>Hello ${escapeHtml(teacherName)},</p>
      <p>${escapeHtml(message)}</p>
      <p><strong>Reviewed by:</strong> ${escapeHtml(senderName)}</p>
      <p>Please log in to the NAAC File Management System to view the updated status.</p>
    `
  });

  return {
    messageId: info.messageId,
    preview: info.message?.toString?.() || ""
  };
}

export async function sendPasswordOtpEmail({ to, name, otp }) {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "NAAC Portal <no-reply@naac.local>",
    to,
    subject: "NAAC Portal Password Reset OTP",
    text: [
      `Hello ${name},`,
      "",
      `Your password reset OTP is: ${otp}`,
      "",
      "This OTP is valid for 10 minutes. If you did not request this, ignore this email."
    ].join("\n"),
    html: `
      <p>Hello ${escapeHtml(name)},</p>
      <p>Your password reset OTP is:</p>
      <h2>${escapeHtml(otp)}</h2>
      <p>This OTP is valid for 10 minutes. If you did not request this, ignore this email.</p>
    `
  });

  return {
    messageId: info.messageId,
    preview: info.message?.toString?.() || ""
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
