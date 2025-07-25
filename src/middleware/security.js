const jwt = require('jsonwebtoken');

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Helper function to sanitize strings
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove potential XSS patterns
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .trim();
  };

  // Recursively sanitize object
  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  const maxSize = parseInt(process.env.MAX_REQUEST_SIZE) || 10485760; // 10MB default
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large'
    });
  }
  
  next();
};

// Content type validation
const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }

    const contentType = req.headers['content-type'];
    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header is required'
      });
    }

    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      return res.status(415).json({
        error: `Unsupported Media Type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    next();
  };
};

// IP whitelist middleware (optional)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // Skip if no IPs specified
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      console.warn(`Blocked request from unauthorized IP: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied from this IP address'
      });
    }

    next();
  };
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(body) {
    const duration = Date.now() - start;
    
    // Log request details (avoid logging sensitive data)
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    // Add user ID if authenticated
    if (req.user) {
      logData.userId = req.user.id;
    }

    // Only log errors and important actions in production
    if (process.env.NODE_ENV === 'production') {
      if (res.statusCode >= 400 || req.method !== 'GET') {
        console.log(JSON.stringify(logData));
      }
    } else {
      console.log(JSON.stringify(logData));
    }

    originalSend.call(this, body);
  };

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (basic)
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;");
  
  next();
};

// API key validation (if using API keys)
const validateApiKey = (req, res, next) => {
  // Skip for public endpoints
  if (req.path.includes('/public/') || req.path === '/api/health') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  // Skip if no API key is configured
  if (!validApiKey) {
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      error: 'Invalid or missing API key'
    });
  }

  next();
};

// JWT token validation helper
const validateJWTFormat = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Check if token has the correct format (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    // Try to decode without verification (just format check)
    const decoded = jwt.decode(token);
    return decoded !== null;
  } catch (error) {
    return false;
  }
};

// Request timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    res.setTimeout(timeoutMs, () => {
      res.status(408).json({
        error: 'Request timeout'
      });
    });
    next();
  };
};

module.exports = {
  sanitizeInput,
  requestSizeLimiter,
  validateContentType,
  ipWhitelist,
  requestLogger,
  securityHeaders,
  validateApiKey,
  validateJWTFormat,
  requestTimeout
};