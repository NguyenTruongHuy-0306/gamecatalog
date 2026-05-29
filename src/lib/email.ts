import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getFrom() {
  return process.env.RESEND_FROM_EMAIL ?? "noreply@gamecatalog.dev";
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${getAppUrl()}/verify-email?token=${token}`;
  await getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: "Verify your GameCatalog account",
    html: `
      <h2>Welcome to GameCatalog!</h2>
      <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
      <a href="${url}" style="background:#6d28d9;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">
        Verify Email
      </a>
      <p style="margin-top:16px;color:#666;font-size:12px;">If you didn't create an account, you can safely ignore this email.</p>
    `,
  });
}

export async function sendSignupOtpEmail(email: string, otp: string) {
  await getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: "Your GameCatalog verification code",
    html: `
      <h2>Verify your email</h2>
      <p>Use the code below to complete your GameCatalog registration. It expires in 15 minutes.</p>
      <div style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#6d28d9;text-align:center;padding:24px 0;">
        ${otp}
      </div>
      <p style="color:#666;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${getAppUrl()}/reset-password?token=${token}`;
  await getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: "Reset your GameCatalog password",
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${url}" style="background:#6d28d9;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">
        Reset Password
      </a>
      <p style="margin-top:16px;color:#666;font-size:12px;">If you didn't request a password reset, you can safely ignore this email.</p>
    `,
  });
}
