/* auth.js – Authentication state + modal UI */
 
let currentUser = null;
 
function getCurrentUser() { return currentUser; }
 
function setUser(user, token) {
  currentUser = user;
  if (token) localStorage.setItem('hb_token', token);
  if (user) localStorage.setItem('hb_user', JSON.stringify(user));
  updateAuthUI();
}
 
function logout() {
  currentUser = null;
  localStorage.removeItem('hb_token');
  localStorage.removeItem('hb_user');
  updateAuthUI();
  showToast('👋 Đã đăng xuất', 'success');
  loadCart();
}
 
function updateAuthUI() {
  const btn = document.getElementById('btn-auth');
  if (!btn) return;
  if (currentUser) {
    const initial = currentUser.name ? currentUser.name.trim()[0].toUpperCase() : 'U';
    btn.innerHTML = `<span class="btn-auth-avatar">${initial}</span> ${currentUser.name.split(' ').pop()}`;
    btn.onclick = showUserMenu;
  } else {
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:middle"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Đăng nhập`;
    btn.onclick = openAuth;
  }
}
 
// ─── Auth Modal ───────────────────────────────────────────────────────────────
function openAuth() {
  document.getElementById('auth-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchAuth('login');
}
 
function closeAuth() {
  document.getElementById('auth-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
 
function switchAuth(mode) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const tabs = document.querySelectorAll('.auth-tab');
  if (mode === 'login') {
    loginForm.style.display = 'block'; regForm.style.display = 'none';
    tabs[0].classList.add('active'); tabs[1].classList.remove('active');
  } else {
    loginForm.style.display = 'none'; regForm.style.display = 'block';
    tabs[0].classList.remove('active'); tabs[1].classList.add('active');
  }
}
 
async function doLogin() {
  const email = document.getElementById('login-email')?.value?.trim();
  const pass = document.getElementById('login-pass')?.value;
  if (!email || !pass) { showToast('Nhập đầy đủ email và mật khẩu', 'error'); return; }
  const btn = document.querySelector('#login-form .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang đăng nhập...'; }
  try {
    const res = await AuthAPI.login(email, pass);
    setUser(res.user, res.token);
    closeAuth();
    showToast(`🎉 Chào mừng, ${res.user.name}!`, 'success');
    await loadCart();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Đăng nhập'; }
  }
}
 
async function doRegister() {
  const name = document.getElementById('reg-name')?.value?.trim();
  const email = document.getElementById('reg-email')?.value?.trim();
  const phone = document.getElementById('reg-phone')?.value?.trim();
  const pass = document.getElementById('reg-pass')?.value;
  if (!name || !email || !pass) { showToast('Vui lòng điền đầy đủ thông tin', 'error'); return; }
  if (pass.length < 6) { showToast('Mật khẩu tối thiểu 6 ký tự', 'error'); return; }
  const btn = document.querySelector('#register-form .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang tạo tài khoản...'; }
  try {
    const res = await AuthAPI.register({ name, email, phone, password: pass });
    setUser(res.user, res.token);
    closeAuth();
    showToast(`🎉 Tạo tài khoản thành công! Chào ${res.user.name}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Tạo tài khoản'; }
  }
}
 
// ─── User Menu ────────────────────────────────────────────────────────────────
function showUserMenu(e) {
  e.stopPropagation();
  let menu = document.getElementById('user-menu');
  if (menu) { menu.remove(); return; }
 
  menu = document.createElement('div');
  menu.id = 'user-menu';
  menu.style.cssText = `position:fixed;top:68px;right:1rem;background:#fff;border:1px solid #e0e8d8;border-radius:12px;box-shadow:0 8px 32px rgba(45,90,39,.15);z-index:150;min-width:210px;padding:.5rem;animation:slideUp .2s ease;`;
  const isAdmin = currentUser?.role === 'admin';
  menu.innerHTML = `
    <div style="padding:.6rem 1rem .4rem;border-bottom:1px solid #f0f0f0;margin-bottom:.4rem">
      <div style="font-weight:700;font-size:.9rem;color:var(--g-dark)">${currentUser.name}</div>
      <div style="font-size:.78rem;color:var(--text-light)">${currentUser.email}</div>
    </div>
    <button class="menu-item" onclick="showMyAccount()">👤 Tài khoản của tôi</button>
    <button class="menu-item" onclick="showMyOrders()">📦 Lịch sử đơn hàng</button>
    <button class="menu-item" onclick="openTrackOrder()">🔍 Tra cứu đơn hàng</button>
    <button class="menu-item" onclick="showWishlist()">🤍 Yêu thích</button>
    ${isAdmin ? `<button class="menu-item admin-item" onclick="window.location.href='/admin'">⚙️ Quản trị Admin</button>` : ''}
    <div style="border-top:1px solid #f0f0f0;margin:.4rem 0"></div>
    <button class="menu-item danger" onclick="logout()">🚪 Đăng xuất</button>
  `;
 
  const style = document.createElement('style');
  style.textContent = `.menu-item{display:block;width:100%;text-align:left;background:none;border:none;padding:.6rem 1rem;border-radius:8px;font-size:.85rem;cursor:pointer;color:var(--text);font-family:'Be Vietnam Pro',sans-serif;transition:background .15s}.menu-item:hover{background:var(--g-mist)}.menu-item.danger:hover{background:#fef2f2;color:#e53935}.menu-item.admin-item{color:var(--g-dark);font-weight:600}`;
  document.head.appendChild(style);
  document.body.appendChild(menu);
 
  const closeMenu = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeMenu); } };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}
 
// ─── Account Modal (Thông tin / Địa chỉ / Đổi mật khẩu) ────────────────────
function showMyAccount() {
  document.getElementById('user-menu')?.remove();
  if (!currentUser) { openAuth(); return; }
 
  let overlay = document.getElementById('account-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'account-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '360';
    overlay.innerHTML = `
      <div class="modal account-modal">
        <div class="modal-header">
          <h3>👤 Tài khoản của tôi</h3>
          <button class="btn-close" onclick="closeAccountModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="account-tabs">
            <button class="account-tab active" onclick="switchAccountTab('profile', this)">Thông tin</button>
            <button class="account-tab" onclick="switchAccountTab('address', this)">Địa chỉ</button>
            <button class="account-tab" onclick="switchAccountTab('password', this)">Đổi mật khẩu</button>
          </div>
          <div id="account-tab-profile" class="account-tab-panel active"></div>
          <div id="account-tab-address" class="account-tab-panel"></div>
          <div id="account-tab-password" class="account-tab-panel"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAccountModal(); });
  }
 
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  loadAccountTab('profile');
}
 
function closeAccountModal() {
  document.getElementById('account-modal-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}
 
function switchAccountTab(tab, btn) {
  document.querySelectorAll('#account-modal-overlay .account-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#account-modal-overlay .account-tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const panel = document.getElementById(`account-tab-${tab}`);
  panel.classList.add('active');
  loadAccountTab(tab);
}
 
function loadAccountTab(tab) {
  if (tab === 'profile') renderProfileTab();
  else if (tab === 'address') renderAddressTab();
  else if (tab === 'password') renderPasswordTab();
}
 
function renderProfileTab() {
  const el = document.getElementById('account-tab-profile');
  const u = currentUser;
  el.innerHTML = `
    <div class="avatar-row">
      <div class="avatar-circle">
        ${u.avatar ? `<img src="${u.avatar}" alt="avatar" onerror="this.outerHTML='🌿'">` : '🌿'}
      </div>
      <div class="avatar-info">
        <strong>${u.name}</strong>
        <span>${u.email}</span>
        ${u.role === 'admin' ? '<span style="color:var(--g-mid);font-weight:700;font-size:.75rem">✦ Admin</span>' : ''}
      </div>
    </div>
    <div class="form-group">
      <label>Họ và tên</label>
      <input type="text" id="acc-name" value="${u.name || ''}" placeholder="Họ và tên">
    </div>
    <div class="form-group">
      <label>Số điện thoại</label>
      <input type="tel" id="acc-phone" value="${u.phone || ''}" placeholder="0912 345 678">
    </div>
    <div class="form-group">
      <label>Email (không thể thay đổi)</label>
      <input type="email" value="${u.email}" disabled style="opacity:.6;cursor:not-allowed">
    </div>
    <div class="form-group">
      <label>Ngày tạo tài khoản</label>
      <input type="text" value="${new Date(u.createdAt || Date.now()).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})}" disabled style="opacity:.6;cursor:not-allowed">
    </div>
    <button class="btn-primary full" style="margin-top:.4rem" onclick="saveProfile()">Lưu thay đổi</button>
  `;
}
 
async function saveProfile() {
  const name = document.getElementById('acc-name')?.value?.trim();
  const phone = document.getElementById('acc-phone')?.value?.trim();
  if (!name) { showToast('Vui lòng nhập tên', 'error'); return; }
  try {
    const res = await AuthAPI.updateProfile({ name, phone });
    currentUser = { ...currentUser, name: res.user.name, phone: res.user.phone };
    localStorage.setItem('hb_user', JSON.stringify(currentUser));
    updateAuthUI();
    showToast('✅ Đã cập nhật thông tin', 'success');
    renderProfileTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
 
function renderAddressTab() {
  const el = document.getElementById('account-tab-address');
  const addrs = currentUser.addresses || [];
 
  el.innerHTML = `
    <div id="addr-list">
      ${addrs.length ? addrs.map(a => renderAddressCard(a)).join('') : `<div style="text-align:center;padding:1.5rem;color:var(--text-light);font-size:.88rem">📍 Chưa có địa chỉ nào</div>`}
    </div>
    <button class="add-addr-btn" onclick="toggleAddrForm()">+ Thêm địa chỉ mới</button>
    <div class="addr-form" id="addr-form">
      <div class="form-row">
        <div class="form-group"><label>Họ tên *</label><input type="text" id="af-name" placeholder="Nguyễn Văn A"></div>
        <div class="form-group"><label>Điện thoại *</label><input type="tel" id="af-phone" placeholder="0912 345 678"></div>
      </div>
      <div class="form-group"><label>Địa chỉ *</label><input type="text" id="af-addr" placeholder="Số nhà, tên đường"></div>
      <div class="form-row">
        <div class="form-group"><label>Phường/Xã</label><input type="text" id="af-ward" placeholder="Phường Bến Nghé"></div>
        <div class="form-group"><label>Quận/Huyện</label><input type="text" id="af-district" placeholder="Quận 1"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tỉnh/Thành phố *</label><input type="text" id="af-city" placeholder="Hà Nội"></div>
        <div class="form-group"><label>Nhãn</label>
          <select id="af-label" style="width:100%;padding:10px 13px;border:1.5px solid #e0e8d8;border-radius:8px;font-size:.88rem;font-family:'Be Vietnam Pro',sans-serif">
            <option value="Nhà">🏠 Nhà</option>
            <option value="Văn phòng">🏢 Văn phòng</option>
            <option value="Khác">📍 Khác</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:.4rem">
        <button class="btn-primary" style="flex:1" onclick="saveNewAddress()">Lưu địa chỉ</button>
        <button class="btn-outline" style="flex:1" onclick="toggleAddrForm()">Huỷ</button>
      </div>
    </div>
  `;
}
 
function renderAddressCard(a) {
  return `
    <div class="address-card ${a.isDefault ? 'default-addr' : ''}">
      <div class="address-card-label">${a.label || 'Nhà'} ${a.isDefault ? '· <span style="color:var(--g-mid)">Mặc định</span>' : ''}</div>
      <div class="address-card-name">${a.fullName || ''} · ${a.phone || ''}</div>
      <div class="address-card-detail">${[a.address, a.ward, a.district, a.city].filter(Boolean).join(', ')}</div>
      <div class="address-card-actions">
        <button class="addr-btn danger" onclick="deleteAddress('${a._id}')">Xoá</button>
      </div>
    </div>`;
}
 
function toggleAddrForm() {
  const f = document.getElementById('addr-form');
  f.classList.toggle('open');
  if (f.classList.contains('open')) document.getElementById('af-name').focus();
}
 
async function saveNewAddress() {
  const fullName = document.getElementById('af-name')?.value?.trim();
  const phone = document.getElementById('af-phone')?.value?.trim();
  const address = document.getElementById('af-addr')?.value?.trim();
  const city = document.getElementById('af-city')?.value?.trim();
  const label = document.getElementById('af-label')?.value;
  const ward = document.getElementById('af-ward')?.value?.trim();
  const district = document.getElementById('af-district')?.value?.trim();
 
  if (!fullName || !phone || !address || !city) { showToast('Vui lòng điền đủ thông tin bắt buộc', 'error'); return; }
 
  try {
    const res = await AuthAPI.addAddress({ fullName, phone, address, city, ward, district, label });
    currentUser.addresses = res.addresses || currentUser.addresses;
    localStorage.setItem('hb_user', JSON.stringify(currentUser));
    showToast('✅ Đã thêm địa chỉ mới', 'success');
    renderAddressTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
 
async function deleteAddress(id) {
  if (!confirm('Xoá địa chỉ này?')) return;
  try {
    const res = await AuthAPI.deleteAddress(id);
    currentUser.addresses = (currentUser.addresses || []).filter(a => a._id !== id);
    localStorage.setItem('hb_user', JSON.stringify(currentUser));
    showToast('✅ Đã xoá địa chỉ', 'success');
    renderAddressTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
 
function renderPasswordTab() {
  const el = document.getElementById('account-tab-password');
  el.innerHTML = `
    <div style="background:var(--g-mist);border-radius:10px;padding:1rem;margin-bottom:1rem;font-size:.84rem;color:var(--text-mid)">
      🔒 Mật khẩu tối thiểu 6 ký tự. Sau khi đổi, bạn sẽ cần đăng nhập lại.
    </div>
    <div class="form-group">
      <label>Mật khẩu hiện tại *</label>
      <input type="password" id="pw-current" placeholder="Nhập mật khẩu hiện tại">
    </div>
    <div class="form-group">
      <label>Mật khẩu mới *</label>
      <input type="password" id="pw-new" placeholder="Tối thiểu 6 ký tự" oninput="checkPwStrength(this.value)">
      <div class="pw-strength" id="pw-strength-bar"></div>
    </div>
    <div class="form-group">
      <label>Xác nhận mật khẩu mới *</label>
      <input type="password" id="pw-confirm" placeholder="Nhập lại mật khẩu mới">
    </div>
    <button class="btn-primary full" onclick="doChangePassword()">Đổi mật khẩu</button>
  `;
}
 
function checkPwStrength(val) {
  const bar = document.getElementById('pw-strength-bar');
  if (!bar) return;
  if (!val) { bar.className = 'pw-strength'; return; }
  if (val.length < 6) bar.className = 'pw-strength weak';
  else if (val.length < 10 || !/[A-Z0-9]/.test(val)) bar.className = 'pw-strength medium';
  else bar.className = 'pw-strength strong';
}
 
async function doChangePassword() {
  const current = document.getElementById('pw-current')?.value;
  const newPw = document.getElementById('pw-new')?.value;
  const confirm = document.getElementById('pw-confirm')?.value;
  if (!current || !newPw || !confirm) { showToast('Vui lòng điền đầy đủ', 'error'); return; }
  if (newPw.length < 6) { showToast('Mật khẩu mới tối thiểu 6 ký tự', 'error'); return; }
  if (newPw !== confirm) { showToast('Mật khẩu xác nhận không khớp', 'error'); return; }
  try {
    await AuthAPI.changePassword({ currentPassword: current, newPassword: newPw });
    showToast('✅ Đổi mật khẩu thành công! Vui lòng đăng nhập lại.', 'success');
    closeAccountModal();
    setTimeout(logout, 1500);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
 
// ─── My Orders Modal (Lịch sử + Theo dõi) ───────────────────────────────────
const statusMap = {
  pending:    { label: 'Chờ xác nhận', cls: 'status-pending',    step: 0 },
  confirmed:  { label: 'Đã xác nhận',  cls: 'status-confirmed',  step: 1 },
  processing: { label: 'Đang xử lý',   cls: 'status-processing', step: 2 },
  shipped:    { label: 'Đang giao',     cls: 'status-shipped',    step: 3 },
  delivered:  { label: 'Đã giao',       cls: 'status-delivered',  step: 4 },
  cancelled:  { label: 'Đã huỷ',        cls: 'status-cancelled',  step: -1 }
};
 
let _ordersFilter = 'all';
let _ordersData = [];
 
async function showMyOrders() {
  document.getElementById('user-menu')?.remove();
  if (!currentUser) { openAuth(); return; }
 
  let overlay = document.getElementById('orders-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'orders-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '350';
    overlay.innerHTML = `
      <div class="modal orders-modal">
        <div class="modal-header">
          <h3>📦 Lịch sử đơn hàng</h3>
          <button class="btn-close" onclick="closeOrdersModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="order-filter-tabs" id="order-filter-tabs">
            <button class="order-ftab active" onclick="filterOrders('all',this)">Tất cả</button>
            <button class="order-ftab" onclick="filterOrders('pending',this)">Chờ xác nhận</button>
            <button class="order-ftab" onclick="filterOrders('shipped',this)">Đang giao</button>
            <button class="order-ftab" onclick="filterOrders('delivered',this)">Đã giao</button>
            <button class="order-ftab" onclick="filterOrders('cancelled',this)">Đã huỷ</button>
          </div>
          <div id="orders-list-body">
            <div style="text-align:center;padding:2rem;color:var(--text-light)">⏳ Đang tải...</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOrdersModal(); });
  }
 
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  _ordersFilter = 'all';
  document.querySelectorAll('.order-ftab').forEach((t,i) => t.classList.toggle('active', i===0));
  await fetchAndRenderOrders();
}
 
