import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER.trim(),
      pass: process.env.EMAIL_PASS.replace(/\s+/g, '')
    }
  });
}

export async function sendOtpEmail(toEmail, otp) {
  console.log(`[PosTera OTP] Kode verifikasi untuk ${toEmail}: ${otp}`);

  if (!transporter) {
    return;
  }

  const mailOptions = {
    from: `"PosTera ITERA" <${process.env.EMAIL_USER.trim()}>`,
    to: toEmail,
    subject: `Kode Verifikasi Pendaftaran PosTera: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 10px;">
        <h2 style="color: #0C4A6E; margin-top: 0; text-align: center;">Portal PosTera ITERA</h2>
        <p style="color: #374151; font-size: 14px;">Halo Mahasiswa ITERA,</p>
        <p style="color: #374151; font-size: 14px;">Terima kasih telah mendaftar di PosTera. Gunakan kode verifikasi di bawah ini untuk mengonfirmasi pendaftaran akun Anda:</p>
        <div style="background-color: #F0F9FF; border: 1px solid #BAE6FD; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0369A1; border-radius: 8px; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #6B7280; font-size: 12px; margin-bottom: 0;">Kode ini hanya berlaku selama <strong>5 menit</strong>. Jangan bagikan kode ini kepada pihak mana pun demi keamanan akun Anda.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[PosTera Mailer] Email OTP BERHASIL terkirim ke: ${toEmail}`);
  } catch (error) {
    console.error(`[PosTera Mailer] Gagal mengirim email ke ${toEmail}:`, error.message);
  }
}
