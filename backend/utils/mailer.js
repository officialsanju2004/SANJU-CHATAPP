// Sends transactional emails (currently just the forgot-password OTP) via
// Brevo's HTTP API (https://api.brevo.com) instead of raw SMTP.
//
// Why Brevo specifically: Render's free tier blocks outbound SMTP ports
// (25/465/587), so this needs to go over HTTPS (443) instead - same reason
// we moved off nodemailer. Unlike some other HTTP-API providers, Brevo lets
// you send to ANY recipient once you verify a single sender EMAIL ADDRESS
// (a 6-digit code sent to that inbox) - it does not require you to own and
// verify a whole domain. That matters here since this project doesn't have
// a domain.
//
// Setup:
//   1. Create a free account at https://brevo.com (300 emails/day, no card).
//   2. Settings > Senders, Domains & Dedicated IPs > Senders > Add a sender.
//      Use any email you already control (e.g. your Gmail) and verify it
//      via the code Brevo emails you.
//   3. SMTP & API > API Keys > generate a key, set it as BREVO_API_KEY.
//   4. Set EMAIL_FROM to that verified sender address, e.g.
//      EMAIL_FROM="Sanju Chat <godsanju21@gmail.com>"
//      (Must be the exact address you verified in step 2, or Brevo rejects
//      the send with a 401/400.)

const { BREVO_API_KEY, EMAIL_FROM } = process.env;

export const mailConfigured = Boolean(BREVO_API_KEY && EMAIL_FROM);

if (!mailConfigured) {
  console.warn(
    'Email is not configured (missing BREVO_API_KEY and/or EMAIL_FROM). Forgot-password emails ' +
      'will be skipped. Get a free key at https://brevo.com, verify a sender email, and set both ' +
      'env vars - see README.'
  );
}

function parseFrom(fromString) {
  // Accepts either "Name <email@x.com>" or a bare "email@x.com"
  const match = /^(.*)<(.+)>$/.exec(fromString || '');
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, '') || undefined, email: match[2].trim() };
  }
  return { email: (fromString || '').trim() };
}

async function sendMail({ to, subject, html, text }) {
  if (!mailConfigured) {
    // Fail loudly in logs but don't crash the request - the route decides
    // how to respond to the client either way.
    console.warn(`sendMail skipped (email not configured). Would have sent "${subject}" to ${to}`);
    return { skipped: true };
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseFrom(EMAIL_FROM),
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
 const data = await res.json();


if (!res.ok) {
  throw new Error(`Brevo API error ${res.status}: ${JSON.stringify(data)}`);
}

return data;
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
