(function () {
  const METRIKA_ID = 104859506;
  const doc = document;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));

  function ymGoal(target, params) {
    try {
      if (typeof window.ym === 'function') {
        window.ym(METRIKA_ID, 'reachGoal', target, params || {});
      }
    } catch (err) {
      // no-op
    }
  }

  // Calculator
  (function initCalculator() {
    const minutesInput = $('[data-field="minutes"]');
    const saveInput = $('[data-field="save"]');
    const result = $('[data-result]');
    if (!minutesInput || !saveInput || !result) return;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    let timer;

    function render() {
      const minutes = clamp(parseInt(minutesInput.value || '60', 10) || 60, 15, 240);
      const percent = clamp(parseInt(saveInput.value || '75', 10) || 75, 10, 90);
      minutesInput.value = minutes;
      saveInput.value = percent;
      const saved = Math.round(minutes * (percent / 100));
      result.textContent = `Экономия: ${saved} мин/день`;
    }

    const scheduleRender = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(render, 80);
    };

    ['input', 'change'].forEach((eventName) => {
      minutesInput.addEventListener(eventName, scheduleRender, { passive: true });
      saveInput.addEventListener(eventName, scheduleRender, { passive: true });
    });

    render();
  })();

  // Reviews slider
  let teardownReviews = null;

  function initReviewsSlider() {
    const grid = $('#reviews .tm-grid');
    if (!grid) return;

    if (typeof teardownReviews === 'function') {
      teardownReviews();
      teardownReviews = null;
    }

    const cards = $$('.tm-card', grid);
    grid.style.transform = '';
    grid.removeAttribute('data-slider');
    cards.forEach((card) => card.removeAttribute('tabindex'));

    if (cards.length <= 1) {
      return;
    }

    grid.setAttribute('data-slider', 'true');
    cards.forEach((card) => card.setAttribute('tabindex', '0'));

    let index = 0;
    let timer = null;
    const autoplay = parseInt(grid.getAttribute('data-autoplay') || '5000', 10);

    const goTo = (nextIndex) => {
      index = (nextIndex + cards.length) % cards.length;
      grid.style.transform = `translateX(-${index * 100}%)`;
    };

    const next = () => goTo(index + 1);
    const prev = () => goTo(index - 1);
    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };
    const start = () => {
      stop();
      if (autoplay > 0) {
        timer = window.setInterval(next, autoplay);
      }
    };

    const nextBtn = $('#reviews .tm-next');
    const prevBtn = $('#reviews .tm-prev');

    const onNextClick = () => {
      stop();
      next();
      start();
    };
    const onPrevClick = () => {
      stop();
      prev();
      start();
    };
    const onGridFocusIn = () => stop();
    const onGridFocusOut = () => start();
    const onGridEnter = () => stop();
    const onGridLeave = () => start();
    const onControlFocus = () => stop();
    const onControlBlur = () => start();
    const onControlEnter = () => stop();
    const onControlLeave = () => start();

    if (nextBtn) {
      nextBtn.addEventListener('click', onNextClick);
      nextBtn.addEventListener('focus', onControlFocus);
      nextBtn.addEventListener('blur', onControlBlur);
      nextBtn.addEventListener('mouseenter', onControlEnter);
      nextBtn.addEventListener('mouseleave', onControlLeave);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', onPrevClick);
      prevBtn.addEventListener('focus', onControlFocus);
      prevBtn.addEventListener('blur', onControlBlur);
      prevBtn.addEventListener('mouseenter', onControlEnter);
      prevBtn.addEventListener('mouseleave', onControlLeave);
    }

    grid.addEventListener('focusin', onGridFocusIn);
    grid.addEventListener('focusout', onGridFocusOut);
    grid.addEventListener('mouseenter', onGridEnter);
    grid.addEventListener('mouseleave', onGridLeave);

    goTo(0);
    start();

    teardownReviews = () => {
      stop();
      grid.style.transform = '';
      grid.removeAttribute('data-slider');
      cards.forEach((card) => card.removeAttribute('tabindex'));
      grid.removeEventListener('focusin', onGridFocusIn);
      grid.removeEventListener('focusout', onGridFocusOut);
      grid.removeEventListener('mouseenter', onGridEnter);
      grid.removeEventListener('mouseleave', onGridLeave);
      if (nextBtn) {
        nextBtn.removeEventListener('click', onNextClick);
        nextBtn.removeEventListener('focus', onControlFocus);
        nextBtn.removeEventListener('blur', onControlBlur);
        nextBtn.removeEventListener('mouseenter', onControlEnter);
        nextBtn.removeEventListener('mouseleave', onControlLeave);
      }
      if (prevBtn) {
        prevBtn.removeEventListener('click', onPrevClick);
        prevBtn.removeEventListener('focus', onControlFocus);
        prevBtn.removeEventListener('blur', onControlBlur);
        prevBtn.removeEventListener('mouseenter', onControlEnter);
        prevBtn.removeEventListener('mouseleave', onControlLeave);
      }
    };
  }

  initReviewsSlider();
  window.setupReviewsSlider = initReviewsSlider;

  // Metrika tracking
  doc.addEventListener('click', (event) => {
    const target = event.target.closest('[data-ym-target]');
    if (!target) return;
    const goal = target.getAttribute('data-ym-target');
    if (!goal) return;
    const source = target.getAttribute('data-source') || target.getAttribute('data-ym-source') || 'ui';
    ymGoal(goal, { source });
  });

  // Telegram bot opener
  window.openTelegramBot = function openTelegramBot(source = 'unknown') {
    const botHandle = (window.appConfig && window.appConfig.bot_handle) || 'TextStyle_main_bot';
    const url = `https://t.me/${botHandle}`;
    ymGoal('open_bot', { source });
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
})();
