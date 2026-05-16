import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

let resend: Resend;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY || '');
  }
  return resend;
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const from = process.env.EMAIL_FROM || 'Auth API <onboarding@resend.dev>';

  // Always send to the developer's email regardless of environment,
  // since Resend's free tier can only send to your registered email
  // until a domain is verified in Resend's dashboard.
  const actualTo = 'natsukid123@gmail.com';

  // Log original recipient for debugging
  if (actualTo !== to) {
    console.log(`[FORWARD] Email intended for "${to}" redirected to "${actualTo}"`);
  }

  console.log(`=== SENDING EMAIL ===`);
  console.log(`Original To: ${to}`);
  console.log(`Actual To: ${actualTo}`);
  console.log(`Subject: ${subject}`);
  console.log(`=====================`);

  try {
    const { data, error } = await getResend().emails.send({
      from,
      to: actualTo,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Email sent via Resend, ID:', data?.id);
    return data;
  } catch (err: any) {
    // If Resend fails (e.g. no API key), log the email content so it's still accessible
    console.log('=== EMAIL CONTENT (Resend unavailable) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html.replace(/<[^>]*>/g, '')}`);
    console.log('==========================================');
    throw err;
  }
}