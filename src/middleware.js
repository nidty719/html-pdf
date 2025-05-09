/**
 * Middleware functions for HTML to PDF service
 */

/**
 * Validate request body for HTML conversion
 */
function validateRequest(req, res, next) {
  const { html } = req.body;
  
  if (!html) {
    return res.status(400).json({
      success: false,
      error: 'HTML content is required'
    });
  }
  
  // Check HTML content size (10MB limit)
  if (typeof html === 'string' && html.length > 10 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      error: 'HTML content exceeds maximum size (10MB)'
    });
  }
  
  next();
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

/**
 * Catch-all for undefined routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Resource not found',
    message: `Cannot ${req.method} ${req.path}`
  });
}

module.exports = {
  validateRequest,
  errorHandler,
  notFoundHandler
};