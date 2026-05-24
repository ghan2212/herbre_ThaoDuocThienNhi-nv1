const express = require('express');
const router = express.Router();
const Combo = require('../models/Combo');
const { protect, authorize } = require('../middleware/auth');

// @GET /api/combos
router.get('/', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.featured === 'true') filter.isFeatured = true;

    const combos = await Combo.find(filter)
      .populate('items.product', 'name emoji price originalPrice slug')
      .sort({ isFeatured: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: combos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/combos/:id
router.get('/:id', async (req, res) => {
  try {
    const combo = await Combo.findById(req.params.id)
      .populate('items.product', 'name emoji price originalPrice description slug');
    if (!combo) return res.status(404).json({ success: false, message: 'Không tìm thấy combo' });
    res.json({ success: true, data: combo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/combos (Admin)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const combo = await Combo.create(req.body);
    res.status(201).json({ success: true, data: combo });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @PUT /api/combos/:id (Admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const combo = await Combo.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!combo) return res.status(404).json({ success: false, message: 'Không tìm thấy combo' });
    res.json({ success: true, data: combo });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @DELETE /api/combos/:id (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Combo.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Đã ẩn combo' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
