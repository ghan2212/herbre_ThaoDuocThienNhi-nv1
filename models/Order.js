const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  emoji: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Guest checkout info
  customerInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    note: { type: String }
  },
  items: [orderItemSchema],
  itemsTotal: { type: Number, required: true },
  shippingFee: { type: Number, default: 30000 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'vnpay', 'momo', 'zalopay', 'bank_transfer'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  // VNPay specific
  vnpayTransactionId: { type: String },
  vnpayResponseCode: { type: String },
  vnpayBankCode: { type: String },
  paidAt: { type: Date },
  shippedAt: { type: Date },
  deliveredAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String },
  trackingNumber: { type: String },
  statusHistory: [{
    status: String,
    note: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Auto-generate order code
orderSchema.pre('save', function (next) {
  if (!this.orderCode) {
    const prefix = 'HB';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderCode = `${prefix}${timestamp}${random}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
