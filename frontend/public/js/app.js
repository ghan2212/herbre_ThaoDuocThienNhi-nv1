/* app.js – Main application logic */

// ─── State ────────────────────────────────────────────────────────────────────
let productsState = { data: [], page: 1, pages: 1, filter: { cat: 'all', sort: 'newest' } };
let blogsState = { data: [], page: 1, pages: 1, filter: { cat: 'all' } };
const bgColors = ['blog-bg-1','blog-bg-2','blog-bg-3','blog-bg-4','blog-bg-5'];

// ─── Format / Helper ──────────────────────────────────────────────────────────
const catLabels = {
  'ngam-chan':'Ngâm chân','am-bung':'Làm ấm bụng','giai-doc':'Giải độc',
  'thu-gian':'Thư giãn','ngu-ngon':'Ngủ ngon','lam-dep':'Làm đẹp','tra-thao-duoc':'Trà thảo dược'
};
const catBlogLabels = {
  'kien-thuc':'Kiến thức','lam-dep':'Làm đẹp','suc-khoe':'Sức khoẻ',
  'cong-thuc':'Công thức DIY','tin-tuc':'Tin tức'
};

function renderStars(rating) {
  const full = Math.round(rating || 0);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function scrollTo(selector) {
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function filterCategory(cat) {
  scrollTo('#products');
  productsState.filter.cat = cat;
  productsState.page = 1;
  document.querySelectorAll('#cat-tabs .ftab').forEach(t => {
    t.classList.toggle('active', t.dataset.cat === cat);
  });
  loadProducts(true);
}

function subscribeNewsletter() {
  const email = document.getElementById('nl-email')?.value?.trim();
  if (!email || !email.includes('@')) { showToast('Email không hợp lệ', 'error'); return; }
  showToast('🎉 Đăng ký thành công! Cảm ơn bạn.', 'success');
  document.getElementById('nl-email').value = '';
}

// ─── Products ─────────────────────────────────────────────────────────────────
async function loadProducts(reset = false) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (reset) {
    productsState.page = 1;
    grid.innerHTML = `<div class="loading-grid">
      <div class="skeleton-card"></div><div class="skeleton-card"></div>
      <div class="skeleton-card"></div><div class="skeleton-card"></div>
    </div>`;
  }

  try {
    const params = { page: productsState.page, limit: 8, sort: productsState.filter.sort };
    if (productsState.filter.cat !== 'all') params.category = productsState.filter.cat;

    const res = await ProductAPI.list(params);
    productsState.pages = res.pagination.pages;

    const cards = res.data.map(renderProductCard).join('');

    if (reset || productsState.page === 1) {
      grid.innerHTML = cards || `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-light)">Không tìm thấy sản phẩm nào</div>`;
    } else {
      grid.insertAdjacentHTML('beforeend', cards);
    }

    productsState.data = reset ? res.data : [...productsState.data, ...res.data];

    const loadMoreBtn = document.getElementById('btn-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = productsState.page < productsState.pages ? 'inline-block' : 'none';
    }
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#e53935">❌ ${err.message}</div>`;
  }
}

function renderProductCard(p) {
  const badgeMap = { 'Bán chạy':'badge-ban-chay', 'Hot':'badge-hot', 'Mới':'badge-moi', 'Sale':'badge-sale' };
  const hasDiscount = p.originalPrice && p.originalPrice > p.price;
  const badgeCls = badgeMap[p.badge] || '';
  const isWishlisted = currentUser?.wishlist?.some(w => (w._id || w) === p._id);

  const imgSrc = (p.images && p.images[0]) ? p.images[0] : '';
  return `
  <div class="product-card" onclick="openProductModal('${p._id}')">
    <div class="product-img">
      ${imgSrc
        ? `<img src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div class="img-placeholder" style="${imgSrc ? 'display:none' : 'display:flex'};font-size:4rem">${p.emoji || '🌿'}</div>
      ${p.badge ? `<span class="product-badge ${badgeCls}">${p.badge}</span>` : ''}
      ${hasDiscount ? `<span class="product-badge badge-sale" style="right:10px;left:auto">-${p.discountPercent || Math.round((1-p.price/p.originalPrice)*100)}%</span>` : ''}
      <button class="btn-wishlist-card ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation();toggleWishlist('${p._id}',this)" title="Yêu thích">${isWishlisted ? '❤️' : '🤍'}</button>
    </div>
    <div class="product-info">
      <div class="product-cat">${catLabels[p.category] || p.category}</div>
      <div class="product-stars">${renderStars(p.rating)} <span style="color:var(--text-light);font-size:.75rem">(${p.numReviews || 0})</span></div>
      <div class="product-name">${p.name}</div>
      <div class="product-desc">${p.shortDesc || p.description}</div>
      <div class="product-tags">${(p.tags || []).slice(0,3).map(t => `<span class="ptag">${t}</span>`).join('')}</div>
      <div class="product-footer">
        <div class="product-price">
          ${hasDiscount ? `<s>${formatVND(p.originalPrice)}</s>` : ''}
          ${formatVND(p.price)}
        </div>
        <button class="btn-add" onclick="event.stopPropagation();addToCart('${p._id}')" title="Thêm vào giỏ">+</button>
      </div>
    </div>
  </div>`;
}

function loadMoreProducts() {
  productsState.page++;
  loadProducts(false);
}

// ─── Wishlist Toggle ──────────────────────────────────────────────────────────
async function toggleWishlist(productId, btnEl) {
  if (!currentUser) { openAuth(); return; }
  try {
    const res = await AuthAPI.toggleWishlist(productId);
    const added = res.added;

    // Update local user wishlist state
    if (!currentUser.wishlist) currentUser.wishlist = [];
    if (added) {
      currentUser.wishlist.push(productId);
    } else {
      currentUser.wishlist = currentUser.wishlist.filter(w => (w._id || w) !== productId);
    }
    localStorage.setItem('hb_user', JSON.stringify(currentUser));

    // Update all wishlist buttons for this product
    document.querySelectorAll(`.btn-wishlist-card`).forEach(btn => {
      if (btn.getAttribute('onclick')?.includes(productId)) {
        btn.textContent = added ? '❤️' : '🤍';
        btn.classList.toggle('active', added);
      }
    });
    // Update modal heart if open
    const modalHeart = document.getElementById(`modal-heart-${productId}`);
    if (modalHeart) {
      modalHeart.textContent = added ? '❤️' : '🤍';
      modalHeart.classList.toggle('active', added);
    }

    showToast(added ? '❤️ Đã thêm vào yêu thích!' : '🤍 Đã bỏ khỏi yêu thích', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── Product Detail Modal ──────────────────────────────────────────────────────
async function openProductModal(id) {
  const overlay = document.getElementById('product-overlay');
  const content = document.getElementById('product-modal-content');
  if (!overlay || !content) return;

  content.innerHTML = `
    <div class="modal-header">
      <h3>Chi tiết sản phẩm</h3>
      <button class="btn-close" onclick="closeProductModal()">✕</button>
    </div>
    <div class="modal-body" style="text-align:center;padding:3rem;color:var(--text-light)">⏳ Đang tải...</div>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const res = await ProductAPI.get(id);
    const p = res.data;
    const hasDiscount = p.originalPrice && p.originalPrice > p.price;
    const isWishlisted = currentUser?.wishlist?.some(w => (w._id || w) === p._id);

    content.innerHTML = `
      <div class="modal-header">
        <h3 style="font-size:1rem">${p.name}</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="modal-heart-${p._id}" class="btn-wishlist-modal ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist('${p._id}',this)" title="Yêu thích">${isWishlisted ? '❤️' : '🤍'}</button>
          <button class="btn-close" onclick="closeProductModal()">✕</button>
        </div>
      </div>
      <div class="modal-body product-detail">
        <div class="product-detail-top">
          <div class="product-detail-img">
            ${(p.images && p.images[0])
              ? `<img src="${p.images[0]}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="img-placeholder" style="display:none;font-size:6rem">${p.emoji||'🌿'}</div>`
              : `<div class="img-placeholder" style="font-size:6rem">${p.emoji||'🌿'}</div>`}
          </div>
          <div class="product-detail-info">
            <div class="product-cat" style="margin-bottom:.5rem">${catLabels[p.category] || ''}</div>
            <h2>${p.name}</h2>
            <div class="product-stars" style="margin:.4rem 0">${renderStars(p.rating)} <span style="color:var(--text-light);font-size:.8rem">(${p.numReviews || 0} đánh giá) · Đã bán ${p.sold || 0}</span></div>
            <div class="product-detail-price">
              ${hasDiscount ? `<s>${formatVND(p.originalPrice)}</s> ` : ''}${formatVND(p.price)}
              ${hasDiscount ? `<span style="background:var(--gold);color:#fff;border-radius:5px;padding:2px 8px;font-size:.75rem;font-weight:700;margin-left:4px">-${Math.round((1-p.price/p.originalPrice)*100)}%</span>` : ''}
            </div>
            <div class="product-detail-tags">${(p.tags||[]).map(t=>`<span class="ptag">${t}</span>`).join('')}</div>
            <div class="product-detail-desc">${p.shortDesc || ''}</div>
            ${p.weight ? `<div style="font-size:.82rem;color:var(--text-mid);margin-bottom:.8rem">📦 Quy cách: <strong>${p.weight}</strong></div>` : ''}
            <div class="detail-qty">
              <label>Số lượng:</label>
              <div class="qty-control">
                <button onclick="changeDetailQty(-1)">−</button>
                <span id="detail-qty-num">1</span>
                <button onclick="changeDetailQty(1)">+</button>
              </div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn-primary" onclick="addToCartFromModal('${p._id}')">🛒 Thêm vào giỏ</button>
              <button class="btn-outline" onclick="addToCartFromModal('${p._id}',true)">⚡ Mua ngay</button>
              <button class="btn-outline" onclick="toggleWishlist('${p._id}',null)" id="modal-heart-btn-${p._id}" style="min-width:auto;padding:.6rem .9rem">${isWishlisted ? '❤️' : '🤍'}</button>
            </div>
          </div>
        </div>

        <div style="border-top:1px solid #f0f0f0;padding-top:1.2rem">
          <h4 style="font-size:.95rem;color:var(--g-dark);margin-bottom:.8rem">🌿 Thành phần thảo dược</h4>
          <div class="ingredients-list">
            ${(p.ingredients||[]).map(i=>`
              <div class="ingredient-item">
                <strong>${i.name}</strong>
                <span>${i.benefit}</span>
              </div>`).join('')}
          </div>
        </div>

        ${p.usage ? `
        <div style="margin-top:1.2rem">
          <h4 style="font-size:.95rem;color:var(--g-dark);margin-bottom:.6rem">📋 Hướng dẫn sử dụng</h4>
          <div class="usage-box">💡 ${p.usage}</div>
        </div>` : ''}

        ${p.description ? `
        <div style="margin-top:1.2rem">
          <h4 style="font-size:.95rem;color:var(--g-dark);margin-bottom:.6rem">📝 Mô tả chi tiết</h4>
          <p style="font-size:.88rem;color:var(--text-mid);line-height:1.8">${p.description}</p>
        </div>` : ''}

        ${p.benefits?.length ? `
        <div style="margin-top:1.2rem;background:var(--g-mist);border-radius:10px;padding:1rem">
          <h4 style="font-size:.95rem;color:var(--g-dark);margin-bottom:.6rem">✨ Công dụng nổi bật</h4>
          <ul style="padding-left:1.2rem">${p.benefits.map(b=>`<li style="font-size:.85rem;color:var(--text-mid);padding:.2rem 0">${b}</li>`).join('')}</ul>
        </div>` : ''}

        <!-- REVIEWS SECTION -->
        <div style="margin-top:1.5rem;border-top:1px solid #f0f0f0;padding-top:1.2rem" id="reviews-section-${p._id}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
            <h4 style="font-size:.95rem;color:var(--g-dark)">⭐ Đánh giá (${p.numReviews || 0})</h4>
            <div class="review-action-btn">
              ${currentUser
                ? `<span style="font-size:.78rem;color:var(--text-light)">🔄 Đang kiểm tra...</span>`
                : `<button class="btn-outline" style="font-size:.78rem;padding:.35rem .8rem" onclick="openAuth()">Đăng nhập để đánh giá</button>`}
            </div>
          </div>
          <div id="review-form-${p._id}" style="display:none;background:var(--g-mist);border-radius:10px;padding:1rem;margin-bottom:1rem">
            <div style="margin-bottom:.6rem">
              <label style="font-size:.82rem;font-weight:600;color:var(--g-dark)">Đánh giá của bạn:</label>
              <div class="star-picker" id="star-picker-${p._id}" style="display:flex;gap:4px;margin-top:.4rem">
                ${[1,2,3,4,5].map(n=>`<span class="star-pick" data-val="${n}" onclick="pickStar('${p._id}',${n})" style="font-size:1.5rem;cursor:pointer;opacity:.35;transition:.15s">★</span>`).join('')}
              </div>
              <input type="hidden" id="review-rating-${p._id}" value="0">
            </div>
            <div style="margin-bottom:.6rem">
              <label style="font-size:.82rem;font-weight:600;color:var(--g-dark)">Nhận xét:</label>
              <textarea id="review-comment-${p._id}" placeholder="Chia sẻ trải nghiệm của bạn với sản phẩm này..." style="width:100%;margin-top:.3rem;border:1px solid #d5e8cc;border-radius:8px;padding:.6rem;font-size:.85rem;font-family:'Be Vietnam Pro',sans-serif;resize:vertical;min-height:80px;background:#fff;box-sizing:border-box"></textarea>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn-primary" style="font-size:.82rem;padding:.4rem 1rem" onclick="submitReview('${p._id}')">Gửi đánh giá</button>
              <button class="btn-outline" style="font-size:.82rem;padding:.4rem 1rem" onclick="document.getElementById('review-form-${p._id}').style.display='none'">Huỷ</button>
            </div>
          </div>
          ${p.reviews?.length ? p.reviews.slice(0,5).map(r=>`
            <div style="padding:.7rem 0;border-bottom:1px dashed #e8f0e5">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:.3rem">
                <strong style="font-size:.85rem">${r.name}</strong>
                <span style="color:var(--gold);font-size:.8rem">${renderStars(r.rating)}</span>
                <span style="font-size:.75rem;color:var(--text-light)">${new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <p style="font-size:.84rem;color:var(--text-mid)">${r.comment}</p>
            </div>`).join('') : `<div style="text-align:center;padding:1.5rem;color:var(--text-light);font-size:.88rem">Chưa có đánh giá nào. Hãy là người đầu tiên! 🌿</div>`}
        </div>
      </div>`;

    window._detailProductId = p._id;
    window._detailQty = 1;

    // Check if user can review (has purchased, not yet reviewed)
    if (currentUser) {
      try {
        const reviewCheck = await ProductAPI.canReview(p._id);
        const reviewSection = document.getElementById(`reviews-section-${p._id}`);
        if (reviewSection) {
          const btnArea = reviewSection.querySelector('.review-action-btn');
          if (btnArea) {
            if (reviewCheck.canReview) {
              btnArea.innerHTML = `<button class="btn-outline" style="font-size:.78rem;padding:.35rem .8rem" onclick="openReviewForm('${p._id}')">✍️ Viết đánh giá</button>`;
            } else if (reviewCheck.alreadyReviewed) {
              btnArea.innerHTML = `<span style="font-size:.78rem;color:var(--g-mid);font-weight:600">✅ Đã đánh giá</span>`;
            } else if (!reviewCheck.hasPurchased) {
              btnArea.innerHTML = `<span style="font-size:.78rem;color:var(--text-light)">🛒 Mua sản phẩm để đánh giá</span>`;
            }
          }
        }
      } catch (_) {}
    }
  } catch (err) {
    content.querySelector('.modal-body').innerHTML = `<div style="text-align:center;color:#e53935;padding:2rem">❌ ${err.message}</div>`;
  }
}

function openReviewForm(productId) {
  const form = document.getElementById(`review-form-${productId}`);
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function pickStar(productId, val) {
  document.getElementById(`review-rating-${productId}`).value = val;
  document.querySelectorAll(`#star-picker-${productId} .star-pick`).forEach((s, i) => {
    s.style.opacity = i < val ? '1' : '.3';
    s.style.color = i < val ? 'var(--gold)' : '';
  });
}

