import nodemailer from 'nodemailer';

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

function getTransporter() {
  const user = process.env.SMTP_USER?.trim();
  // Gmail muestra la contraseña de app con espacios; quitarlos
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '').trim();

  if (!user || !pass) {
    throw new Error(
      'Falta SMTP_USER o SMTP_PASS en .env.local (contraseña de aplicación de Gmail)'
    );
  }

  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const transporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME?.trim() || 'ParqueoSys';
  const fromEmail =
    process.env.SMTP_FROM?.trim() || process.env.SMTP_USER!.trim();

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
