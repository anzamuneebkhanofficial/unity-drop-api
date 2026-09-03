import Logger from '../../utils/logger.js';
import nodemailer from 'nodemailer';
const sendEmail = async (options) => {
  // Logger.info('ax', options);
  try {
    if (!options.to) {
      throw new Error('Recipient email (options.to) is missing!');
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // SSL on 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls:
        process.env.NODE_ENV === 'production'
          ? {}
          : { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: `"Unity Drop" <${process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        Importance: 'High',
      },
    };

    const info = await transporter.sendMail(mailOptions);
    // Logger.info('✅ Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    Logger.error('❌ Error sending email:', error.message);
    throw error.message;
  }
};

export default sendEmail;