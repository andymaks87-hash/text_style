(function () {
  const doc = document;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));

  const state = {
    config: null,
    configPromise: null,
    token: null,
    listenersBound: false,
  };

  function getConfig() {
    if (state.config) {
      return Promise.resolve(state.config);
    }
    if (!state.configPromise) {
      state.configPromise = fetch('/data/app-config.json', { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error('config');
          return res.json();
        })
        .then((cfg) => {
          state.config = cfg;
          window.appConfig = Object.assign({}, window.appConfig || {}, cfg);
          return cfg;
        })
        .catch((err) => {
          state.configPromise = null;
          throw err;
        });
    }
    return state.configPromise;
  }

  function setToken(token) {
    state.token = token;
    if (token) {
      localStorage.setItem('lk_token', token);
    } else {
      localStorage.removeItem('lk_token');
    }
  }

  function setAuthed(isAuthed) {
    const wrap = $('#lk');
    if (!wrap) return;
    const loginBlock = $('.lk-login', wrap);
    const authedBlock = $('.lk-authed', wrap);
    wrap.removeAttribute('hidden');
    if (isAuthed) {
      if (loginBlock) loginBlock.hidden = true;
      if (authedBlock) authedBlock.hidden = false;
    } else {
      if (authedBlock) authedBlock.hidden = true;
      if (loginBlock) loginBlock.hidden = false;
    }
  }

  function logout() {
    setToken(null);
    setAuthed(false);
  }

  function api(path, options = {}) {
    return getConfig().then((cfg) => {
      const opts = Object.assign({ headers: {} }, options);
      if (state.token) {
        opts.headers = Object.assign({}, opts.headers, {
          Authorization: `Bearer ${state.token}`,
        });
      }
      return fetch(cfg.n8n_base_url + path, opts).then((res) => {
        if (res.status === 401) {
          logout();
          throw new Error('unauthorized');
        }
        return res;
      });
    });
  }

  function initStars() {
    const starsWrap = $('.stars');
    if (!starsWrap || starsWrap.dataset.ready === 'true') return;
    starsWrap.dataset.value = '0';
    $$('.stars button', starsWrap).forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.star || '0';
        starsWrap.dataset.value = value;
        $$('.stars button', starsWrap).forEach((btn) => {
          btn.classList.toggle('active', parseInt(btn.dataset.star || '0', 10) <= parseInt(value, 10));
        });
      });
    });
    starsWrap.dataset.ready = 'true';
  }

  function renderPayments(list) {
    const container = $('[data-payments]');
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      const empty = doc.createElement('li');
      empty.textContent = 'Пока нет платежей.';
      container.appendChild(empty);
      return;
    }
    list.forEach((item) => {
      const li = doc.createElement('li');
      const date = item.date || '';
      const plan = item.plan || '';
      const amount = item.amount ? `${item.amount} ₽` : '';
      const status = item.status || '';
      li.textContent = [date, plan, amount, status].filter(Boolean).join(' • ');
      container.appendChild(li);
    });
  }

  function updateReferralUI(data) {
    const percent = typeof data.progress === 'number' ? Math.max(0, Math.min(100, data.progress)) : 0;
    const text = data.text || 'Статус обновлён';
    const link = data.link || '';
    const stats = data.details || data.summary || '';

    $$('.ref-progress').forEach((progress) => {
      progress.setAttribute('aria-valuenow', String(percent));
      const bar = progress.querySelector('.ref-bar');
      if (bar) {
        bar.style.width = `${percent}%`;
      }
    });

    $$('.ref-status').forEach((node) => {
      node.textContent = text;
    });

    const statsNode = $('[data-ref-stats]');
    if (statsNode) {
      statsNode.textContent = stats || text;
    }

    const linkNode = $('[data-ref-link]');
    if (linkNode) {
      linkNode.textContent = link;
      if (link) {
        linkNode.dataset.href = link;
      }
    }
  }

  function loadReferral() {
    return api('/referral.status', { method: 'GET' })
      .then((res) => res.json())
      .then((data) => {
        updateReferralUI(data || {});
      })
      .catch(() => {
        const statuses = $$('.ref-status');
        statuses.forEach((node) => {
          node.textContent = 'Не удалось получить статус рефералов.';
        });
      });
  }

  function loadPayments() {
    return api('/payments.byUser', { method: 'GET' })
      .then((res) => res.json())
      .then((list) => {
        renderPayments(list || []);
      })
      .catch(() => {
        renderPayments([]);
      });
  }

  function sendReview() {
    const note = $('[data-review-note]');
    if (note) note.textContent = '';
    const starsWrap = $('.stars');
    const rating = parseInt((starsWrap && starsWrap.dataset.value) || '0', 10);
    const textField = $('[data-field="review_text"]');
    const text = textField ? textField.value.trim() : '';
    const isPublic = $('[data-field="is_public"]')?.checked ?? false;
    const isProf = $('[data-field="is_prof"]')?.value === 'yes';

    if (rating < 1 || !text) {
      if (note) note.textContent = 'Заполните оценку и текст отзыва.';
      return;
    }

    api('/reviews.save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, review_text: text, is_public: isPublic, is_prof: isProf }),
    })
      .then((res) => res.json())
      .then(() => {
        if (note) note.textContent = 'Спасибо! Отзыв отправлен.';
        if (textField) textField.value = '';
        if (starsWrap) {
          starsWrap.dataset.value = '0';
          $$('.stars button', starsWrap).forEach((btn) => btn.classList.remove('active'));
        }
        loadPublicReviews();
      })
      .catch(() => {
        if (note) note.textContent = 'Не удалось отправить отзыв. Попробуйте позже.';
      });
  }

  function applyPromo() {
    const input = $('[data-field="promo"]');
    const note = $('[data-promo-note]');
    if (!input || !note) return;
    const code = input.value.trim();
    if (!code) {
      note.textContent = 'Введите промокод.';
      return;
    }

    api('/promo.apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data) => {
        note.textContent = data.message || 'Промокод применён.';
      })
      .catch(() => {
        note.textContent = 'Не удалось применить промокод.';
      });
  }

  function bindActions() {
    if (state.listenersBound) return;
    const reviewBtn = $('[data-action="send-review"]');
    const promoBtn = $('[data-action="apply-promo"]');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', sendReview);
    }
    if (promoBtn) {
      promoBtn.addEventListener('click', applyPromo);
    }
    const linkNode = $('[data-ref-link]');
    if (linkNode) {
      linkNode.addEventListener('click', () => {
        const href = linkNode.dataset.href;
        if (href) {
          window.open(href, '_blank', 'noopener');
        }
      });
    }
    state.listenersBound = true;
  }

  function initAuthed() {
    initStars();
    bindActions();
    loadReferral();
    loadPayments();
  }

  function loadPublicReviews() {
    return getConfig()
      .then((cfg) => {
        const endpoint = cfg.reviews && cfg.reviews.public_endpoint;
        if (!endpoint) return null;
        return fetch(cfg.n8n_base_url + endpoint, { method: 'GET' })
          .then((res) => {
            if (!res.ok) throw new Error('reviews');
            return res.json();
          })
          .then((payload) => {
            let items = payload;
            if (Array.isArray(items) && items.length > 0 && items[0] && typeof items[0] === 'object' && 'json' in items[0]) {
              items = items.map((entry) => entry.json || entry);
            }
            if (items && !Array.isArray(items) && Array.isArray(items.reviews)) {
              items = items.reviews;
            }
            if (!Array.isArray(items) || items.length === 0) return;
            const grid = $('#reviews .tm-grid');
            if (!grid) return;
            grid.innerHTML = '';
            items.forEach((item) => {
              const article = doc.createElement('article');
              article.className = 'tm-card';
              const text = doc.createElement('p');
              text.className = 'tm-text';
              text.textContent = item.review_text || '';
              const footer = doc.createElement('footer');
              footer.className = 'tm-meta';
              const name = doc.createElement('span');
              name.textContent = item.user_name || 'Клиент';
              footer.appendChild(name);
              article.appendChild(text);
              article.appendChild(footer);
              grid.appendChild(article);
            });
            if (typeof window.setupReviewsSlider === 'function') {
              window.setupReviewsSlider();
            }
          });
      })
      .catch(() => {
        // ignore errors, leave статичный контент
      });
  }

  window.onTelegramAuth = function onTelegramAuth(user) {
    getConfig()
      .then(() => api('/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      }))
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.token) throw new Error('auth');
        setToken(data.token);
        setAuthed(true);
        initAuthed();
      })
      .catch(() => {
        alert('Не удалось войти через Telegram. Попробуйте позже.');
      });
  };

  doc.addEventListener('DOMContentLoaded', () => {
    getConfig()
      .then(() => {
        const saved = localStorage.getItem('lk_token');
        if (saved) {
          setToken(saved);
          setAuthed(true);
          initAuthed();
        } else {
          setAuthed(false);
        }
        loadPublicReviews();
      })
      .catch(() => {
        setAuthed(false);
      });
  });
})();
