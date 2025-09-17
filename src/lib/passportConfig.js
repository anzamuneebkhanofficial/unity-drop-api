/** @format */
import dotenv from 'dotenv';
dotenv.config();
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

// Import all your models
import Admin from '../models/admin.model.js';
import Donor from '../models/donor.model.js';
import Patient from '../models/patient.model.js';

const options = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    // 1️⃣ First check cookie
    (req) => req?.cookies?.accessToken || null,

    // 2️⃣ Fallback: check Authorization header
    ExtractJwt.fromAuthHeaderAsBearerToken(),
  ]),
  // Use the SAME secret you use in jwt.sign()
  secretOrKey: process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
  passReqToCallback: true,
};

passport.use(
  new JwtStrategy(options, async (req, payload, done) => {
    try {
      // console.log('Decoded token payload:', payload);

      let user;
      switch (payload.role) {
        case 'admin':
          user = await Admin.findById(payload.userId).select('-password');
          break;
        case 'donor':
          user = await Donor.findById(payload.userId).select('-password');
          break;
        case 'patient':
          user = await Patient.findById(payload.userId).select('-password');
          break;
        default:
          return done(null, false, { message: 'Invalid role in token' });
      }

      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  })
);

export default passport;
