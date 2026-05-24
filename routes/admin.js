const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Blog = require('../models/Blog');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, authorize('admin'));

// @GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers, newUsersThisMonth,
      totalProducts, lowStockProducts,
      totalBlogs,
      revenueThis, revenueLast,
      orderStats,
      recentOrders,
      topProducts,
      revenueByDay
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', createdAt: { $gte: startOfMonth } }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, stock: { $lte: 20 } }),
      Blog.countDocuments({ isPublished: true }),

      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, status: { $nin: ['cancelled', 'refunded'] } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, status: { $nin: ['cancelled', 'refunded'] } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderCode customerInfo totalAmount status paymentMethod createdAt')
        .lean(),
      Product.find({ isActive: true })
        .sort({ sold: -1 })
        .limit(5)
        .select('name emoji sold price category')
        .lean(),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, status: { $nin: ['cancelled'] } } },
        {
          $group: {
            _id: { $dateToString: { format: '%d/%m', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    const thisMonthRevenue = revenueThis[0]?.revenue || 0;
    const lastMonthRevenue = revenueLast[0]?.revenue || 0;
    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 100;

    const orderStatusMap = {};
    orderStats.forEach(s => { orderStatusMap[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          newUsersThisMonth,
          totalProducts,
          lowStockProducts,
          totalBlogs,
          thisMonthRevenue,
          lastMonthRevenue,
          revenueGrowth,
          thisMonthOrders: revenueThis[0]?.count || 0
        },
        orderStatus: orderStatusMap,
        recentOrders,
        topProducts,
        revenueByDay
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).lean(),
      User.countDocuments(filter)
    ]);

    res.json({ success: true, data: users, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/admin/users/:id/toggle
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Không thể khoá tài khoản admin' });

    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: user.isActive ? 'Đã mở khoá tài khoản' : 'Đã khoá tài khoản', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/admin/low-stock
router.get('/low-stock', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, stock: { $lte: 30 } })
      .sort({ stock: 1 })
      .select('name emoji stock sold category price')
      .lean();
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/admin/products/:id/restock
router.put('/products/:id/restock', async (req, res) => {
  try {
    const { quantity } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { stock: Number(quantity) } },
      { new: true }
    );
    res.json({ success: true, data: product, message: `Đã nhập thêm ${quantity} sản phẩm` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
