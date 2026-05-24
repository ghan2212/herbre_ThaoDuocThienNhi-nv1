/* api.js – Centralized API client for Herbré frontend */
const API_BASE = 'https://herbrethaoduocthiennhi-nv1-production.up.railway.app/api';

// Session ID for guest cart
let sessionId = localStorage.getItem('hb_session');
if (!sessionId) {
  sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  localStorage.setItem('hb_session', sessionId);
}

async function request(method, path, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json', 'X-Session-Id': sessionId };
  const token = localStorage.getItem('hb_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  try {
    const res = await fetch(API_BASE + path, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi không xác định');
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Không thể kết nối server. Vui lòng thử lại.');
    }
    throw err;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const AuthAPI = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  register: (data) => request('POST', '/auth/register', data),
  me: () => request('GET', '/auth/me'),
  updateProfile: (data) => request('PUT', '/auth/update-profile', data),
  changePassword: (data) => request('PUT', '/auth/change-password', data),
  addAddress: (data) => request('POST', '/auth/address', data),
  deleteAddress: (id) => request('DELETE', `/auth/address/${id}`),
  toggleWishlist: (productId) => request('POST', `/auth/wishlist/${productId}`)
};

// ─── Products ─────────────────────────────────────────────────────────────────
const ProductAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/products?${qs}`);
  },
  featured: () => request('GET', '/products/featured'),
  categories: () => request('GET', '/products/categories'),
  get: (id) => request('GET', `/products/${id}`),
  search: (q) => request('GET', `/products?search=${encodeURIComponent(q)}&limit=6`),
  addReview: (id, data) => request('POST', `/products/${id}/reviews`, data),
  canReview: (id) => request('GET', `/products/${id}/can-review`),
  create: (data) => request('POST', '/products', data),
  update: (id, data) => request('PUT', `/products/${id}`, data),
  delete: (id) => request('DELETE', `/products/${id}`)
};

// ─── Combos ───────────────────────────────────────────────────────────────────
const ComboAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/combos?${qs}`);
  },
  get: (id) => request('GET', `/combos/${id}`),
  create: (data) => request('POST', '/combos', data),
  update: (id, data) => request('PUT', `/combos/${id}`, data),
  delete: (id) => request('DELETE', `/combos/${id}`)
};

// ─── Cart ─────────────────────────────────────────────────────────────────────
const CartAPI = {
  get: () => request('GET', '/cart'),
  add: (data) => request('POST', '/cart/add', data),
  updateItem: (itemId, quantity) => request('PUT', `/cart/item/${itemId}`, { quantity }),
  removeItem: (itemId) => request('DELETE', `/cart/item/${itemId}`),
  clear: () => request('DELETE', '/cart/clear')
};

// ─── Orders ───────────────────────────────────────────────────────────────────
const OrderAPI = {
  create: (data) => request('POST', '/orders', data),
  myOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/orders/my?${qs}`);
  },
  get: (id) => request('GET', `/orders/${id}`),
  track: (code) => request('GET', `/orders/track/${code}`),
  cancel: (id, reason) => request('PUT', `/orders/${id}/cancel`, { reason }),
  // Admin
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/orders?${qs}`);
  },
  updateStatus: (id, data) => request('PUT', `/orders/${id}/status`, data),
  stats: () => request('GET', '/orders/admin/stats')
};

// ─── Blogs ────────────────────────────────────────────────────────────────────
const BlogAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/blogs?${qs}`);
  },
  categories: () => request('GET', '/blogs/categories'),
  get: (slug) => request('GET', `/blogs/${slug}`),
  create: (data) => request('POST', '/blogs', data),
  update: (id, data) => request('PUT', `/blogs/${id}`, data),
  delete: (id) => request('DELETE', `/blogs/${id}`)
};

// ─── Payment ──────────────────────────────────────────────────────────────────
const PaymentAPI = {
  createVNPay: (orderId, bankCode) => request('POST', '/payment/vnpay-create', { orderId, bankCode }),
  methods: () => request('GET', '/payment/methods')
};

// ─── Admin ────────────────────────────────────────────────────────────────────
const AdminAPI = {
  dashboard: () => request('GET', '/admin/dashboard'),
  users: (params = {}) => request('GET', `/admin/users?${new URLSearchParams(params)}`),
  toggleUser: (id) => request('PUT', `/admin/users/${id}/toggle`),
  lowStock: () => request('GET', '/admin/low-stock'),
  restock: (id, quantity) => request('PUT', `/admin/products/${id}/restock`, { quantity })
};
