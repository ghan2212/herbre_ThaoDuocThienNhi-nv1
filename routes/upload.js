// routes/upload.js – File upload endpoints
const express = require('express');
const router = express.Router();
const path = require('path');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// @POST /api/upload/product-image (Admin only)
router.post('/product-image', protect, authorize('admin'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Không có file được upload' });
  const url = `/uploads/products/${req.file.filename}`;
  res.json({ success: true, url, filename: req.file.filename });
});

// @POST /api/upload/avatar (Logged-in user)
router.post('/avatar', protect, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Không có file được upload' });
  const url = `/uploads/avatars/${req.file.filename}`;
  res.json({ success: true, url, filename: req.file.filename });
});

// @POST /api/upload/blog-image (Admin only)
router.post('/blog-image', protect, authorize('admin'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Không có file được upload' });
  const url = `/uploads/products/${req.file.filename}`;
  res.json({ success: true, url });
});

module.exports = router;
