
const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { protect, authorize } = require('../middleware/auth');
 
// @GET /api/blogs
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 9, featured, search } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (featured === 'true') filter.isFeatured = true;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
 
    const [blogs, total] = await Promise.all([
      Blog.find(filter, '-content')
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Blog.countDocuments(filter)
    ]);
 
    res.json({
      success: true,
      data: blogs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// @GET /api/blogs/categories
router.get('/categories', async (req, res) => {
  const labels = {
    'kien-thuc': 'Kiến thức thảo dược',
    'lam-dep': 'Làm đẹp',
    'suc-khoe': 'Sức khoẻ',
    'cong-thuc': 'Công thức DIY',
    'tin-tuc': 'Tin tức'
  };
  const cats = await Blog.aggregate([
    { $match: { isPublished: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  res.json({
    success: true,
    data: cats.map(c => ({ slug: c._id, label: labels[c._id] || c._id, count: c.count }))
  });
});
 
// @GET /api/blogs/id/:id  ← dành cho admin edit (phải đặt TRƯỚC /:slug)
router.get('/id/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// @GET /api/blogs/:slug
router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, isPublished: true },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('relatedProducts', 'name emoji price slug');
 
    if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
 
    // Get related blogs same category
    const related = await Blog.find({
      category: blog.category,
      _id: { $ne: blog._id },
      isPublished: true
    }, '-content').limit(3).lean();
 
    res.json({ success: true, data: blog, related });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
// @POST /api/blogs (Admin)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const blog = await Blog.create({ ...req.body, author: { name: req.user.name } });
    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
 
// @PUT /api/blogs/:id (Admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!blog) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
 
// @DELETE /api/blogs/:id (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Blog.findByIdAndUpdate(req.params.id, { isPublished: false });
    res.json({ success: true, message: 'Đã ẩn bài viết' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
module.exports = router;