async function submitReview(productId) {
  const rating = parseInt(document.getElementById(`review-rating-${productId}`)?.value || 0);
  const comment = document.getElementById(`review-comment-${productId}`)?.value?.trim();

  if (!rating || rating < 1) { showToast('Vui lòng chọn số sao đánh giá', 'error'); return; }
  if (!comment || comment.length < 10) { showToast('Nhận xét cần ít nhất 10 ký tự', 'error'); return; }

  const btn = document.querySelector(`#review-form-${productId} .btn-primary`);
  if (btn) { btn.disabled = true; btn.textContent = 'Đang gửi...'; }

  try {
    await ProductAPI.addReview(productId, { rating, comment });
    showToast('🎉 Cảm ơn bạn đã đánh giá!', 'success');
    // Reload modal to show new review
    closeProductModal();
    openProductModal(productId);
  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Gửi đánh giá'; }
  }
}

function closeProductModal() {
  document.getElementById('product-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function changeDetailQty(delta) {
  window._detailQty = Math.max(1, (window._detailQty || 1) + delta);
  const el = document.getElementById('detail-qty-num');
  if (el) el.textContent = window._detailQty;
}

async function addToCartFromModal(productId, buyNow = false) {
  const qty = window._detailQty || 1;
  await addToCart(productId, qty);
  if (buyNow) { closeProductModal(); openCart(); }
}

// ─── Combos ───────────────────────────────────────────────────────────────────
async function loadCombos() {
  const grid = document.getElementById('combos-grid');
  if (!grid) return;

  try {
    const res = await ComboAPI.list();
    if (!res.data.length) {
      grid.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-light)">Chưa có combo nào</div>';
      return;
    }
    grid.innerHTML = res.data.map(renderComboCard).join('');
  } catch (err) {
    grid.innerHTML = `<div style="text-align:center;color:#e53935;padding:2rem">❌ ${err.message}</div>`;
  }
}

