# 🌿 Herbré – Thảo Dược Thiên Nhiên

Website bán thảo dược hoàn chỉnh với **Node.js + Express + MongoDB/Mongoose + VNPay**.

---

## 📁 Cấu trúc project

```
herbre/
├── backend/
│   ├── config/
│   │   └── database.js          # Kết nối MongoDB
│   ├── middleware/
│   │   ├── auth.js              # JWT verify + role guard
│   │   ├── errorHandler.js      # Xử lý lỗi tập trung
│   │   └── upload.js            # Multer upload ảnh
│   ├── models/
│   │   ├── Product.js           # Sản phẩm thảo dược
│   │   ├── User.js              # Người dùng + admin
│   │   ├── Order.js             # Đơn hàng + VNPay
│   │   ├── Combo.js             # Combo sản phẩm
│   │   ├── Blog.js              # Bài viết blog
│   │   └── Cart.js              # Giỏ hàng (guest + user)
│   ├── routes/
│   │   ├── auth.js              # Đăng ký, đăng nhập, hồ sơ
│   │   ├── products.js          # CRUD sản phẩm + đánh giá
│   │   ├── combos.js            # CRUD combo
│   │   ├── cart.js              # Giỏ hàng (guest + user)
│   │   ├── orders.js            # Đặt hàng + quản lý đơn
│   │   ├── blogs.js             # CRUD blog
│   │   ├── payment.js           # VNPay tích hợp hoàn chỉnh
│   │   ├── admin.js             # Dashboard + quản trị
│   │   └── upload.js            # Upload ảnh sản phẩm
│   ├── seed/
│   │   └── seedData.js          # 10 sản phẩm + 4 combo + 5 blog
│   ├── server.js                # Entry point Express
│   ├── package.json
│   └── .env                     # Biến môi trường
│
└── frontend/
    └── public/
        ├── index.html           # Trang chủ SPA
        ├── css/
        │   └── style.css        # CSS hoàn chỉnh
        ├── js/
        │   ├── api.js           # API client tập trung
        │   ├── cart.js          # Giỏ hàng + thanh toán
        │   ├── auth.js          # Xác thực người dùng
        │   └── app.js           # Logic chính (sản phẩm, blog...)
        ├── admin/
        │   └── index.html       # Dashboard admin
        └── payment-result/
            └── index.html       # Trang kết quả VNPay
```

---

## ⚡ Cài đặt và chạy

### Yêu cầu
- **Node.js** v18+
- **MongoDB** v6+ (local hoặc MongoDB Atlas)

### 1. Cài đặt backend

```bash
cd herbre/backend
npm install
```

### 2. Cấu hình môi trường

Chỉnh sửa file `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/herbre_db
JWT_SECRET=herbre_secret_key_2025_very_secure
JWT_EXPIRE=7d
NODE_ENV=development

# VNPay Sandbox (đăng ký tại sandbox.vnpayment.vn)
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5000/payment-result

FRONTEND_URL=http://localhost:5000
```

### 3. Seed dữ liệu mẫu

```bash
npm run seed
```

Kết quả:
- ✅ 10 sản phẩm thảo dược
- ✅ 4 combo ưu đãi
- ✅ 5 bài blog
- ✅ Tài khoản admin: `admin@herbre.vn` / `Herbre@2025`

### 4. Khởi động server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

### 5. Truy cập

| URL | Mô tả |
|-----|-------|
| `http://localhost:5000` | 🌿 Trang bán hàng |
| `http://localhost:5000/admin` | ⚙️ Admin dashboard |
| `http://localhost:5000/api/health` | 🟢 API health check |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/me` | Thông tin user (cần token) |
| PUT | `/api/auth/update-profile` | Cập nhật hồ sơ |
| PUT | `/api/auth/change-password` | Đổi mật khẩu |
| POST | `/api/auth/address` | Thêm địa chỉ giao hàng |
| POST | `/api/auth/wishlist/:id` | Toggle yêu thích |

### Products
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/products` | Danh sách (filter, sort, page) |
| GET | `/api/products/featured` | Sản phẩm nổi bật |
| GET | `/api/products/categories` | Danh mục + số lượng |
| GET | `/api/products/:id` | Chi tiết sản phẩm |
| POST | `/api/products` | Tạo mới (Admin) |
| PUT | `/api/products/:id` | Cập nhật (Admin) |
| DELETE | `/api/products/:id` | Ẩn sản phẩm (Admin) |
| POST | `/api/products/:id/reviews` | Đánh giá sản phẩm |

### Orders
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/orders` | Tạo đơn hàng (guest + user) |
| GET | `/api/orders/my` | Đơn hàng của tôi |
| GET | `/api/orders/track/:code` | Tra cứu đơn hàng |
| PUT | `/api/orders/:id/cancel` | Huỷ đơn |
| GET | `/api/orders` | Tất cả đơn (Admin) |
| PUT | `/api/orders/:id/status` | Cập nhật trạng thái (Admin) |
| GET | `/api/orders/admin/stats` | Thống kê (Admin) |

### Payment (VNPay)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/payment/vnpay-create` | Tạo URL thanh toán |
| GET | `/api/payment/vnpay-return` | Callback VNPay (redirect) |
| POST | `/api/payment/vnpay-ipn` | IPN server-to-server |
| GET | `/api/payment/methods` | Danh sách phương thức |

