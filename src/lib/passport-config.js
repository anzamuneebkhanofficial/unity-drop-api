
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import config from '../config/env.js';
import Admin from '../models/admin-model.js';
import Donor from '../models/donor-model.js';
import Patient from '../models/patient-model.js';
const options = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => req?.cookies?.accessToken || null,
    ExtractJwt.fromAuthHeaderAsBearerToken(),
  ]),
  secretOrKey: config.jwt.accessSecret,
  passReqToCallback: true,
};
passport.use(
  new JwtStrategy(options, async (req, payload, done) => {
    try {
      // Logger.info('Decoded token payload:', payload);
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
