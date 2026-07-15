const {
  MAILJET_API_KEY,
  MAILJET_SECRET_KEY,
  EMAIL_FROM,
} = process.env;

export const mailConfigured = Boolean(
  MAILJET_API_KEY &&
  MAILJET_SECRET_KEY &&
  EMAIL_FROM
);

if (!mailConfigured) {
  console.warn("Mailjet is not configured.");
}

function parseFrom(fromString) {
  const match = /^(.*)<(.+)>$/.exec(fromString || "");

  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, ""),
      email: match[2].trim(),
    };
  }

  return {
    name: "Sanju Chat",
    email: fromString.trim(),
  };
}

async function sendMail({ to, subject, html, text }) {
  const sender = parseFrom(EMAIL_FROM);

  const res = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`
        ).toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: sender.email,
            Name: sender.name || "Sanju Chat",
          },
          To: [
            {
              Email: to,
            },
          ],
          Subject: subject,
          TextPart: text,
          HTMLPart: html,
        },
      ],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}

export async function sendOtpEmail(to, otp) {
  const subject = "Your Sanju Chat password reset code";

  const text = `Your password reset code is ${otp}. It expires in 10 minutes.`;

  const html = `
  <div style="font-family:sans-serif">
    <h2>Sanju Chat</h2>
    <h1>${otp}</h1>
    <p>This OTP expires in 10 minutes.</p>
  </div>
  `;

  return sendMail({
    to,
    subject,
    html,
    text,
  });
}