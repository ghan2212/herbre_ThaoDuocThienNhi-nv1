const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');
 
// Simple Inquiry schema (inline, no separate model file needed)
const inquirySchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  note:    { type: String, default: '' },
  status:  { type: String, enum: ['new','contacted','done'], default: 'new' },
  source:  { type: String, default: 'website' }
}, { timestamps: true });
 
const Inquiry = mongoose.models.Inquiry || mongoose.model('Inquiry', inquirySchema);
 
// @POST /api/contact — Gửi thông tin tư vấn
router.post('/', async (req, res) => {
  try {
    const { name, phone, note } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập họ tên và số điện thoại' });
    }
    const inquiry = await Inquiry.create({ name, phone, note });
    res.status(201).json({ success: true, message: 'Đã nhận thông tin! Chúng tôi sẽ liên hệ sớm.', data: inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// @GET /api/contact — Admin: xem danh sách tư vấn
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const total = await Inquiry.countDocuments(filter);
    const items = await Inquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data: items, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// @PUT /api/contact/:id — Admin: cập nhật trạng thái
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!inquiry) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// @DELETE /api/contact/:id — Admin: xoá
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Inquiry.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xoá' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
module.exports = router;
 