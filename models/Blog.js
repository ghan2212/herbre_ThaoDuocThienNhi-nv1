const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  category: {
    type: String,
    enum: ['kien-thuc', 'lam-dep', 'suc-khoe', 'cong-thuc', 'tin-tuc'],
    default: 'kien-thuc'
  },
  tags: [String],
  author: {
    name: { type: String, default: 'Đội ngũ Herbré' },
    avatar: { type: String }
  },
  emoji: { type: String, default: '🌿' },
  thumbnail: { type: String },
  readTime: { type: Number, default: 5 },
  isPublished: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });

blogSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-') + '-' + Date.now();
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
