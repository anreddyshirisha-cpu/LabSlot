/**
 * Centralized Application Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  console.error('[Error] Server exception caught:', err.stack || err.message);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && { details: err.details || err.stack })
  });
}

/**
 * 404 Not Found Handler for unmatched API routes
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Resource not found: [${req.method}] ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
