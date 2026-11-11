// src/utils/mail.ts
// Transporter de correo para las notificaciones (moderación de publicaciones, etc.).
// Usa la cuenta oficial definida en MAIL_USER / MAIL_PASS (.env). Con Gmail,
// MAIL_PASS debe ser una "contraseña de aplicación" de 16 caracteres, no la
// contraseña normal de la cuenta.
import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const MAIL_USER = String(process.env.MAIL_USER || '').trim();
const MAIL_PASS = String(process.env.MAIL_PASS || '').replace(/\s+/g, ''); // la clave de app de Google se copia con espacios

const createMailTransport = () => {
  if (MAIL_USER.toLowerCase().endsWith('@gmail.com')) {
    return createTransport({
      service: 'gmail',
      auth: { user: MAIL_USER, pass: MAIL_PASS },
    });
  }

  return createTransport({
    host: process.env.MAIL_HOST || 'smtp.zoho.com',
    port: Number(process.env.MAIL_PORT || 2525),
    secure: false,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
};

const transporter = createMailTransport();

export const sendEmail = async (to: string, subject: string, text: string) => {
  if (!MAIL_USER || !MAIL_PASS) {
    throw new Error('MAIL_USER / MAIL_PASS no están configurados en el .env');
  }

  const mailOptions = {
    from: `"Komuness" <${MAIL_USER}>`,
    to,
    subject,
    text, // mantengo texto plano; si quieres HTML, cambia a 'html'
  };
  await transporter.sendMail(mailOptions);
};
