const mongoose = require('mongoose');
const slugify = require('../utils/slugify');
const comboSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  tagline: { type: String },
  label: { type: String },
  description: { type: String },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 },
    name: String
  }],
  originalPrice: { type: Number, required: true },
  price: { type: Number, required: true },
  savingAmount: { type: Number },
  savingPercent: { type: Number },
  emoji: { type: String, default: '🎁' },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  stock: { type: Number, default: 50 },
  sold: { type: Number, default: 0 },
  slug: {
  type: String,
  unique: true,
  required: true
},
}, { timestamps: true });

comboSchema.pre('save', function (next) {
  this.savingAmount = this.originalPrice - this.price;
  this.savingPercent = Math.round((this.savingAmount / this.originalPrice) * 100);
  next();
});

module.exports = mongoose.model('Combo', comboSchema);
