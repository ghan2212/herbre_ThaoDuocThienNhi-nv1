/* cart.js – Cart state + drawer UI */
 
let cartState = { items: [], totalAmount: 0, totalItems: 0 };
let selectedPayMethod = 'vnpay';
 
// ─── Format helpers ───────────────────────────────────────────────────────────
function formatVND(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}
 
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.innerHTML = msg;
  t.className = `toast ${type} show`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
 
// ─── Cart API calls ───────────────────────────────────────────────────────────
async function loadCart() {
  try {
    const res = await CartAPI.get();
    cartState = res.data;
    renderCartDrawer();
    updateCartBadge();
  } catch (_) {}
}
 
async function addToCart(productId, qty = 1) {
  if (!getCurrentUser()) {
    showToast('Vui lòng đăng nhập để thêm vào giỏ hàng', 'error');
    openAuth();
    return;
  }
  try {
    const res = await CartAPI.add({ productId, quantity: qty });
    cartState = res.data;
    renderCartDrawer();
    updateCartBadge();
    showToast('Đã thêm vào giỏ hàng!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
 
async function addComboToCart(comboId) {
  if (!getCurrentUser()) {
    showToast('Vui lòng đăng nhập để thêm vào giỏ hàng', 'error');
    openAuth();
    return;
  }
  try {
    const res = await CartAPI.add({ comboId, quantity: 1 });
    cartState = res.data;
    renderCartDrawer();
    updateCartBadge();
    showToast('Đã thêm combo vào giỏ hàng!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
 
async function changeCartQty(itemId, delta) {
  const item = cartState.items.find(i => i._id === itemId);
  if (!item) return;
  const newQty = item.quantity + delta;
  try {
    if (newQty <= 0) {
      const res = await CartAPI.removeItem(itemId);
      cartState = res.data;
    } else {
      const res = await CartAPI.updateItem(itemId, newQty);
      cartState = res.data;
    }
    renderCartDrawer();
    updateCartBadge();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
 
async function removeCartItem(itemId) {
  try {
    const res = await CartAPI.removeItem(itemId);
    cartState = res.data;
    renderCartDrawer();
    updateCartBadge();
    showToast('<i class="fas fa-trash"></i> Đã xoá khỏi giỏ hàng');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
 
// ─── Render Cart Drawer ───────────────────────────────────────────────────────
function renderCartDrawer() {
  const body = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  const countText = document.getElementById('cart-count-text');
 
  const items = cartState.items || [];
  const total = cartState.totalAmount || 0;
  const itemCount = cartState.totalItems || items.reduce((s, i) => s + i.quantity, 0);
 
  if (countText) countText.textContent = itemCount;
 
  if (!items.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>Giỏ hàng đang trống</p>
        <p style="font-size:.8rem;margin-top:.4rem">Hãy thêm thảo dược yêu thích!</p>
      </div>`;
    if (footer) footer.style.display = 'none';
    return;
  }
 
  body.innerHTML = items.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">${item.emoji || '🌿'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name" title="${item.name}">${item.name}</div>
        <div class="cart-item-price">${formatVND(item.price)} × ${item.quantity} = <strong>${formatVND(item.price * item.quantity)}</strong></div>
        <div class="cart-qty">
          <button class="qty-btn" onclick="changeCartQty('${item._id}', -1)">−</button>
          <span class="qty-num">${item.quantity}</span>
          <button class="qty-btn" onclick="changeCartQty('${item._id}', 1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeCartItem('${item._id}')" title="Xoá">✕</button>
    </div>
  `).join('');
 
  const shippingFee = total >= 500000 ? 0 : 30000;
  const finalTotal = total + shippingFee;
 
  const note = document.getElementById('cart-shipping-note');
  if (note) {
    note.innerHTML = total >= 500000
      ? '🎉 Bạn được <strong>miễn phí vận chuyển!</strong>'
      : `🚚 Mua thêm <strong>${formatVND(500000 - total)}</strong> để được miễn phí ship`;
  }
 
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');
  const totalEl = document.getElementById('cart-total');
  if (subtotalEl) subtotalEl.textContent = formatVND(total);
  if (shippingEl) shippingEl.textContent = shippingFee === 0 ? 'Miễn phí 🎉' : formatVND(shippingFee);
  if (totalEl) totalEl.textContent = formatVND(finalTotal);
 
  if (footer) footer.style.display = 'block';
}
 
function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const items = cartState.items || [];
  const count = cartState.totalItems || items.reduce((s, i) => s + i.quantity, 0);
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}
 
// ─── Cart Drawer Open/Close ───────────────────────────────────────────────────
function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
 
function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
 
// ─── Checkout ────────────────────────────────────────────────────────────────
function openCheckout(preferPay = null) {
  if (!cartState.items || !cartState.items.length) {
    showToast('Giỏ hàng đang trống!', 'error');
    return;
  }
  closeCart();
 
  if (preferPay) selectedPayMethod = preferPay;
 
  // Pre-fill with user data
  const user = getCurrentUser();
  if (user) {
    const nameEl = document.getElementById('f-name');
    const emailEl = document.getElementById('f-email');
    const phoneEl = document.getElementById('f-phone');
    if (nameEl && !nameEl.value) nameEl.value = user.name || '';
    if (emailEl && !emailEl.value) emailEl.value = user.email || '';
    if (phoneEl && !phoneEl.value) phoneEl.value = user.phone || '';
 
    const defaultAddr = user.addresses?.find(a => a.isDefault);
    if (defaultAddr) {
      const addrEl = document.getElementById('f-addr');
      const cityEl = document.getElementById('f-city');
      if (addrEl && !addrEl.value) addrEl.value = defaultAddr.address || '';
      if (cityEl) cityEl.value = defaultAddr.city || 'Hà Nội';
    }
  }
 
  // Render order summary
  renderCheckoutSummary();
 
  // Set active pay method
  selectPayMethodByKey(selectedPayMethod);
 
  document.getElementById('checkout-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
 
function closeCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
 
function renderCheckoutSummary() {
  const el = document.getElementById('checkout-summary');
  if (!el) return;
  const items = cartState.items || [];
  const total = cartState.totalAmount || 0;
  const shippingFee = total >= 500000 ? 0 : 30000;
  const finalTotal = total + shippingFee;
 
  el.innerHTML = `
    <div style="font-weight:700;color:var(--g-dark);margin-bottom:.5rem;font-size:.9rem">📦 Đơn hàng của bạn</div>
    ${items.map(i => `
      <div class="summary-row">
        <span>${i.emoji} ${i.name} ×${i.quantity}</span>
        <span>${formatVND(i.price * i.quantity)}</span>
      </div>`).join('')}
    <div class="summary-row">
      <span>Phí vận chuyển</span>
      <span>${shippingFee === 0 ? '<span style="color:var(--g-mid);font-weight:600">Miễn phí 🎉</span>' : formatVND(shippingFee)}</span>
    </div>
    <div class="summary-total">
      <span>Tổng thanh toán</span>
      <span>${formatVND(finalTotal)}</span>
    </div>`;
}
 
function selectPayMethod(el) {
  document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedPayMethod = el.dataset.pay;
 
  const vnpayInfo = document.getElementById('vnpay-info');
  if (vnpayInfo) vnpayInfo.style.display = selectedPayMethod === 'vnpay' ? 'block' : 'none';
}
 
function selectPayMethodByKey(key) {
  const el = document.querySelector(`.pay-opt[data-pay="${key}"]`);
  if (el) selectPayMethod(el);
}
 
async function placeOrder() {
  const name = document.getElementById('f-name')?.value?.trim();
  const phone = document.getElementById('f-phone')?.value?.trim();
  const email = document.getElementById('f-email')?.value?.trim();
  const address = document.getElementById('f-addr')?.value?.trim();
  const city = document.getElementById('f-city')?.value;
  const note = document.getElementById('f-note')?.value?.trim();
 
  if (!name) { showToast('Vui lòng nhập họ tên', 'error'); return; }
  if (!phone || !/^0\d{9}$/.test(phone)) { showToast('Số điện thoại không hợp lệ (VD: 0912345678)', 'error'); return; }
  if (!address) { showToast('Vui lòng nhập địa chỉ giao hàng', 'error'); return; }
 
  const btn = document.getElementById('btn-place-order');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }
 
  try {
    const orderData = {
      customerInfo: { name, phone, email, address, city, note },
      items: (cartState.items || []).map(i => ({
        product: i.product || i._id,
        combo: i.combo,
        itemType: i.itemType || 'product',
        name: i.name,
        emoji: i.emoji,
        price: i.price,
        quantity: i.quantity
      })),
      paymentMethod: selectedPayMethod
    };
 
    const res = await OrderAPI.create(orderData);
    const order = res.data;
 
    closeCheckout();
    cartState = { items: [], totalAmount: 0, totalItems: 0 };
    renderCartDrawer();
    updateCartBadge();
 
    // VNPay redirect
    if (selectedPayMethod === 'vnpay') {
      showToast('<i class="fas fa-spinner fa-spin"></i> Đang chuyển đến trang thanh toán VNPay...', 'success');
      try {
        const payRes = await PaymentAPI.createVNPay(order._id);
        if (payRes.payUrl) {
          setTimeout(() => { window.location.href = payRes.payUrl; }, 1200);
        } else {
          showOrderSuccess(res.orderCode);
        }
      } catch {
        showOrderSuccess(res.orderCode);
      }
    } else {
      showOrderSuccess(res.orderCode);
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Xác nhận đặt hàng'; }
  }
}
 
function showOrderSuccess(orderCode) {
  showToast(`<i class="fas fa-check-circle"></i> Đặt hàng thành công! Mã: ${orderCode}`, 'success');
  // Reset form
  ['f-name','f-phone','f-email','f-addr','f-note'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}
 
// ─── Track Order ──────────────────────────────────────────────────────────────
function openTrackOrder() {
  document.getElementById('track-overlay').classList.add('open');
}
 
async function trackOrder() {
  const code = document.getElementById('track-code')?.value?.trim().toUpperCase();
  if (!code) { showToast('Nhập mã đơn hàng', 'error'); return; }
 
  const resultEl = document.getElementById('track-result');
  resultEl.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:1rem">⏳ Đang tìm kiếm...</div>';
 
  try {
    const res = await OrderAPI.track(code);
    const o = res.data;
    const statusMap = {
      pending: { label: 'Chờ xác nhận', cls: 'status-pending' },
      confirmed: { label: 'Đã xác nhận', cls: 'status-confirmed' },
      processing: { label: 'Đang chuẩn bị hàng', cls: 'status-processing' },
      shipped: { label: 'Đang giao hàng', cls: 'status-shipped' },
      delivered: { label: 'Đã giao thành công', cls: 'status-delivered' },
      cancelled: { label: 'Đã huỷ', cls: 'status-cancelled' }
    };
    const s = statusMap[o.status] || { label: o.status, cls: 'status-pending' };
    const payMap = { cod: 'COD', vnpay: 'VNPay', momo: 'MoMo', zalopay: 'ZaloPay' };
 
    resultEl.innerHTML = `
      <div class="track-status">
        <div class="track-order-code">📦 ${o.orderCode}</div>
        <div class="track-row"><span>Trạng thái</span><span class="status-badge ${s.cls}">${s.label}</span></div>
        <div class="track-row"><span>Khách hàng</span><span>${o.customerInfo.name}</span></div>
        <div class="track-row"><span>Địa chỉ</span><span>${o.customerInfo.address}, ${o.customerInfo.city}</span></div>
        <div class="track-row"><span>Thanh toán</span><span>${payMap[o.paymentMethod] || o.paymentMethod}</span></div>
        <div class="track-row"><span>Tổng tiền</span><span style="font-weight:700;color:var(--g-dark)">${formatVND(o.totalAmount)}</span></div>
        <div class="track-row"><span>Ngày đặt</span><span>${new Date(o.createdAt).toLocaleDateString('vi-VN')}</span></div>
        ${o.trackingNumber ? `<div class="track-row"><span>Mã vận đơn</span><span>${o.trackingNumber}</span></div>` : ''}
      </div>`;
  } catch (err) {
    resultEl.innerHTML = `<div style="text-align:center;color:#e53935;padding:1rem">❌ ${err.message}</div>`;
  }
}
 
// Init
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
 
  document.getElementById('btn-cart')?.addEventListener('click', openCart);
 
  // Close checkout on overlay click
  document.getElementById('checkout-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeCheckout();
  });
  document.getElementById('track-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
  });
});