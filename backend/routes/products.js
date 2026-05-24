const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// Build filter query helper
const buildFilter = (query) => {
  const filter = { isActive: true };
  if (query.category) filter.category = query.category;
  if (query.badge) filter.badge = query.badge;
  if (query.featured === 'true') filter.isFeatured = true;
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { tags: { $regex: query.search, $options: 'i' } }
    ];
  }
  return filter;
};

// @GET /api/products
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = '-createdAt' } = req.query;
    const filter = buildFilter(req.query);

    const sortMap = {
      'price-asc': { price: 1 },
      'price-desc': { price: -1 },
      'popular': { sold: -1 },
      'rating': { rating: -1 },
      'newest': { createdAt: -1 },
      '-createdAt': { createdAt: -1 }
    };
    const sortObj = sortMap[sort] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/products/featured
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .sort({ sold: -1 }).limit(6).lean();
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/products/categories
router.get('/categories', async (req, res) => {
  try {
    const cats = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const labels = {
      'ngam-chan': 'Ngâm chân', 'am-bung': 'Làm ấm bụng',
      'giai-doc': 'Giải độc', 'thu-gian': 'Thư giãn',
      'ngu-ngon': 'Ngủ ngon', 'lam-dep': 'Làm đẹp', 'tra-thao-duoc': 'Trà thảo dược'
    };
    res.json({
      success: true,
      data: cats.map(c => ({ slug: c._id, label: labels[c._id] || c._id, count: c.count }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { slug: req.params.id }
      ],
      isActive: true
    }).lean();

    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/products (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @PUT /api/products/:id (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @DELETE /api/products/:id (Admin - soft delete)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Đã ẩn sản phẩm' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/products/:id/reviews
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đánh giá và nhận xét' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: 'Bạn đã đánh giá sản phẩm này rồi' });
    }

    // Kiểm tra đã mua hàng chưa
    const Order = require('../models/Order');
    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'items.product': req.params.id,
      status: { $in: ['delivered', 'shipped', 'confirmed', 'processing'] }
    });
    if (!hasPurchased) {
      return res.status(403).json({ success: false, message: 'Bạn cần mua sản phẩm này trước khi đánh giá' });
    }

    product.reviews.push({ user: req.user._id, name: req.user.name, rating: Number(rating), comment });
    await product.save();
    res.status(201).json({ success: true, message: 'Cảm ơn bạn đã đánh giá!' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @GET /api/products/:id/can-review (check if user bought product)
router.get('/:id/can-review', protect, async (req, res) => {
  try {
    const Order = require('../models/Order');
    const Product = require('../models/Product');

    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'items.product': req.params.id,
      status: { $in: ['delivered', 'shipped', 'confirmed', 'processing'] }
    });

    const product = await Product.findById(req.params.id).select('reviews');
    const alreadyReviewed = product?.reviews?.some(r => r.user.toString() === req.user._id.toString());

    res.json({ success: true, canReview: !!hasPurchased && !alreadyReviewed, hasPurchased: !!hasPurchased, alreadyReviewed: !!alreadyReviewed });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
