const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');

// ─── VNPay Utility Functions ───────────────────────────────────────────────────

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
  }
  return sorted;
}

function createVNPayUrl(params) {
  const tmnCode = process.env.VNPAY_TMN_CODE || 'TESTCODE';
  const hashSecret = process.env.VNPAY_HASH_SECRET || 'TESTKEY123456789';
  const vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payment/vnpay-return';

  const date = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const createDate = `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  const expireDate = new Date(date.getTime() + 15 * 60 * 1000);
  const expireStr = `${expireDate.getFullYear()}${pad(expireDate.getMonth()+1)}${pad(expireDate.getDate())}${pad(expireDate.getHours())}${pad(expireDate.getMinutes())}${pad(expireDate.getSeconds())}`;

  const vnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: params.amount * 100, // VNPay nhân 100
    vnp_CreateDate: createDate,
    vnp_CurrCode: 'VND',
    vnp_IpAddr: params.ipAddr || '127.0.0.1',
    vnp_Locale: 'vn',
    vnp_OrderInfo: `Thanh toan don hang ${params.orderCode}`,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: params.orderCode,
    vnp_ExpireDate: expireStr
  };

  if (params.bankCode) vnpParams.vnp_BankCode = params.bankCode;

  const sorted = sortObject(vnpParams);
  const signData = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&');
  const hmac = crypto.createHmac('sha512', hashSecret);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  const queryString = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&');
  return `${vnpUrl}?${queryString}&vnp_SecureHash=${secureHash}`;
}

function verifyVNPayReturn(query) {
  const hashSecret = process.env.VNPAY_HASH_SECRET || 'TESTKEY123456789';
  const secureHash = query.vnp_SecureHash;

  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const sorted = sortObject(params);
  const signData = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&');
  const hmac = crypto.createHmac('sha512', hashSecret);
  const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === checkHash;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// @POST /api/payment/vnpay-create
// Body: { orderId, bankCode? }
router.post('/vnpay-create', async (req, res) => {
  try {
    const { orderId, bankCode } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán' });
    }

    // ⭐ For demo/testing: redirect to test payment page instead of real VNPay
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    
    // If using real credentials, use VNPay
    if (tmnCode && tmnCode !== 'your_tmn_code' && hashSecret && hashSecret !== 'your_hash_secret') {
      const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const payUrl = createVNPayUrl({
        amount: order.totalAmount,
        orderCode: order.orderCode,
        ipAddr: Array.isArray(ipAddr) ? ipAddr[0] : ipAddr.split(',')[0].trim(),
        bankCode
      });
      return res.json({ success: true, payUrl, orderCode: order.orderCode });
    }
    
    // Otherwise, redirect to test payment page
    const testPaymentUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/test-payment?orderId=${orderId}`;
    res.json({ success: true, payUrl: testPaymentUrl, orderCode: order.orderCode, isTestMode: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/payment/vnpay-return — VNPay callback (redirect from VNPay)
router.get('/vnpay-return', async (req, res) => {
  try {
    const query = req.query;
    const isValid = verifyVNPayReturn(query);
    const responseCode = query.vnp_ResponseCode;
    const orderCode = query.vnp_TxnRef;
    const transactionId = query.vnp_TransactionNo;
    const bankCode = query.vnp_BankCode;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!isValid) {
      return res.redirect(`${frontendUrl}/payment-result?status=invalid&orderCode=${orderCode}`);
    }

    const order = await Order.findOne({ orderCode });
    if (!order) {
      return res.redirect(`${frontendUrl}/payment-result?status=notfound`);
    }

    if (responseCode === '00') {
      // Payment successful
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      order.status = 'confirmed';
      order.vnpayTransactionId = transactionId;
      order.vnpayResponseCode = responseCode;
      order.vnpayBankCode = bankCode;
      order.statusHistory.push({ status: 'confirmed', note: `Thanh toán VNPay thành công - Mã GD: ${transactionId}` });
      await order.save();
      return res.redirect(`${frontendUrl}/payment-result?status=success&orderCode=${orderCode}&amount=${query.vnp_Amount}`);
    } else {
      // Payment failed
      order.paymentStatus = 'failed';
      order.vnpayResponseCode = responseCode;
      order.statusHistory.push({ status: order.status, note: `Thanh toán VNPay thất bại - Mã lỗi: ${responseCode}` });
      await order.save();
      return res.redirect(`${frontendUrl}/payment-result?status=failed&orderCode=${orderCode}&code=${responseCode}`);
    }
  } catch (err) {
    console.error('VNPay return error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result?status=error`);
  }
});

// @POST /api/payment/vnpay-ipn — VNPay IPN (server-to-server notification)
router.post('/vnpay-ipn', async (req, res) => {
  try {
    const query = req.query;
    const isValid = verifyVNPayReturn(query);

    if (!isValid) {
      return res.json({ RspCode: '97', Message: 'Invalid Checksum' });
    }

    const order = await Order.findOne({ orderCode: query.vnp_TxnRef });
    if (!order) return res.json({ RspCode: '01', Message: 'Order not found' });

    const amount = Number(query.vnp_Amount) / 100;
    if (Math.abs(amount - order.totalAmount) > 1) {
      return res.json({ RspCode: '04', Message: 'Invalid Amount' });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    if (query.vnp_ResponseCode === '00') {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      order.status = 'confirmed';
      order.vnpayTransactionId = query.vnp_TransactionNo;
      await order.save();
    }

    return res.json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
    return res.json({ RspCode: '99', Message: 'Internal error' });
  }
});

// @POST /api/payment/vnpay-refund (Admin only - simplified)
router.post('/vnpay-refund', async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Đơn hàng chưa được thanh toán' });
    }
    // In production: call VNPay refund API here
    // For demo, just update status
    order.paymentStatus = 'refunded';
    order.status = 'refunded';
    order.statusHistory.push({ status: 'refunded', note: reason || 'Hoàn tiền' });
    await order.save();
    res.json({ success: true, message: 'Yêu cầu hoàn tiền đã được gửi', data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/payment/test-confirm — Test payment confirmation
router.get('/test-confirm', async (req, res) => {
  try {
    const { orderId, status } = req.query;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    if (status === 'success') {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      order.status = 'confirmed';
      order.vnpayTransactionId = 'TEST_' + Date.now();
      order.statusHistory.push({ status: 'confirmed', note: 'Thanh toán test thành công' });
      await order.save();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/payment-result?status=success&orderCode=${order.orderCode}&amount=${order.totalAmount * 100}`);
    } else {
      order.paymentStatus = 'failed';
      order.statusHistory.push({ status: order.status, note: 'Thanh toán test bị hủy' });
      await order.save();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/payment-result?status=failed&orderCode=${order.orderCode}&code=72`);
    }
  } catch (err) {
    console.error('Test payment error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-result?status=error`);
  }
});

// @GET /api/payment/methods — List available payment methods
router.get('/methods', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'vnpay', name: 'VNPay', desc: 'ATM, QR Code, Visa/Master', logo: '', available: true },
      { id: 'momo', name: 'MoMo', desc: 'Ví điện tử MoMo', logo: '', available: true },
      { id: 'zalopay', name: 'ZaloPay', desc: 'Ví ZaloPay', logo: '', available: true },
      { id: 'cod', name: 'Thanh toán khi nhận hàng', desc: 'Trả tiền mặt khi nhận hàng', logo: '🚚', available: true }
    ]
  });
});

module.exports = router;
