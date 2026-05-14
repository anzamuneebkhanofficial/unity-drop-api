import Logger from '../../utils/logger.js';
/** @format */

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
      from: `"Blood Donor" <${process.env.EMAIL_FROM}>`,
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

// import nodemailer from 'nodemailer';

// const sendEmail = async (options) => {
//   try {
//     if (!options.to) {
//       throw new Error('Recipient email (options.to) is missing!');
//     }

//     let transporter;

//     if (process.env.NODE_ENV === 'production') {
//       // ✅ Production: use Resend / SendGrid / Brevo / Mailgun SMTP (recommended)
//       transporter = nodemailer.createTransport({
//         host: process.env.SMTP_HOST,
//         port: process.env.SMTP_PORT,
//         secure: process.env.SMTP_PORT == 465, // SSL if 465
//         auth: {
//           user: process.env.SMTP_USER,
//           pass: process.env.SMTP_PASS,
//         },
//       });
//     } else {
//       // ✅ Development: Gmail (works locally with App Password)
//       transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//           user: process.env.SMTP_USER,
//           pass: process.env.SMTP_PASS,
//         },
//       });
//     }

//     const mailOptions = {
//       from: `"Blood Donor" <${process.env.EMAIL_FROM}>`,
//       to: options.to,
//       subject: options.subject,
//       html: options.html,
//       headers: {
//         'X-Priority': '1',
//         'X-MSMail-Priority': 'High',
//         Importance: 'High',
//       },
//     };

//     const info = await transporter.sendMail(mailOptions);
//     Logger.info('✅ Email sent:', info.messageId);
//     return info;
//   } catch (error) {
//     Logger.error('❌ Error sending email:', error.message);
//     throw new Error(error.message);
//   }
// };

// export default sendEmail;
