import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `http://localhost:3000/reset-password?token=${token}`;

  return await resend.emails.send({
    from: 'onboarding@resend.dev', // Change to our own domain when we go live
    to: email,
    subject: 'Reset your password',
    html: `
      <h1>Reset Password</h1>
      <p>Click the link below to reset your password. It will expire in 1 hour.</p>
      <a href="${resetLink}">Reset Password</a>
    `
  });
}