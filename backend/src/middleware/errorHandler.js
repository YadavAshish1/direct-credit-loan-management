const errorHandler = (err, req, res, next) => {
  console.error(`❌ ${err.message}`);

  if (err.code === '23505') {
    // PostgreSQL unique violation
    return res.status(409).json({ success: false, message: 'Record already exists' });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({ success: false, message: 'Referenced record not found' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
