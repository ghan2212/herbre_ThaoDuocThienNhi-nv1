const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  combo: { type: mongoose.Schema.Types.ObjectId, ref: 'Combo' },
  itemType: { type: String, enum: ['product', 'combo'], default: 'product' },
  name: String,
  emoji: String,
  price: Number,
  quantity: { type: Number, default: 1, min: 1 }
});

cartItemSchema.virtual('subtotal').get(function () {
  return this.price * this.quantity;
});

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  sessionId: { type: String },
  items: [cartItemSchema],
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, toJSON: { virtuals: true } });

cartSchema.virtual('totalAmount').get(function () {
  return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

cartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

module.exports = mongoose.model('Cart', cartSchema);
