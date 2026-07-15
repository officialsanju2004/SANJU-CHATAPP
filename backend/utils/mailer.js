import nodemailer from "nodemailer";

const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

export const mailConfigured = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);

if (!mailConfigured) {
  console.warn("Gmail SMTP is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
}

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendOtpEmail(to, otp) {
  if (!mailConfigured) {
    throw new Error("Gmail SMTP is not configured (missing GMAIL_USER / GMAIL_APP_PASSWORD)");
  }

  const subject = "Your Sanju Chat password reset code";
  const text = `Your password reset code is ${otp}. It expires in 10 minutes.`;
  const html = `
  <div style="font-family:sans-serif">
    <h2>Sanju Chat</h2>
    <h1>${otp}</h1>
    <p>This OTP expires in 10 minutes.</p>
  </div>
  `;

  return getTransporter().sendMail({
    from: `"Sanju Chat" <${GMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}