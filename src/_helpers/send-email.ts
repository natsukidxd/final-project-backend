import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';

dotenv.config();

const resolve4 = promisify(dns.resolve4);

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

  // Resolve hostname to IPv4 address explicitly to avoid IPv6 ENETUNREACH errors
  // on hosts like Render that don't support outbound IPv6
  let smtpHost = process.env.SMTP_HOST!;
  try {
    const addresses = await resolve4(smtpHost);
    if (addresses.length > 0) {
      smtpHost = addresses[0];
      console.log(`Resolved ${process.env.SMTP_HOST} -> ${smtpHost} (IPv4)`);
    }
  } catch (err) {
    console.warn(`Failed to resolve ${process.env.SMTP_HOST} to IPv4, using hostname:`, err);
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''), // strip spaces from app password
    },
    pool: false,
    // Use TLS SNI with the original hostname for proper certificate validation
    // when connecting via raw IP address
    tls: {
      servername: process.env.SMTP_HOST,
    },
    connectionTimeout: 10000, // 10s timeout on connection
    greetingTimeout: 10000,
    socketTimeout: 15000, // 15s socket timeout
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