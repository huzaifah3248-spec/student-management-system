const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  
  // Failsafe: Ensure secret exists before attempting verification
  if (!process.env.JWT_SECRET) {
    console.error('[CRITICAL] JWT_SECRET is not defined in environment variables.');
    return res.status(500).json({ message: 'Internal server configuration error.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach minimal user info to request and strictly format the role
    req.user = {
      id: decoded.sub || decoded.id,
      role: String(decoded.role).toUpperCase(),
      username: decoded.username
    };
    
    return next();
  } catch (err) {
    // Distinguish between expired and malformed tokens in logs, but keep user response generic
    console.error(`[Auth Error] ${err.message}`);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireRole(allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    
    const userRole = req.user.role; 
    let allowed = [];
    
    if (Array.isArray(allowedRoles)) {
      allowed = allowedRoles.map((r) => String(r).toUpperCase());
    } else if (allowedRoles) {
      allowed = [String(allowedRoles).toUpperCase()];
    }

    if (allowed.length === 0) return next(); // No role restriction
    
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role.' });
    }
    
    return next();
  };
}

module.exports = {
  authenticateJWT,
  requireRole
};