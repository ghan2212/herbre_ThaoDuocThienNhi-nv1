require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
 
const app = express();
 
// ─── Connect Database ──────────────────────────────────────────────────────────
connectDB();
 
// ─── Middleware ────────────────────────────────────────────────────────────────
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:5000',
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id']
// }));
app.use(cors({
  origin: [
    'https://herbre-thao-duoc-thien-nhi-nv1.vercel.app',
    'http://localhost:5000'
  ],
  credentials: true
}));
 
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
 
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
 
// ─── Static Files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
 
// ─── API Routes ────────────────────────────────────────────────────────────────
// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Herbré API', time: new Date() }));
 
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/combos',   require('./routes/combos'));
app.use('/api/cart',     require('./routes/cart'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/blogs',    require('./routes/blogs'));
app.use('/api/payment',  require('./routes/payment'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/upload',   require('./routes/upload'));
app.use('/api/contact',   require('./routes/contact'));
//app.use('/api/contact',  require('./routes/contact'));
 
// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🌿 Herbré API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});
 
// ─── Frontend SPA Fallback ─────────────────────────────────────────────────────
// Serve specific HTML pages
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin/index.html'));
});
app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin/index.html'));
});
app.get('/test-payment', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/test-payment/index.html'));
});
app.get('/payment-result', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/payment-result/index.html'));
});
 
// SPA fallback for all other non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
  }
});
 
// ─── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);
 
// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🌿 ═══════════════════════════════════════════`);
  console.log(`   Herbré Server đang chạy trên cổng ${PORT}`);
  console.log(`   Môi trường: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Website:    http://localhost:${PORT}`);
  console.log(`   Admin:      http://localhost:${PORT}/admin`);
  console.log(`   API:        http://localhost:${PORT}/api/health`);
  console.log(`🌿 ═══════════════════════════════════════════\n`);
});
 
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});
 
module.exports = app;
 