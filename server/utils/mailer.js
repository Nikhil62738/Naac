import https from "https";

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
          resolve(response.access_token);
        } else {
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
 */
async function sendViaGmailAPI(to, subject, html) {
  try {
    const accessToken = await getAccessToken();
    
    const str = [
      `Content-Type: text/html; charset="UTF-8"`,
      `MIME-Version: 1.0`,
      `to: ${to}`,
      `from: "NAAC Portal" <${EMAIL_USER}>`,
      `subject: ${subject}`,
      ``,
      html
    ].join('\n');

    const encodedMail = Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const data = JSON.stringify({ raw: encodedMail });

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

/**
 * Base Email Template Wrapper
 */
function emailTemplate(title, content, footer = "") {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
        .header { background: #1a73e8; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; line-height: 1.6; color: #333; }
        .footer { background: #f8f9fa; color: #666; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #e0e0e0; }
        .btn { display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
        .otp { font-size: 32px; font-weight: bold; color: #1a73e8; letter-spacing: 4px; padding: 10px; background: #f1f3f4; display: inline-block; border-radius: 4px; margin: 20px 0; }
        .warning { color: #d93025; font-size: 13px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>&copy; 2026 NAAC File Management System</p>
          <p>${footer}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendEmailUniversal(to, subject, html) {
  if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN) {
    try {
      await sendViaGmailAPI(to, subject, html);
      console.log(`[Email Sent] Gmail API SUCCESS to: ${to}`);
      return { success: true };
    } catch (e) {
      if (process.env.NODE_ENV === "production") throw e;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📧 [Email Mock] To: ${to} | Subject: ${subject}\n`);
    return { success: true, mock: true };
  }

  throw new Error("Email sending failed. Configuration missing.");
}

export async function sendReminderEmail({ to, teacherName, senderName, message }) {
  const subject = "⚠️ NAAC Documentation Reminder";
  const html = emailTemplate(
    "Pending Task Reminder",
    `
      <p>Hello <strong>${escapeHtml(teacherName)}</strong>,</p>
      <p>This is a reminder regarding pending work on the NAAC Portal.</p>
      <div style="background: #fff8e1; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin:0;"><strong>Message:</strong></p>
        <p style="margin:5px 0 0 0; color: #5f6368;">"${escapeHtml(message)}"</p>
      </div>
      <p>Sent by: <strong>${escapeHtml(senderName)}</strong></p>
      <a href="https://naacfile.netlify.app" class="btn">Log in to Portal</a>
    `,
    "Please complete the pending documents as soon as possible."
  );
  return sendEmailUniversal(to, subject, html);
}

export async function sendVerificationEmail({ to, teacherName, senderName, criterionCode, status, comment }) {
  const subject = `📌 NAAC Update: ${criterionCode} is ${status}`;
  const html = emailTemplate(
    "Criterion Status Update",
    `
      <p>Hello <strong>${escapeHtml(teacherName)}</strong>,</p>
      <p>Your submission for <strong>${escapeHtml(criterionCode)}</strong> has been reviewed.</p>
      <p>New Status: <span style="color: ${status === 'Approved' ? '#1e8e3e' : '#d93025'}; font-weight: bold;">${status}</span></p>
      ${comment ? `<p><strong>Reviewer Comment:</strong> "${escapeHtml(comment)}"</p>` : ''}
      <p>Reviewed by: <strong>${escapeHtml(senderName)}</strong></p>
      <a href="https://naacfile.netlify.app" class="btn">View Submission</a>
    `,
    "You can view more details in your dashboard."
  );
  return sendEmailUniversal(to, subject, html);
}

export async function sendPasswordOtpEmail({ to, name, otp }) {
  const subject = "🔑 NAAC Portal: Password Reset OTP";
  const html = emailTemplate(
    "Password Reset Request",
    `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>We received a request to reset your password. Use the following code to continue:</p>
      <div style="text-align: center;">
        <div class="otp">${escapeHtml(otp)}</div>
      </div>
      <p class="warning">This OTP is valid for <strong>10 minutes</strong>. If you did not request this reset, please change your password immediately or contact the admin.</p>
    `,
    "For security reasons, never share your OTP with anyone."
  );
  return sendEmailUniversal(to, subject, html);
}

export async function sendLoginOtpEmail({ to, name, otp }) {
  const subject = "🔒 NAAC Portal: Login OTP";
  const html = emailTemplate(
    "Security Verification",
    `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>Your one-time password (OTP) for logging into the NAAC Portal is:</p>
      <div style="text-align: center;">
        <div class="otp">${escapeHtml(otp)}</div>
      </div>
      <p class="warning">This OTP is valid for <strong>5 minutes</strong>. If you did not attempt to log in, please secure your account.</p>
    `,
    "Secure login enabled for HOD account."
  );
  return sendEmailUniversal(to, subject, html);
}
