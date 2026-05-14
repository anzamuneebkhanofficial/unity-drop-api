/** @format */
import retry from 'async-retry';
import https from 'https';
import Logger from '../utils/logger.js';

export const verifyCaptcha = async (req, res, next) => {
  try {
    const token = req.body.captchaToken;
    if (!token) {
      return res.status(400).json({ error: 'Security verification failed. Please refresh the page and try again.' });
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const postData = `secret=${secret}&response=${token}`;

    const verifyWithGoogle = () => {
      return new Promise((resolve, reject) => {
        // Industry Standard: Force IPv4 to prevent Node.js IPv6 hanging issues
        const options = {
          hostname: 'www.google.com',
          port: 443,
          path: '/recaptcha/api/siteverify',
          method: 'POST',
          family: 4, // 🎯 CRITICAL: Fixes the timeout error caused by IPv6 blackholing
          timeout: 5000, // 5 second timeout at socket level
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
          },
        };

        const request = https.request(options, (response) => {
          let data = '';
          response.on('data', (chunk) => { data += chunk; });
          response.on('end', () => {
            try {
              if (response.statusCode >= 500) {
                return reject(new Error('Google Captcha Server Error'));
              }
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Invalid response from Google Captcha'));
            }
          });
        });

        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Captcha Verification timed out'));
        });

        request.on('error', (e) => {
          reject(new Error(`Captcha Request Failed: ${e.message}`));
        });

        request.write(postData);
        request.end();
      });
    };

    // 🏥 Industry Standard: Implement Retries for external API dependencies
    const data = await retry(
      async (bail) => {
        try {
          return await verifyWithGoogle();
        } catch (error) {
          if (error.message.includes('Google Captcha Server Error')) {
            throw error; // retryable
          }
          if (error.message.includes('timed out') || error.message.includes('Request Failed')) {
            throw error; // retryable
          }
          bail(error); // not retryable
        }
      },
      {
        retries: 2,
        minTimeout: 500,
        onRetry: (err) => Logger.warn(`Retrying Captcha Verification due to: ${err.message}`),
      }
    );

    if (!data.success) {
      return res.status(403).json({ error: 'Captcha verification failed. Please refresh the page and try again.' });
    }

    // reCAPTCHA v3 score check
    if (data.score !== undefined && data.score < 0.5) {
      return res.status(403).json({ error: 'Captcha score too low. Suspicious activity detected.' });
    }

    next();
  } catch (err) {
    Logger.error('Captcha Global Error:', err.message);
    res.status(500).json({ error: 'Captcha verification timed out or service is unavailable. Please refresh and try again.' });
  }
};

