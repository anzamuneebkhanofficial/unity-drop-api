import Logger from '../utils/logger.js';
import config from '../config/env.js';
export const verifyCaptcha = async (req, res, next) => {
  try {
    const token = req.body.captchaToken;
    // Development bypass to eliminate network bottlenecks when running locally
    if (!config.isProduction) {
      if (!token || token === 'mock-captcha-token' || token.startsWith('mock')) {
        Logger.info('[Captcha] Development environment detected: Bypassing captcha verification.');
        return next();
      }
    }
    if (!token) {
      return res.status(400).json({ success: false, message: 'Captcha token missing.' });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    let data;
    try {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${config.recaptcha.secretKey}&response=${token}`,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      data = await response.json();
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        Logger.warn('[Captcha] Verification request timed out (exceeded 2000ms). Fail-open activated.');
      } else {
        Logger.warn(`[Captcha] Network error during verification: ${fetchErr.message}. Fail-open activated.`);
      }
      return next();
    }
    if (!data.success) {
      return res.status(403).json({ success: false, message: 'Captcha verification failed. Please try again.' });
    }
    if (data.score !== undefined && data.score < 0.5) {
      return res.status(403).json({
        success: false,
        message: 'Security verification failed. Please refresh the page and try again.',
      });
    }
    next();
  } catch (err) {
    Logger.error(`[Captcha] Verification failed unexpectedly: ${err.message}`);
    next();
  }
};