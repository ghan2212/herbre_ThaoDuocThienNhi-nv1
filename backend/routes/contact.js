
const express = require('express');
const router  = express.Router();
const Contact = require('../models/Contact');
const { protect, authorize } = require('../middleware/auth');
 
// POST /api/contact — form liên hệ (name + phone bắt buộc, email không bắt buộc)
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, note, message, type = 'contact', source } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Vui lòng nhập họ tên' });
    if (!phone?.trim()) return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại' });
 
    const contact = await Contact.create({
      name: name.trim(), phone: phone.trim(),
      email: email?.trim() || undefined,
      note: (note || message || '').trim() || undefined,
      type, source: source || 'website'
    });
 
    console.log(`📬 [CONTACT] ${name} – ${phone} (${new Date().toLocaleString('vi-VN')})`);
    const msg = type === 'newsletter'
      ? '🌿 Đăng ký nhận tin thành công!'
      : '✅ Đã nhận thông tin! Chúng tôi sẽ liên hệ lại trong 30 phút.';
    res.status(201).json({ success: true, message: msg, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// GET /api/contact — danh sách (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type)   filter.type   = type;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Contact.countDocuments(filter);
    const data  = await Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    res.json({ success: true, data, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// PUT /api/contact/:id — cập nhật trạng thái (Admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!contact) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
 
// DELETE /api/contact/:id (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xoá' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
module.exports = router;