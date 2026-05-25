/** @format */

import passport from 'passport';
export const authenticateJWT = (roles = []) => {
  return (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
      if (err) return next(err);
      // Logger.info('user kill', user);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      // Debug logs
      // Logger.info('Authenticated user:', user);
      // Logger.info('User role:', user.role);
      // Role check (if roles are provided)
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({
          message: 'Forbidden: Insufficient permissions',
        });
      }
      // Attach user to request
      req.user = user;
      next();
    })(req, res, next);
  };
};
