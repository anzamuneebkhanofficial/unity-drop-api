import Logger from '../../utils/logger.js';
import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  try {
    if (!options.to) {
      throw new Error('Recipient email (options.to) is missing!');
    }

    // 1. IN PRODUCTION: Use the HTTPS Email Bridge via Vercel to bypass Render's SMTP port blocks
    const relayUrl =
      process.env.EMAIL_RELAY_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://unity-drop-web.vercel.app/api-internal-email'
        : null);

    if (relayUrl) {
      try {
        Logger.info(`📡 Sending email to ${options.to} via HTTPS Email Bridge...`);
        const response = await fetch(relayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret':
              process.env.INTERNAL_EMAIL_SECRET ||
              'unity_drop_internal_email_secret_2026',
          },
          body: JSON.stringify({
            to: options.to,
            subject: options.subject,
            html: options.html,
          }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          Logger.info(
            `✅ [HTTPS Bridge] Email sent successfully to ${options.to}: ${data.messageId}`
          );
          return data;
        } else {
          Logger.error(
            `⚠️ HTTPS Bridge returned error: ${data.error || response.statusText}. Falling back to direct SMTP...`
          );
        }
      } catch (bridgeErr) {
        Logger.error(
          `⚠️ HTTPS Bridge request failed: ${bridgeErr.message}. Falling back to direct SMTP...`
        );
      }
    }

    // 2. LOCALHOST / FALLBACK: Direct Nodemailer SMTP
    const port = parseInt(process.env.SMTP_PORT, 10) || 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: port,
      secure: port === 465, // SSL on 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
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
    Logger.info(`✅ [Direct SMTP] Email sent successfully to ${options.to}: ${info.messageId}`);
    return info;
  } catch (error) {
    Logger.error(`❌ Error sending email: ${error.message || error}`);
    throw error.message || error;
  }
};

export default sendEmail;