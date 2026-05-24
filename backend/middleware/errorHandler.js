// Central error handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log in dev
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error.message = 'Không tìm thấy dữ liệu với ID này';
    return res.status(404).json({ success: false, message: error.message });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `${field === 'email' ? 'Email' : field} này đã được sử dụng`;
    return res.status(400).json({ success: false, message: error.message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join('. ') });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Lỗi máy chủ, vui lòng thử lại sau'
  });
};

// 404 handler
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Không tìm thấy route: ${req.originalUrl}` });
};

module.exports = { errorHandler, notFound };
