const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({
        error: 'A record with this information already exists'
      });
    }
  
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
  
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
  
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
  
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'Something went wrong!' 
        : err.message
    });
  };
  
  module.exports = errorHandler;
  
  