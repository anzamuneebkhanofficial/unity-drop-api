/** @format */
import passport from 'passport';

/**
 * Middleware to protect routes using Passport JWT
 * @param {Array} roles - optional array of roles allowed (e.g., ['admin'])
 */
export const authenticateJWT = (roles = []) => {
  return (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
      if (err) return next(err);
      // console.log('user kill', user);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Debug logs
      // console.log('Authenticated user:', user);
      // console.log('User role:', user.role);

      // Role check (if roles are provided)
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({
          message: 'Forbidden: Insufficient permissions',
        });
      }

      // Attach user to request object
      req.user = user;
      next();
    })(req, res, next); // Important: call the returned function
  };
};
