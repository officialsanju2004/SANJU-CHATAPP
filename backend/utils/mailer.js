import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE } = process.env;

export const mailConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter = null;

if (mailConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    // true for port 465 (implicit TLS), false for 587/25 (STARTTLS)
    secure: SMTP_SECURE ? SMTP_SECURE === 'true' : Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else {
  console.warn(
    'Email is not configured (missing SMTP_HOST / SMTP_USER / SMTP_PASS). ' +
      'Forgot-password emails will be skipped. Add SMTP_* vars to backend/.env - ' +
      'see README for setup with Gmail, Resend, Brevo, etc.'
  );
}

async function sendMail({ to, subject, html, text }) {
  if (!mailConfigured) {
    // Fail loudly in logs but don't crash the request - the route decides
    // how to respond to the client either way.
    console.warn(`sendMail skipped (email not configured). Would have sent "${subject}" to ${to}`);
    return { skipped: true };
  }

  return transporter.sendMail({
    from: SMTP_FROM || `"Sanju Chat" <${SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

export async function sendOtpEmail(to, otp) {
  const subject = 'Your Sanju Chat password reset code';
  const text = `Your password reset code is ${otp}. It expires in 10 minutes. If you didn't request this, you can safely ignore this email.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2 style="color:#ff9500;">Sanju Chat</h2>
      <p>Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background:#050403; color:#ff9500; padding: 14px 20px; border-radius: 10px; text-align:center;">
        ${otp}
      </p>
      <p style="color:#888; font-size: 13px;">
        If you didn't request a password reset, you can safely ignore this email - your password won't change.
      </p>
    </div>
  `;
  return sendMail({ to, subject, html, text });
}
