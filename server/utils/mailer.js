import https from "https";

let emailTransporter = null;
let initialized = false;

// Gmail API OAuth2 Credentials
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_USER;

/**
 * Gets a fresh Access Token using the Refresh Token
 */
async function getAccessToken() {
  const data = JSON.stringify({
    client_id: GMAIL_CLIENT_ID,
    client_secret: GMAIL_CLIENT_SECRET,
    refresh_token: GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  const options = {
    hostname: 'oauth2.googleapis.com',
    port: 443,
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const response = JSON.parse(body);
        if (response.access_token) {
          console.log("[Mailer] Access token received successfully.");
          resolve(response.access_token);
        } else {
          console.error("[Mailer] Failed to get access token:", body);
          reject(new Error(`Failed to get access token: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Sends email via Gmail API (HTTPS - Port 443)
 * This bypasses SMTP blocks on Render.
 */
async function sendViaGmailAPI(to, subject, html) {
  try {
    const accessToken = await getAccessToken();
    
    // Create RFC 822 formatted message
    const str = [
      `Content-Type: text/html; charset="UTF-8"`,
      `MIME-Version: 1.0`,
      `Content-Transfer-Encoding: 7bit`,
      `to: ${to}`,
      `from: "NAAC Portal" <${EMAIL_USER}>`,
      `subject: ${subject}`,
      ``,
      html
    ].join('\n');

    // Base64URL encode the message
    const encodedMail = Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const data = JSON.stringify({ raw: encodedMail });

    console.log("[Mailer] Sending message via Gmail API...");
    const options = {
      hostname: 'gmail.googleapis.com',
      port: 443,
      path: '/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(body));
          } else {
            reject(new Error(`Gmail API error: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  } catch (error) {
    console.error("[Gmail API Failed]:", error.message);
    throw error;
  }
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
  // Use Gmail API (HTTPS) if credentials are present
  if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN) {
    try {
      const result = await sendViaGmailAPI(to, subject, html);
      console.log(`[Email Sent] Gmail API (HTTPS) SUCCESS to: ${to}`);
      return { messageId: result.id, preview: "" };
    } catch (e) {
      if (process.env.NODE_ENV === "production") throw e;
    }
  }

  // Local development fallback
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📧 [Email Mock] To: ${to} | Subject: ${subject}\n`);
    return { messageId: "mock-id", preview: "" };
  }

  throw new Error("Email sending failed. Ensure Gmail API OAuth2 credentials are set correctly in Render.");
}

export async function sendReminderEmail({ to, teacherName, senderName, message }) {
  const subject = "NAAC Documentation Reminder";
  const html = `
    <p>Hello ${teacherName},</p>
    <p>${escapeHtml(message)}</p>
    <p><strong>Reminder sent by:</strong> ${escapeHtml(senderName)}</p>
    <p>Please log in to the NAAC File Management System and complete the pending work.</p>
  `;
  return sendEmailUniversal(to, subject, html);
}

export async function sendVerificationEmail({ to, teacherName, senderName, criterionCode, status, comment }) {
  const message = `${criterionCode} has been marked ${status}.${comment ? ` Comment: ${comment}` : ""}`;
  const subject = `NAAC ${criterionCode} ${status}`;
  const html = `
    <p>Hello ${escapeHtml(teacherName)},</p>
    <p>${escapeHtml(message)}</p>
    <p><strong>Reviewed by:</strong> ${escapeHtml(senderName)}</p>
    <p>Please log in to the NAAC File Management System to view the updated status.</p>
  `;
  return sendEmailUniversal(to, subject, html);
}

export async function sendPasswordOtpEmail({ to, name, otp }) {
  const subject = "NAAC Portal Password Reset OTP";
  const html = `
    <p>Hello ${escapeHtml(name)},</p>
    <p>Your password reset OTP is:</p>
    <h2>${escapeHtml(otp)}</h2>
    <p>This OTP is valid for 10 minutes. If you did not request this, ignore this email.</p>
  `;
  return sendEmailUniversal(to, subject, html);
}

export async function sendLoginOtpEmail({ to, name, otp }) {
  const subject = "NAAC Portal Login OTP";
  const html = `
    <p>Hello ${escapeHtml(name)},</p>
    <p>Your login OTP is:</p>
    <h2>${escapeHtml(otp)}</h2>
    <p>This OTP is valid for 5 minutes.</p>
  `;
  return sendEmailUniversal(to, subject, html);
}
