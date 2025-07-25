const cors = require('cors');

// Development CORS configuration
const developmentCorsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Production CORS configuration
const productionCorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(url => url.trim())
      : [];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining'
  ],
  optionsSuccessStatus: 200
};

// Public endpoints CORS (more permissive for public notes)
const publicCorsOptions = {
  origin: true, // Allow all origins for public content
  credentials: false,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept'
  ],
  optionsSuccessStatus: 200
};

// Get CORS configuration based on environment
const getCorsOptions = () => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return productionCorsOptions;
    case 'development':
    default:
      return developmentCorsOptions;
  }
};

// Custom CORS middleware for different endpoints
const configureCors = () => {
  const mainCors = cors(getCorsOptions());
  const publicCors = cors(publicCorsOptions);

  return (req, res, next) => {
    // Use more permissive CORS for public endpoints
    if (req.path.startsWith('/api/notes/public/') || req.path === '/api/health') {
      return publicCors(req, res, next);
    }
    
    // Use main CORS configuration for all other endpoints
    return mainCors(req, res, next);
  };
};

// Preflight handler for complex requests
const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    return res.status(200).end();
  }
  next();
};

// CORS error handler
const corsErrorHandler = (err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy violation: Origin not allowed',
      origin: req.headers.origin
    });
  }
  next(err);
};

module.exports = {
  configureCors,
  handlePreflight,
  corsErrorHandler,
  getCorsOptions,
  developmentCorsOptions,
  productionCorsOptions,
  publicCorsOptions
};