function renderComboCard(c) {
  const imgSrc = c.image || (c.images && c.images[0]) || '';
  return `
  <div class="combo-card">
    ${imgSrc ? `<div class="combo-img-area"><img src="${imgSrc}" alt="${c.name}" loading="lazy" onerror="this.style.display='none'"></div>` : ''}
    <div class="combo-head">
      <span class="combo-label">${c.label || '🎁 Combo'}</span>
      <h4>${c.name}</h4>
      <p>${c.tagline || ''}</p>
    </div>
    <div class="combo-body">
      <ul class="combo-items">
        ${(c.items||[]).map(i=>`<li>${i.name || (i.product?.name)} ${i.quantity > 1 ? `×${i.quantity}` : ''}</li>`).join('')}
      </ul>
      <div class="combo-foot">
        <div>
          <div class="combo-saving">Tiết kiệm ${formatVND(c.savingAmount || (c.originalPrice - c.price))}</div>
          <div class="combo-price">
            <s>${formatVND(c.originalPrice)}</s>
            ${formatVND(c.price)}
          </div>
        </div>
        <button class="btn-combo" onclick="addComboToCart('${c._id}')">Mua combo</button>
      </div>
    </div>
  </div>`;
}

// ─── Blogs ────────────────────────────────────────────────────────────────────
async function loadBlogs(reset = false) {
  const grid = document.getElementById('blogs-grid');
  if (!grid) return;

  if (reset) {
    grid.innerHTML = `<div class="loading-grid">
      <div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>
    </div>`;
  }

  try {
    const params = { page: blogsState.page, limit: 6 };
    if (blogsState.filter.cat !== 'all') params.category = blogsState.filter.cat;
    const res = await BlogAPI.list(params);

    const cards = res.data.map((b, i) => renderBlogCard(b, i)).join('');
    grid.innerHTML = cards || `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-light)">Không có bài viết nào</div>`;
    blogsState.data = res.data;
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#e53935;padding:2rem">❌ ${err.message}</div>`;
  }
}

