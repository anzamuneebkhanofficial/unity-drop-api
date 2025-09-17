/** @format */

// middlewares/verifyCaptcha.js
export const verifyCaptcha = async (req, res, next) => {
  try {
    const token = req.body.captchaToken;
    if (!token) {
      return res.status(400).json({ error: 'Missing captcha token' });
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    // console.log('secret', secret);
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`;

    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();

    if (!data.success) {
      return res.status(403).json({ error: 'Captcha verification failed' });
    }

    next(); // ✅ Passed → continue to controller
  } catch (err) {
    console.error('Captcha error:', err);
    res.status(500).json({ error: 'Captcha verification error' });
  }
};
