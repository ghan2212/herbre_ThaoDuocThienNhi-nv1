# Hướng dẫn Deploy lên Railway

## Bước 1: Tạo MongoDB Atlas (miễn phí)
1. Vào https://cloud.mongodb.com → Tạo tài khoản miễn phí
2. Tạo cluster M0 (Free)
3. Network Access → Add IP → 0.0.0.0/0 (cho phép mọi IP)
4. Database Access → Tạo user + password
5. Connect → Drivers → Copy connection string dạng:
   `mongodb+srv://user:password@cluster.mongodb.net/herbre_db`

## Bước 2: Cấu hình biến môi trường trên Railway
Vào project Railway → **Variables** → thêm các biến sau:

| Biến | Giá trị |
|------|---------|
| `MONGODB_URI` | mongodb+srv://... (từ Atlas) |
| `JWT_SECRET` | herbre_secret_2025_very_secure |
| `JWT_EXPIRE` | 7d |
| `NODE_ENV` | production |
| `VNPAY_TMN_CODE` | XGMUI6VH |
| `VNPAY_HASH_SECRET` | Z0RW0CY03IYP82V17C5FO3CL5GFUAXMX |
| `VNPAY_URL` | https://sandbox.vnpayment.vn/paymentv2/vpcpay.html |
| `VNPAY_RETURN_URL` | https://TEN_APP.railway.app/api/payment/vnpay-return |
| `FRONTEND_URL` | https://TEN_APP.railway.app |

> Thay `TEN_APP` bằng URL thật của Railway sau khi deploy

## Bước 3: Deploy
Railway tự động deploy khi push code. Hoặc kéo thả thư mục lên Railway dashboard.

## Bước 4: Seed data (lần đầu)
Sau khi deploy xong, vào Railway → **Shell** (hoặc dùng Railway CLI):
```bash
cd backend && node seed/seedData.js
```

## Kiểm tra
- Website: https://TEN_APP.railway.app
- Admin: https://TEN_APP.railway.app/admin
- API Health: https://TEN_APP.railway.app/api/health
