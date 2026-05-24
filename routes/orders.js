const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// @POST /api/orders — Create order (guest or logged-in)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { customerInfo, items, paymentMethod, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
    }
    if (!customerInfo?.name || !customerInfo?.phone || !customerInfo?.address) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin giao hàng' });
    }

    // Calculate totals & validate stock
    let itemsTotal = 0;
    const orderItems = [];

    for (const item of items) {
      if (item.itemType === 'product' || !item.itemType) {
        const product = await Product.findById(item.product || item._id);
        if (!product || !product.isActive) {
          return res.status(400).json({ success: false, message: `Sản phẩm "${item.name}" không còn bán` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ success: false, message: `"${product.name}" chỉ còn ${product.stock} sản phẩm` });
        }
        orderItems.push({
          product: product._id,
          name: product.name,
          emoji: product.emoji,
          price: product.price,
          quantity: item.quantity,
          subtotal: product.price * item.quantity
        });
        itemsTotal += product.price * item.quantity;
      } else {
        // Combo item - use price from request (already validated on frontend)
        orderItems.push({
          product: item.product || item._id,
          name: item.name,
          emoji: item.emoji || '',
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        });
        itemsTotal += item.price * item.quantity;
      }
    }

    const shippingFee = itemsTotal >= 500000 ? 0 : 30000; // Free ship over 500k
    const discount = 0; // TODO: apply coupon
    const totalAmount = itemsTotal + shippingFee - discount;

    const order = await Order.create({
      user: req.user?._id,
      customerInfo,
      items: orderItems,
      itemsTotal,
      shippingFee,
      discount,
      totalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      statusHistory: [{ status: 'pending', note: 'Đơn hàng mới được tạo' }]
    });

    // Deduct stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, sold: item.quantity }
      });
    }

    // Clear cart
    if (req.user) {
      await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    }

    // Populate for response
    await order.populate('user', 'name email');

    res.status(201).json({
      success: true,
      data: order,
      message: 'Đặt hàng thành công!',
      orderCode: order.orderCode
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/orders/my — User's orders
router.get('/my', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(filter)
    ]);

    res.json({ success: true, data: orders, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/orders/track/:code — Track by order code (public)
router.get('/track/:code', async (req, res) => {
  try {
    const order = await Order.findOne({ orderCode: req.params.code.toUpperCase() })
      .select('-user -vnpayTransactionId')
      .lean();
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/orders/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    // Users can only view their own orders; admin can view all
    if (req.user.role !== 'admin' && order.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem đơn hàng này' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/orders/:id/cancel — User cancel order
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    if (order.user?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền huỷ đơn này' });
    }
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Không thể huỷ đơn hàng đang xử lý hoặc đã giao' });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = req.body.reason || 'Khách hàng huỷ';
    order.statusHistory.push({ status: 'cancelled', note: order.cancelReason });

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity, sold: -item.quantity }
      });
    }

    await order.save();
    res.json({ success: true, data: order, message: 'Đã huỷ đơn hàng' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// @GET /api/orders — Admin: all orders
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, paymentMethod, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (search) {
      filter.$or = [
        { orderCode: { $regex: search, $options: 'i' } },
        { 'customerInfo.name': { $regex: search, $options: 'i' } },
        { 'customerInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(filter)
    ]);

    res.json({ success: true, data: orders, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/orders/:id/status — Admin: update order status
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, note, trackingNumber } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    const update = { status, $push: { statusHistory: { status, note: note || '' } } };
    if (status === 'shipped') update.shippedAt = new Date();
    if (status === 'delivered') { update.deliveredAt = new Date(); update.paymentStatus = 'paid'; }
    if (trackingNumber) update.trackingNumber = trackingNumber;

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/orders/admin/stats — Admin: dashboard statistics
router.get('/admin/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalOrders, pendingOrders, totalRevenue, monthRevenue,
      todayOrders, topProducts
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $match: { status: { $in: ['delivered', 'shipped'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: thisMonth }, status: { $in: ['delivered', 'shipped', 'confirmed', 'processing'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Product.find().sort({ sold: -1 }).limit(5).select('name emoji sold price').lean()
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthRevenue: monthRevenue[0]?.total || 0,
        todayOrders,
        topProducts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
