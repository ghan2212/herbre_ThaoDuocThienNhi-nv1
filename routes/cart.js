const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Combo = require('../models/Combo');
const { optionalAuth } = require('../middleware/auth');

// All cart routes use optional auth (works for guests too via sessionId)
router.use(optionalAuth);

const getCartQuery = (req) => {
  if (req.user) return { user: req.user._id };
  const sessionId = req.headers['x-session-id'];
  if (sessionId) return { sessionId };
  return null;
};

// @GET /api/cart
router.get('/', async (req, res) => {
  try {
    const query = getCartQuery(req);
    if (!query) return res.json({ success: true, data: { items: [], totalAmount: 0, totalItems: 0 } });

    const cart = await Cart.findOne(query).lean();
    if (!cart) return res.json({ success: true, data: { items: [], totalAmount: 0, totalItems: 0 } });

    const totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    res.json({ success: true, data: { ...cart, totalAmount, totalItems } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/cart/add
router.post('/add', async (req, res) => {
  try {
    const { productId, comboId, quantity = 1 } = req.body;
    const query = getCartQuery(req);

    let itemData = null;
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      if (product.stock < quantity) {
        return res.status(400).json({ success: false, message: 'Số lượng vượt quá tồn kho' });
      }
      itemData = { product: productId, itemType: 'product', name: product.name, emoji: product.emoji, price: product.price, quantity };
    } else if (comboId) {
      const combo = await Combo.findById(comboId);
      if (!combo) return res.status(404).json({ success: false, message: 'Không tìm thấy combo' });
      itemData = { combo: comboId, itemType: 'combo', name: combo.name, emoji: combo.emoji, price: combo.price, quantity };
    } else {
      return res.status(400).json({ success: false, message: 'Thiếu productId hoặc comboId' });
    }

    let cart = query ? await Cart.findOne(query) : null;
    if (!cart) {
      const newQuery = req.user ? { user: req.user._id } : { sessionId: req.headers['x-session-id'] || `guest_${Date.now()}` };
      cart = new Cart(newQuery);
    }

    const refId = productId || comboId;
    const field = productId ? 'product' : 'combo';
    const existingIdx = cart.items.findIndex(i => i[field]?.toString() === refId);

    if (existingIdx > -1) {
      cart.items[existingIdx].quantity += quantity;
    } else {
      cart.items.push(itemData);
    }

    cart.updatedAt = new Date();
    await cart.save();

    const totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    res.json({ success: true, data: { ...cart.toJSON(), totalAmount, totalItems }, message: 'Đã thêm vào giỏ hàng' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/cart/item/:itemId
router.put('/item/:itemId', async (req, res) => {
  try {
    const { quantity } = req.body;
    const query = getCartQuery(req);
    if (!query) return res.status(400).json({ success: false, message: 'Không tìm thấy giỏ hàng' });

    const cart = await Cart.findOne(query);
    if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng trống' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });

    if (quantity <= 0) {
      cart.items.pull({ _id: req.params.itemId });
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    const totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    res.json({ success: true, data: { ...cart.toJSON(), totalAmount, totalItems } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @DELETE /api/cart/item/:itemId
router.delete('/item/:itemId', async (req, res) => {
  try {
    const query = getCartQuery(req);
    const cart = await Cart.findOne(query);
    if (!cart) return res.status(404).json({ success: false, message: 'Giỏ hàng trống' });

    cart.items.pull({ _id: req.params.itemId });
    await cart.save();
    const totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.json({ success: true, data: { ...cart.toJSON(), totalAmount }, message: 'Đã xoá khỏi giỏ hàng' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @DELETE /api/cart/clear
router.delete('/clear', async (req, res) => {
  try {
    const query = getCartQuery(req);
    if (query) {
      await Cart.findOneAndUpdate(query, { items: [] });
    }
    res.json({ success: true, message: 'Đã làm trống giỏ hàng' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
