import Logger from '../../utils/logger.js';
import nodemailer from 'nodemailer';
const sendEmail = async (options) => {
  // Logger.info('ax', options);
  try {
    if (!options.to) {
      throw new Error('Recipient email (options.to) is missing!');
    }
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 465,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
    });
    const mailOptions = {
      from: `"Unity Drop" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || process.env.EMAIL_FROM}>`,
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
    throw new Error(error.message || error);
  }
};

export default sendEmail;