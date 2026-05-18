import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Create Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Your verified email on Resend free plan — all emails will be sent here
const RESEND_VERIFIED_TO = 'natsukid123@gmail.com';

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  // Log the actual intended recipient
  console.log('=== SENDING EMAIL ===');
  console.log(`Intended recipient: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Sending via Resend to verified email: ${RESEND_VERIFIED_TO}`);
  console.log('=====================');

  // Prepend a note about the actual recipient inside the email body
  const emailHtml = `
    <div style="background:#fef3cd; border:1px solid #ffc107; padding:12px; margin-bottom:16px; border-radius:6px;">
      <strong>📧 This email was intended for:</strong> ${to}
    </div>
    ${html}
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || '"Auth API" <onboarding@resend.dev>',
      to: RESEND_VERIFIED_TO, // hardcoded to your verified email (free plan limitation)
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend API error:', error);
      throw error;
    }

    console.log('Email sent successfully via Resend, ID:', data?.id);
    return data;
  } catch (err: any) {
    console.error('Email sending failed:', err);
    console.log('=== EMAIL CONTENT (sending failed) ===');
    console.log(`Intended To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${emailHtml.replace(/<[^>]*>/g, '')}`);
    console.log('======================================');
    throw err;
  }
}