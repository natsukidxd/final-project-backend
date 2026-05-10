import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function createTransport() {
  // For development, try to use Ethereal if no SMTP credentials configured
  if (!process.env.SMTP_USER) {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    pool: false,
    connectionTimeout: 10000, // 10s timeout on connection
    greetingTimeout: 10000,
    socketTimeout: 15000   // 15s socket timeout
  } as any);
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const transport = await createTransport();
  try {
    const info: any = await transport.sendMail({
      from: '"Auth API" <noreply@authapi.com>',
      to,
      subject,
      html
    });

    // For Ethereal, log the preview URL
    if (info.messageId) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } finally {
    transport.close();
  }
}