import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  return await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: email,
    subject: 'Reset your password',
    html: `
      <h1>Reset Password</h1>
      <p>Click the link below to reset your password. It will expire in 1 hour.</p>
      <a href="${resetLink}">Reset Password</a>
    `
  });
}