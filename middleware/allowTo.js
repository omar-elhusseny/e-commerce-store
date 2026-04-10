import AppError from '../utils/appError.js';

/**
 * Role-based access control middleware factory.
 * Usage: allowedTo('admin', 'manager')
 * If called with no arguments, defaults to blocking the 'user' role (backward-compat).
 */
export const allowedTo = (...roles) => {
    // Backward-compat: if no roles passed, block regular users
    const allowedRoles = roles.length > 0 ? roles : ['admin', 'manager'];

    return (req, res, next) => {
        if (!req.user) return next(new AppError('Not authenticated', 401));
        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError(`Access denied. Required role(s): ${allowedRoles.join(', ')}`, 403));
        }
        next();
    };
};