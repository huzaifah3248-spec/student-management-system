const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach minimal user info to request
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      username: decoded.username
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireRole(allowedRoles) {
  // allowedRoles can be a string or array
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    
    const role = (req.user.role || '').toLowerCase();
    let allowed = [];
    
    if (Array.isArray(allowedRoles)) {
      allowed = allowedRoles.map((r) => String(r).toLowerCase());
    } else if (allowedRoles) {
      allowed = [String(allowedRoles).toLowerCase()];
    }

    if (allowed.length === 0) return next(); // no role restriction
    if (!allowed.includes(role)) return res.status(403).json({ message: 'Forbidden: insufficient role.' });
    
    return next();
  };
}

module.exports = {
  authenticateJWT,
  requireRole
};