function renderBlogCard(b, idx) {
  const bg = bgColors[idx % bgColors.length];
  return `
  <div class="blog-card" onclick="openBlogModal('${b.slug || b._id}')">
    <div class="blog-img ${bg}">${b.emoji || '🌿'}</div>
    <div class="blog-meta">
      <div class="blog-cat">${catBlogLabels[b.category] || b.category}</div>
      <div class="blog-title">${b.title}</div>
      <div class="blog-excerpt">${b.excerpt}</div>
      <div class="blog-info">
        <span>🕐 ${b.readTime || 5} phút đọc</span>
        <span>📅 ${new Date(b.createdAt || Date.now()).toLocaleDateString('vi-VN')}</span>
        <span>👁 ${b.views || 0}</span>
      </div>
    </div>
  </div>`;
}

async function openBlogModal(slug) {
  const overlay = document.getElementById('blog-overlay');
  const body = document.getElementById('blog-modal-body');
  const titleEl = document.getElementById('blog-modal-title');
  if (!overlay) return;

  if (body) body.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-light)">⏳ Đang tải...</div>';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const res = await BlogAPI.get(slug);
    const b = res.data;
    if (titleEl) titleEl.textContent = b.title;
    if (body) {
      body.innerHTML = `
        <div style="margin-bottom:1.2rem">
          <span style="background:var(--g-pale);color:var(--g-dark);border-radius:20px;padding:3px 12px;font-size:.78rem;font-weight:600">${catBlogLabels[b.category] || b.category}</span>
          <span style="font-size:.8rem;color:var(--text-light);margin-left:.8rem">🕐 ${b.readTime} phút đọc · 👁 ${b.views} lượt xem</span>
        </div>
        <p style="font-size:.92rem;color:var(--text-mid);font-weight:500;margin-bottom:1.2rem;padding:.8rem;background:var(--g-mist);border-radius:8px;border-left:3px solid var(--g-mid)">${b.excerpt}</p>
        <div class="blog-content">${b.content || ''}</div>
        ${b.author?.name ? `
        <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #f0f0f0;display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;background:var(--g-pale);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem">👩‍⚕️</div>
          <div>
            <div style="font-weight:600;font-size:.85rem;color:var(--g-dark)">${b.author.name}</div>
            <div style="font-size:.75rem;color:var(--text-light)">Tác giả · Herbré</div>
          </div>
        </div>` : ''}
        ${res.related?.length ? `
        <div style="margin-top:1.5rem;border-top:1px solid #f0f0f0;padding-top:1.2rem">
          <h4 style="font-size:.9rem;color:var(--g-dark);margin-bottom:.8rem">📚 Bài viết liên quan</h4>
          <div style="display:grid;gap:.6rem">
            ${res.related.map(r=>`
              <div onclick="openBlogModal('${r.slug}')" style="display:flex;align-items:center;gap:10px;padding:.6rem;border:1px solid #e8f0e5;border-radius:8px;cursor:pointer;transition:.2s" onmouseover="this.style.background='var(--g-mist)'" onmouseout="this.style.background=''">
                <span style="font-size:1.6rem">${r.emoji || '🌿'}</span>
                <div>
                  <div style="font-size:.85rem;font-weight:600;color:var(--g-dark)">${r.title}</div>
                  <div style="font-size:.75rem;color:var(--text-light)">${r.readTime} phút đọc</div>
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}`;
    }
  } catch (err) {
    if (body) body.innerHTML = `<div style="text-align:center;color:#e53935;padding:2rem">❌ ${err.message}</div>`;
  }
}

