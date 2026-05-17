import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Force Node.js to prefer IPv4 over IPv6 globally for this process
// This is the most reliable way to avoid ENETUNREACH on hosts like Render
// that don't support outbound IPv6 connections
dns.setDefaultResultOrder('ipv4first');

async function createTransport() {
  // If no SMTP credentials configured, fallback to Ethereal for development
  if (!process.env.SMTP_USER) {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  console.log(`SMTP: connecting to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} (secure: ${process.env.SMTP_SECURE})`);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''), // strip spaces from app password
    },
    pool: false,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
  } as any);
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const transport = await createTransport();
  try {
    console.log(`=== SENDING EMAIL ===`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`=====================`);

    const info: any = await transport.sendMail({
      from: process.env.EMAIL_FROM || '"Auth API" <noreply@authapi.com>',
      to,
      subject,
      html,
    });

    // For Ethereal, log the preview URL
    if (info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Ethereal Preview URL:', previewUrl);
      }
    }

    console.log('Email sent successfully, message ID:', info.messageId);
    return info;
  } catch (err: any) {
    console.error('Email sending failed:', err);
    console.log('=== EMAIL CONTENT (sending failed) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html.replace(/<[^>]*>/g, '')}`);
    console.log('======================================');
    throw err;
  } finally {
    transport.close();
  }
}