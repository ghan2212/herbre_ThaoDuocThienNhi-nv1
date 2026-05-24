const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Tên sản phẩm không được để trống'], trim: true },
  // slug được tạo tự động trong pre('validate') – không cần required ở đây
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, required: true },
  shortDesc: { type: String },
  category: {
    type: String,
    required: true,
    enum: ['ngam-chan', 'am-bung', 'giai-doc', 'thu-gian', 'ngu-ngon', 'lam-dep', 'tra-thao-duoc'],
    index: true
  },
  ingredients: [{ name: String, benefit: String }],
  usage: { type: String },
  weight: { type: String },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number },
  discount: { type: Number, default: 0 },
  stock: { type: Number, required: true, default: 100 },
  sold: { type: Number, default: 0 },
  images: [{ type: String }],
  emoji: { type: String, default: '🌿' },
  tags: [{ type: String }],
  badge: { type: String, enum: ['Bán chạy', 'Mới', 'Hot', 'Sale', null], default: null },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  reviews: [reviewSchema],
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  benefits: [{ type: String }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: discount percent
productSchema.virtual('discountPercent').get(function () {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round((1 - this.price / this.originalPrice) * 100);
  }
  return 0;
});

// Tạo slug TRƯỚC khi validate (để không bị lỗi required)
productSchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name) + '-' + Date.now();
  }
  next();
});

// Recalculate rating khi save
productSchema.pre('save', function (next) {
  if (this.reviews.length > 0) {
    this.numReviews = this.reviews.length;
    this.rating = this.reviews.reduce((acc, r) => acc + r.rating, 0) / this.reviews.length;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
