const nodemailer = require("nodemailer");

function createTransport() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendOTP(email, otp, type) {
  const isSignup = type === "signup";

  const subject = isSignup
    ? "TaskFlow — Verify your email"
    : "TaskFlow — Password reset code";

  const html = isSignup
    ? `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b0f1a;border-radius:16px;color:#e9eefc">
        <h2 style="margin:0 0 8px;font-size:22px">Verify your email</h2>
        <p style="color:#a9b4d6;margin:0 0 24px">Enter this code in TaskFlow to activate your account.</p>
        <div style="font-size:38px;font-weight:900;letter-spacing:14px;background:#121a2b;padding:20px 24px;border-radius:12px;text-align:center;color:#7c5cff">${otp}</div>
        <p style="color:#a9b4d6;font-size:13px;margin-top:24px">Expires in <b>10 minutes</b>. If you didn't request this, ignore this email.</p>
      </div>`
    : `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0b0f1a;border-radius:16px;color:#e9eefc">
        <h2 style="margin:0 0 8px;font-size:22px">Reset your password</h2>
        <p style="color:#a9b4d6;margin:0 0 24px">Enter this code in TaskFlow to reset your password.</p>
        <div style="font-size:38px;font-weight:900;letter-spacing:14px;background:#121a2b;padding:20px 24px;border-radius:12px;text-align:center;color:#ff4d6d">${otp}</div>
        <p style="color:#a9b4d6;font-size:13px;margin-top:24px">Expires in <b>10 minutes</b>. If you didn't request this, ignore this email.</p>
      </div>`;

  const transport = createTransport();

  if (!transport) {
    // Dev fallback: print OTP to server console
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  [DEV OTP] ${type.toUpperCase()} code for ${email}`);
    console.log(`  Code: ${otp}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return;
  }

  await transport.sendMail({
    from: `"TaskFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
    text: `Your ${isSignup ? "verification" : "password reset"} code is: ${otp}\n\nExpires in 10 minutes.`,
  });
}

module.exports = { sendOTP };