### Blog
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/blogs` | Danh sách bài viết |
| GET | `/api/blogs/:slug` | Chi tiết + bài liên quan |
| POST | `/api/blogs` | Đăng bài (Admin) |
| PUT | `/api/blogs/:id` | Sửa bài (Admin) |
| DELETE | `/api/blogs/:id` | Ẩn bài (Admin) |

### Admin
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/admin/dashboard` | Thống kê tổng quan |
| GET | `/api/admin/users` | Danh sách người dùng |
| PUT | `/api/admin/users/:id/toggle` | Khoá / mở khoá |
| GET | `/api/admin/low-stock` | Hàng sắp hết |
| PUT | `/api/admin/products/:id/restock` | Nhập thêm hàng |

---

## 💳 Tích hợp VNPay

### Luồng thanh toán

```
Khách đặt hàng
     ↓
Tạo URL VNPay (POST /api/payment/vnpay-create)
     ↓
Redirect đến cổng VNPay
     ↓
Khách thanh toán
     ↓
VNPay redirect về /payment-result (GET /api/payment/vnpay-return)
     ↓
Đồng thời VNPay gọi IPN (POST /api/payment/vnpay-ipn)
     ↓
Cập nhật trạng thái đơn hàng → paymentStatus: "paid"
```

### Đăng ký VNPay Sandbox

1. Vào `https://sandbox.vnpayment.vn/devreg/`
2. Đăng ký tài khoản developer
3. Lấy `TMN_CODE` và `HASH_SECRET`
4. Điền vào file `.env`

---

## 🎨 Tính năng Frontend

### Trang chủ (`/`)
- ✅ Hero section với CTA
- ✅ Danh sách sản phẩm (lọc theo danh mục, sắp xếp)
- ✅ Combo ưu đãi
- ✅ Công dụng thảo dược
- ✅ Blog thảo dược
- ✅ Thanh tìm kiếm realtime
- ✅ Giỏ hàng drawer (slide-in)
- ✅ Modal chi tiết sản phẩm + đánh giá
- ✅ Checkout với VNPay / COD / MoMo / ZaloPay
- ✅ Tra cứu đơn hàng

### Xác thực
- ✅ Đăng ký / Đăng nhập modal
- ✅ JWT lưu localStorage
- ✅ Xem lịch sử đơn hàng
- ✅ Huỷ đơn hàng

### Admin Dashboard (`/admin`)
- ✅ Thống kê doanh thu, đơn hàng, người dùng
- ✅ Biểu đồ doanh thu theo ngày
- ✅ Quản lý đơn hàng (cập nhật trạng thái)
- ✅ Quản lý sản phẩm (thêm, sửa, ẩn)
- ✅ Quản lý combo
- ✅ Quản lý blog (đăng bài, sửa, ẩn)
- ✅ Quản lý người dùng (khoá / mở khoá)
- ✅ Cảnh báo tồn kho + nhập hàng nhanh

---

## 🗄️ MongoDB Models

### Product
```
name, slug, description, shortDesc, category, ingredients[],
usage, weight, price, originalPrice, discount, stock, sold,
images[], emoji, tags[], badge, isFeatured, isActive,
reviews[], rating, numReviews, benefits[]
```

### Order
```
orderCode, user, customerInfo{name,phone,email,address,city,note},
items[], itemsTotal, shippingFee, discount, totalAmount,
status, paymentMethod, paymentStatus,
vnpayTransactionId, vnpayBankCode, paidAt,
statusHistory[], trackingNumber
```

### User
```
name, email, password(hashed), phone, avatar, role,
addresses[], wishlist[], isActive, lastLogin
```

---

## 🚀 Deploy Production

### Option 1: VPS (Ubuntu)

```bash
# Cài Node.js + MongoDB
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mongodb-org

# Clone project + cài đặt
npm install
npm run seed

# Chạy với PM2
npm install -g pm2
pm2 start backend/server.js --name herbre
pm2 startup && pm2 save
```

### Option 2: MongoDB Atlas (Cloud)

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/herbre_db
```

### Nginx config (ví dụ)

```nginx
server {
    listen 80;
    server_name herbre.vn www.herbre.vn;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📋 Tài khoản mặc định sau seed

| Loại | Email | Mật khẩu |
|------|-------|----------|
| Admin | admin@herbre.vn | Herbre@2025 |

---

## 🛠️ Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| Payment | VNPay Payment Gateway |
| Upload | Multer |
| Frontend | Vanilla JS, CSS3 |
| Validation | express-validator |

---

*Herbré © 2025 – Thảo dược thiên nhiên thuần Việt*