function closeOrdersModal() {
  document.getElementById('orders-modal-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}
 
async function fetchAndRenderOrders() {
  const body = document.getElementById('orders-list-body');
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-light)">⏳ Đang tải...</div>';
 
  try {
    const res = await OrderAPI.myOrders({ limit: 50 });
    _ordersData = res.data || [];
    renderOrdersList();
  } catch (err) {
    body.innerHTML = `<div style="text-align:center;color:#e53935;padding:2rem">${err.message}</div>`;
  }
}
 
function filterOrders(status, btn) {
  _ordersFilter = status;
  document.querySelectorAll('.order-ftab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderOrdersList();
}
 
function renderOrdersList() {
  const body = document.getElementById('orders-list-body');
  if (!body) return;
 
  const filtered = _ordersFilter === 'all' ? _ordersData : _ordersData.filter(o => o.status === _ordersFilter);
 
  if (!filtered.length) {
    body.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-light)">
      <div style="font-size:3rem;margin-bottom:1rem">📭</div>
      <p>${_ordersFilter === 'all' ? 'Bạn chưa có đơn hàng nào' : 'Không có đơn hàng ở trạng thái này'}</p>
      ${_ordersFilter === 'all' ? `<button class="btn-primary" style="margin-top:1rem" onclick="closeOrdersModal()">Mua sắm ngay</button>` : ''}
    </div>`;
    return;
  }
 
  body.innerHTML = filtered.map(o => {
    const s = statusMap[o.status] || { label: o.status, cls: 'status-pending' };
    const itemNames = (o.items || []).map(i => i.name).join(' · ');
    const canCancel = ['pending', 'confirmed'].includes(o.status);
    return `
      <div class="order-card" onclick="showOrderDetail('${o._id}')">
        <div class="order-card-header">
          <span class="order-card-code">${o.orderCode}</span>
          <span class="status-badge ${s.cls}">${s.label}</span>
        </div>
        <div class="order-card-date">${new Date(o.createdAt).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        <div class="order-card-items" style="margin:.35rem 0">${itemNames}</div>
        <div class="order-card-footer">
          <span class="order-card-total">${formatVND(o.totalAmount)}</span>
          <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
            ${canCancel ? `<button class="order-card-action" onclick="cancelOrder('${o._id}',this)">Huỷ đơn</button>` : ''}
            <button class="order-card-action" style="border-color:var(--g-mid);color:var(--g-mid)" onclick="showOrderDetail('${o._id}');event.stopPropagation()">Xem chi tiết</button>
          </div>
        </div>
      </div>`;
  }).join('');
}
 
async function showOrderDetail(orderId) {
  const order = _ordersData.find(o => o._id === orderId);
  if (!order) return;
 
  let overlay = document.getElementById('order-detail-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'order-detail-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '400';
    overlay.innerHTML = `
      <div class="modal order-detail-modal">
        <div class="modal-header">
          <h3>📋 Chi tiết đơn hàng</h3>
          <button class="btn-close" onclick="closeOrderDetail()">✕</button>
        </div>
        <div class="modal-body" id="order-detail-body"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOrderDetail(); });
  }
 
  const s = statusMap[order.status] || { label: order.status, cls: 'status-pending', step: 0 };
  const steps = [
    { key: 'pending',    icon: '📝', label: 'Đặt hàng' },
    { key: 'confirmed',  icon: '✅', label: 'Xác nhận' },
    { key: 'processing', icon: '📦', label: 'Đóng gói' },
    { key: 'shipped',    icon: '🚚', label: 'Đang giao' },
    { key: 'delivered',  icon: '🎉', label: 'Đã nhận' },
  ];
 
  const isCancelled = order.status === 'cancelled';
  const curStep = isCancelled ? -1 : (s.step ?? 0);
 
  const timelineHTML = isCancelled
    ? `<div class="timeline-step cancelled"><div class="timeline-dot">✕</div><div class="timeline-text"><strong>Đơn hàng đã huỷ</strong><span>${order.cancelReason || 'Không rõ lý do'}</span></div></div>`
    : steps.map((st, i) => {
        const isDone = i < curStep;
        const isActive = i === curStep;
        return `<div class="timeline-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}">
          <div class="timeline-dot">${isDone ? '✓' : st.icon}</div>
          <div class="timeline-text"><strong>${st.label}</strong><span>${isDone || isActive ? (i === 0 ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '') : 'Chờ cập nhật'}</span></div>
        </div>`;
      }).join('');
 
  const addr = order.shippingAddress;
  const addrText = addr ? [addr.fullName, addr.phone, addr.address, addr.ward, addr.district, addr.city].filter(Boolean).join(', ') : 'Không có';
 
  const itemsHTML = (order.items || []).map(item => {
    const imgSrc = item.image || (item.images && item.images[0]) || '';
    return `
      <div class="order-detail-item">
        <div class="order-item-img">
          ${imgSrc ? `<img src="${imgSrc}" alt="${item.name}" onerror="this.outerHTML='<span style=\\'font-size:1.4rem\\'>${item.emoji||'🌿'}</span>'">` : `<span style="font-size:1.4rem">${item.emoji||'🌿'}</span>`}
        </div>
        <div class="order-item-info">
          <div class="order-item-name">${item.name}</div>
          <div class="order-item-qty">×${item.quantity}</div>
        </div>
        <div class="order-item-price">${formatVND(item.price * item.quantity)}</div>
      </div>`;
  }).join('');
 
  document.getElementById('order-detail-body').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
      <strong style="color:var(--g-dark);font-size:1rem">${order.orderCode}</strong>
      <span class="status-badge ${s.cls}">${s.label}</span>
    </div>
    <div style="font-size:.8rem;color:var(--text-light);margin-bottom:1rem">Đặt lúc ${new Date(order.createdAt).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
 
    <h4 style="font-size:.88rem;color:var(--g-dark);margin-bottom:.5rem">📍 Giao đến</h4>
    <div style="background:var(--g-mist);border-radius:8px;padding:.75rem;font-size:.83rem;color:var(--text-mid);margin-bottom:1rem">${addrText}</div>
 
    <h4 style="font-size:.88rem;color:var(--g-dark);margin-bottom:.4rem">🛒 Sản phẩm</h4>
    <div class="order-detail-items">${itemsHTML}</div>
 
    <div style="background:var(--g-mist);border-radius:8px;padding:.75rem;font-size:.83rem;margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:var(--text-mid)">Tạm tính</span><span>${formatVND(order.totalAmount)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:var(--text-mid)">Phí vận chuyển</span><span style="color:var(--g-mid)">Miễn phí</span></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #d4e8c8;margin-top:4px"><strong style="color:var(--g-dark)">Tổng cộng</strong><strong style="color:var(--g-dark)">${formatVND(order.totalAmount)}</strong></div>
    </div>
 
    <h4 style="font-size:.88rem;color:var(--g-dark);margin-bottom:.4rem">📬 Theo dõi đơn hàng</h4>
    <div class="order-timeline">${timelineHTML}</div>
 
    ${['pending','confirmed'].includes(order.status) ? `
    <button class="btn-outline full" style="margin-top:.4rem;border-color:#ef4444;color:#ef4444" onclick="cancelOrder('${order._id}',this)">Huỷ đơn hàng</button>` : ''}
  `;
 
  overlay.classList.add('open');
}
 
function closeOrderDetail() {
  document.getElementById('order-detail-overlay')?.classList.remove('open');
}
 
async function cancelOrder(orderId, btn) {
  if (!confirm('Bạn chắc chắn muốn huỷ đơn hàng này?')) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Đang huỷ...'; }
  try {
    await OrderAPI.cancel(orderId, 'Khách hàng yêu cầu huỷ');
    showToast('✅ Đã huỷ đơn hàng', 'success');
    closeOrderDetail();
    await fetchAndRenderOrders();
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Huỷ đơn'; }
  }
}
 
 
// ─── Close auth on overlay click ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auth-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeAuth();
  });
  document.getElementById('product-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeProductModal();
  });
  document.getElementById('blog-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeBlog();
  });
 
  // Restore session
  const savedUser = localStorage.getItem('hb_user');
  const savedToken = localStorage.getItem('hb_token');
  if (savedUser && savedToken) {
    try {
      currentUser = JSON.parse(savedUser);
      updateAuthUI();
      AuthAPI.me().then(res => {
        currentUser = res.user;
        localStorage.setItem('hb_user', JSON.stringify(res.user));
        updateAuthUI();
      }).catch(() => logout());
    } catch (_) { logout(); }
  }
}); 