function closeBlog() {
  document.getElementById('blog-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Wishlist Modal ───────────────────────────────────────────────────────────
async function showWishlist() {
  document.getElementById('user-menu')?.remove();
  if (!currentUser) { openAuth(); return; }

  let overlay = document.getElementById('wishlist-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'wishlist-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '360';
    overlay.innerHTML = `
      <div class="modal" style="max-width:580px;border-radius:18px">
        <div class="modal-header">
          <h3>❤️ Sản phẩm yêu thích</h3>
          <button class="btn-close" onclick="closeWishlist()">✕</button>
        </div>
        <div class="modal-body" id="wishlist-body" style="min-height:200px"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === this) closeWishlist(); });
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const body = document.getElementById('wishlist-body');
  body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-light)">⏳ Đang tải...</div>';

  try {
    const res = await AuthAPI.me();
    currentUser = res.user;
    localStorage.setItem('hb_user', JSON.stringify(currentUser));

    const wishlist = currentUser.wishlist || [];
    if (!wishlist.length) {
      body.innerHTML = `<div style="text-align:center;padding:3rem">
        <div style="font-size:3rem;margin-bottom:1rem">🤍</div>
        <p style="color:var(--text-light);font-size:.9rem">Bạn chưa có sản phẩm yêu thích nào.<br>Hãy khám phá và thêm sản phẩm vào danh sách!</p>
        <button class="btn-primary" style="margin-top:1rem" onclick="closeWishlist();scrollTo('#products')">Khám phá sản phẩm</button>
      </div>`;
      return;
    }

    body.innerHTML = `<div style="display:grid;gap:.8rem;padding:.5rem 0">
      ${wishlist.map(p => `
        <div style="display:flex;align-items:center;gap:12px;padding:.8rem;border:1px solid #e8f0e5;border-radius:12px;background:#fff;cursor:pointer" onclick="closeWishlist();openProductModal('${p._id}')">
          <div style="width:56px;height:56px;border-radius:10px;background:var(--g-mist);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
            ${p.images?.[0] ? `<img src="${p.images[0]}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.outerHTML='<span style=\\'font-size:1.8rem\\'>${p.emoji||'🌿'}</span>'">` : `<span style="font-size:1.8rem">${p.emoji||'🌿'}</span>`}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:.88rem;color:var(--g-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
            <div style="font-size:.8rem;color:var(--gold);font-weight:700">${formatVND(p.price)}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn-add" onclick="event.stopPropagation();addToCart('${p._id}')" title="Thêm vào giỏ" style="width:32px;height:32px;font-size:1rem">+</button>
            <button onclick="event.stopPropagation();removeFromWishlist('${p._id}')" title="Xoá khỏi yêu thích" style="width:32px;height:32px;border:1px solid #fca5a5;border-radius:8px;background:#fef2f2;color:#e53935;font-size:.9rem;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
          </div>
        </div>`).join('')}
    </div>`;
  } catch (err) {
    body.innerHTML = `<div style="text-align:center;color:#e53935;padding:2rem">❌ ${err.message}</div>`;
  }
}

async function removeFromWishlist(productId) {
  try {
    await AuthAPI.toggleWishlist(productId);
    if (currentUser?.wishlist) {
      currentUser.wishlist = currentUser.wishlist.filter(w => (w._id || w) !== productId);
      localStorage.setItem('hb_user', JSON.stringify(currentUser));
    }
    showWishlist(); // reload
    showToast('🤍 Đã xoá khỏi yêu thích', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeWishlist() {
  document.getElementById('wishlist-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Search ───────────────────────────────────────────────────────────────────
let searchTimer = null;

function openSearch() {
  const bar = document.getElementById('search-bar');
  bar.classList.add('open');
  document.getElementById('search-input')?.focus();
}

function closeSearch() {
  document.getElementById('search-bar')?.classList.remove('open');
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('search-input').value = '';
}

async function handleSearch(query) {
  const resultsEl = document.getElementById('search-results');
  if (!query.trim() || query.length < 2) { resultsEl.innerHTML = ''; return; }

  try {
    const res = await ProductAPI.search(query);
    if (!res.data.length) {
      resultsEl.innerHTML = `<div style="grid-column:1/-1;padding:.5rem 1rem;color:var(--text-light);font-size:.85rem">Không tìm thấy kết quả nào</div>`;
      return;
    }
    resultsEl.innerHTML = res.data.map(p => `
      <div class="search-result-item" onclick="closeSearch();openProductModal('${p._id}')">
        <div class="search-result-icon">
          ${(p.images && p.images[0])
            ? `<img src="${p.images[0]}" alt="${p.name}" onerror="this.outerHTML='<span style=\\'font-size:1.4rem\\'>${p.emoji||'🌿'}</span>'">`
            : `<span style="font-size:1.4rem">${p.emoji || '🌿'}</span>`}
        </div>
        <div class="search-result-info">
          <strong>${p.name}</strong>
          <span>${formatVND(p.price)}</span>
        </div>
      </div>`).join('');
  } catch (_) {}
}

// ─── Navbar behavior ──────────────────────────────────────────────────────────
function initNavbar() {
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    nav?.classList.toggle('scrolled', window.scrollY > 20);
  });

  // Mobile menu
  const menuBtn = document.getElementById('btn-menu');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      let mobileNav = document.getElementById('mobile-nav');
      if (mobileNav) { mobileNav.remove(); return; }
      mobileNav = document.createElement('div');
      mobileNav.id = 'mobile-nav';
      mobileNav.style.cssText = `
        position:fixed;top:68px;left:0;right:0;background:#fff;
        border-bottom:1px solid #e5ede0;z-index:98;
        padding:1rem 1.5rem;display:flex;flex-direction:column;gap:.2rem;
        box-shadow:0 8px 24px rgba(0,0,0,.08);animation:slideUp .2s ease;
      `;
      const links = [
        ['#products','🛍 Sản phẩm'],['#combos','🎁 Combo'],
        ['#benefits','💚 Công dụng'],['#blogs','📝 Blog']
      ];
      mobileNav.innerHTML = links.map(([href, label]) =>
        `<a href="${href}" style="padding:.7rem .5rem;font-size:.9rem;font-weight:500;color:var(--text);border-bottom:1px solid #f5f5f5" onclick="document.getElementById('mobile-nav')?.remove()">${label}</a>`
      ).join('') +
        (currentUser ? `<button style="margin-top:.5rem;background:none;border:none;text-align:left;padding:.7rem .5rem;font-size:.9rem;color:#e53935;cursor:pointer;font-family:'Be Vietnam Pro',sans-serif" onclick="logout();document.getElementById('mobile-nav')?.remove()">🚪 Đăng xuất (${currentUser.name})</button>`
          : `<button class="btn-primary" style="margin-top:.5rem" onclick="openAuth();document.getElementById('mobile-nav')?.remove()">Đăng nhập</button>`);
      document.body.appendChild(mobileNav);
    });
  }

  // Search
  document.getElementById('btn-search-open')?.addEventListener('click', openSearch);
  document.getElementById('btn-search-close')?.addEventListener('click', closeSearch);
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => handleSearch(e.target.value), 350);
  });
  document.getElementById('search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });

  // Filter tabs - products
  document.querySelectorAll('#cat-tabs .ftab').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#cat-tabs .ftab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      productsState.filter.cat = this.dataset.cat;
      loadProducts(true);
    });
  });

  // Sort select
  document.getElementById('sort-select')?.addEventListener('change', function() {
    productsState.filter.sort = this.value;
    loadProducts(true);
  });

  // Filter tabs - blogs
  document.querySelectorAll('.blog-filter .ftab').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.blog-filter .ftab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      blogsState.filter.cat = this.dataset.blogcat || 'all';
      loadBlogs(true);
    });
  });

  // Load more
  document.getElementById('btn-load-more')?.addEventListener('click', loadMoreProducts);

  // Wishlist button
  document.getElementById('btn-wishlist')?.addEventListener('click', () => {
    if (!currentUser) { openAuth(); return; }
    showWishlist();
  });
}

// ─── Payment result page ──────────────────────────────────────────────────────
function handlePaymentResult() {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get('status');
  const orderCode = urlParams.get('orderCode');

  if (!status) return;

  const messages = {
    success: { icon: '✅', title: 'Thanh toán thành công!', msg: `Đơn hàng <strong>${orderCode}</strong> đã được thanh toán qua VNPay.`, type: 'success' },
    failed:  { icon: '❌', title: 'Thanh toán thất bại', msg: `Đơn hàng <strong>${orderCode}</strong> chưa được thanh toán. Vui lòng thử lại.`, type: 'error' },
    invalid: { icon: '⚠️', title: 'Giao dịch không hợp lệ', msg: 'Phản hồi từ VNPay không hợp lệ.', type: 'error' },
    error:   { icon: '⚠️', title: 'Có lỗi xảy ra', msg: 'Vui lòng liên hệ hỗ trợ.', type: 'error' }
  };

  const info = messages[status];
  if (!info) return;

  setTimeout(() => {
    showToast(`${info.icon} ${info.title}`, info.type);
    if (status === 'success' && orderCode) {
      const trackInput = document.getElementById('track-code');
      if (trackInput) { trackInput.value = orderCode; }
    }
  }, 500);

  history.replaceState({}, '', window.location.pathname);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  handlePaymentResult();

  await Promise.all([
    loadProducts(true),
    loadCombos(),
    loadBlogs(true)
  ]);
});
