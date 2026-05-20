'use strict';

/* ============================================================
   PARTICLE CANVAS — Hero
   ============================================================ */
(function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const C = { count: 75, color: '0,212,255', speed: 0.35, maxDist: 130 };
  let particles = [], W, H;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function make() {
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * C.speed,
      vy: (Math.random() - 0.5) * C.speed,
      r:  1 + Math.random() * 1.5,
    };
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${C.color},0.55)`;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < C.maxDist) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(${C.color},${(1 - d / C.maxDist) * 0.22})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(tick);
  }

  resize();
  particles = Array.from({ length: C.count }, make);
  tick();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
})();


/* ============================================================
   HEADER — sticky scroll state
   ============================================================ */
(function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  const update = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', update, { passive: true });
  update();
})();


/* ============================================================
   HAMBURGER MENU
   ============================================================ */
(function initMenu() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  function open() {
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('menu-open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
  }

  function close() {
    const scrollY = Math.abs(parseInt(document.body.style.top || '0', 10));
    document.body.classList.remove('menu-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollY);
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
  }

  btn.addEventListener('click', () => btn.classList.contains('open') ? close() : open());
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => e.key === 'Escape' && close());
})();


/* ============================================================
   PACKAGE BUTTONS — prefill form and scroll to contact
   ============================================================ */
(function initPackageButtons() {
  document.querySelectorAll('[data-select-package]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const val = el.getAttribute('data-select-package');
      const kontakt = document.getElementById('kontakt');
      if (kontakt) kontakt.scrollIntoView({ behavior: 'smooth' });

      if (val) {
        // Delay slightly so scroll doesn't race with DOM
        setTimeout(() => {
          const sel = document.getElementById('pakke');
          if (!sel) return;
          for (const opt of sel.options) {
            if (opt.value === val) { sel.value = val; break; }
          }
        }, 500);
      }
    });
  });
})();


/* ============================================================
   INTERSECTION OBSERVER — fade-in animations
   ============================================================ */
(function initFadeIn() {
  const els = document.querySelectorAll('.fade-in');
  if (!els.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });

  els.forEach(el => io.observe(el));
})();


/* ============================================================
   ACTIVE NAV HIGHLIGHT — on scroll
   ============================================================ */
(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-link');

  function update() {
    const scrollY = window.scrollY + 100;
    let current  = '';
    sections.forEach(s => { if (scrollY >= s.offsetTop) current = s.id; });
    links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current));
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();


/* ============================================================
   CALENDAR
   ============================================================ */
(async function initCalendar() {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1U7qC78D8Y4FuWjhZldbaazmfRJPr1AruTLzh1kkkRNI/gviz/tq?tqx=out:csv';
  const CACHE_KEY = 'pp_busy_dates';

  async function fetchBusyDates() {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        console.log('[Kalender] Laster fra cache:', parsed);
        return parsed;
      } catch { /* fall through */ }
    }
    console.log('[Kalender] Henter fra Google Sheets...');
    const res = await fetch(SHEET_URL);
    console.log('[Kalender] HTTP-status:', res.status, res.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    console.log('[Kalender] Rådata (første 200 tegn):', text.slice(0, 200));
    const dates = text.split('\n')
      .slice(1)
      .map(row => row.split(',')[0].trim().replace(/"/g, ''))
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    console.log('[Kalender] Parsede datoer:', dates);
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(dates));
    return dates;
  }

  let busyDates = [];
  try {
    busyDates = await fetchBusyDates();
  } catch (err) {
    console.warn('[Kalender] Klarte ikke hente datoer:', err);
  }

  const DAYS   = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
  const MONTHS = ['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'];

  const now = new Date();
  let year  = now.getFullYear();
  let month = now.getMonth();

  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

  function render() {
    const today    = new Date(); today.setHours(0,0,0,0);
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0).getDate();
    let startDow   = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    let html = `
      <div class="calendar-header">
        <button class="calendar-nav-btn" id="cal-prev" aria-label="Forrige måned">&#8592;</button>
        <span class="calendar-title">${MONTHS[month]} ${year}</span>
        <button class="calendar-nav-btn" id="cal-next" aria-label="Neste måned">&#8594;</button>
      </div>
      <div class="calendar-weekdays">${DAYS.map(d => `<div class="calendar-weekday">${d}</div>`).join('')}</div>
      <div class="calendar-days">
        ${'<div class="calendar-day calendar-day--empty"></div>'.repeat(startDow)}
    `;

    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d); date.setHours(0,0,0,0);
      const key  = iso(year, month, d);
      const busy = busyDates.includes(key);
      const isToday = date.getTime() === today.getTime();
      const past = date < today && !isToday;

      let cls = 'calendar-day';
      if      (busy)    cls += ' calendar-day--busy';
      else if (isToday) cls += ' calendar-day--today';
      else if (past)    cls += ' calendar-day--past';
      else              cls += ' calendar-day--available';

      html += `<div class="${cls}" aria-label="${key}">${d}</div>`;
    }

    html += '</div>';
    container.innerHTML = html;

    document.getElementById('cal-prev').addEventListener('click', () => {
      month--; if (month < 0) { month = 11; year--; } render();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      month++; if (month > 11) { month = 0; year++; } render();
    });
  }

  render();
})();


/* ============================================================
   CONTACT FORM — Web3Forms + Turnstile + rate limiting
   ============================================================ */
(function initContactForm() {
  const form        = document.getElementById('contact-form');
  const success     = document.getElementById('form-success');
  const errBox      = document.getElementById('form-error');
  const rateMsgEl   = document.getElementById('rate-limit-msg');
  const countdownEl = document.getElementById('rate-limit-countdown');
  const submitBtn   = form ? form.querySelector('.form-submit') : null;
  if (!form || !success || !errBox || !rateMsgEl || !submitBtn) return;

  // --- Rate limit config ---
  const RL_KEY    = 'pp_submissions';
  const RL_MAX    = 2;
  const RL_WINDOW = 30 * 60 * 1000; // 30 minutes in ms
  let countdownTimer = null;

  function getTimestamps() {
    try { return JSON.parse(localStorage.getItem(RL_KEY) || '[]'); }
    catch { return []; }
  }

  function pruneAndSave(push) {
    const now = Date.now();
    const ts  = getTimestamps().filter(t => now - t < RL_WINDOW);
    if (push) ts.push(now);
    localStorage.setItem(RL_KEY, JSON.stringify(ts));
    return ts;
  }

  function getRateLimitState() {
    const ts = pruneAndSave(false);
    if (ts.length < RL_MAX) return { limited: false };
    return { limited: true, unlockAt: Math.min(...ts) + RL_WINDOW };
  }

  function formatMM_SS(ms) {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function startCooldownUI(unlockAt) {
    submitBtn.disabled = true;
    rateMsgEl.hidden   = false;

    function tick() {
      const remaining = unlockAt - Date.now();
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        countdownTimer     = null;
        submitBtn.disabled = false;
        rateMsgEl.hidden   = true;
        pruneAndSave(false);
        return;
      }
      countdownEl.textContent = formatMM_SS(remaining);
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // Enforce cooldown on page load (persists across reloads)
  const initial = getRateLimitState();
  if (initial.limited) startCooldownUI(initial.unlockAt);

  let submitting = false; // guard against double-submit (e.g. Turnstile auto-requestSubmit)

  const errMsg = errBox.querySelector('p');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submitting) return;

    // Rate limit check
    const rl = getRateLimitState();
    if (rl.limited) { startCooldownUI(rl.unlockAt); return; }

    // Required-field validation
    let valid = true;
    ['navn', 'epost'].forEach(id => {
      const f = form.querySelector('#' + id);
      if (!f.value.trim()) { f.style.borderColor = '#ff4455'; valid = false; }
      else                  { f.style.borderColor = ''; }
    });
    if (!valid) return;

    // Turnstile gate — verify challenge completed before sending anything
    const tsToken = (form.querySelector('[name="cf-turnstile-response"]') || {}).value || '';
    if (!tsToken.trim()) {
      errMsg.textContent = 'Vennligst fullfør sikkerhetssjekken.';
      errBox.hidden = false;
      errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    submitting = true;
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Sender...';
    errBox.hidden         = true;

    try {
      const fd = new FormData(form);
      fd.delete('cf-turnstile-response');
      fd.delete('access_key');

      const res  = await fetch('https://partyproffen-form.jonasschanke.workers.dev', {
        method: 'POST',
        body:   fd,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        pruneAndSave(true);
        form.reset();
        form.hidden    = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        throw new Error(data.message || 'Ukjent feil');
      }
    } catch {
      if (window.turnstile) window.turnstile.reset();
      errMsg.textContent = 'Noe gikk galt. Prøv igjen, eller send oss en e-post direkte.';
      errBox.hidden = false;
      errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Send forespørsel';
      submitting = false;
    }
  });
})();


/* ============================================================
   FAQ ACCORDION
   ============================================================ */
(function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach(item => {
    const btn    = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      // Close all
      items.forEach(other => {
        other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        other.querySelector('.faq-answer').hidden = true;
      });

      // Open clicked if it was closed
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        answer.hidden = false;
      }
    });
  });
})();


/* ============================================================
   GALLERY LIGHTBOX — multi-image
   ============================================================ */
(function initGalleryLightbox() {
  const lb       = document.getElementById('gallery-lb');
  const imgEl    = document.getElementById('gallery-lb-img');
  const titleEl  = document.getElementById('gallery-lb-title');
  const descEl   = document.getElementById('gallery-lb-desc');
  const counter  = document.getElementById('gallery-lb-counter');
  const closeBtn = document.getElementById('gallery-lb-close');
  const prevBtn  = document.getElementById('gallery-lb-prev');
  const nextBtn  = document.getElementById('gallery-lb-next');
  const backdrop = document.getElementById('gallery-lb-backdrop');
  const imgWrap  = document.getElementById('gallery-lb-img-wrap');
  if (!lb) return;

  let images = [], idx = 0;

  function setImage(i) {
    imgEl.classList.add('fading');
    setTimeout(() => {
      idx = (i + images.length) % images.length;
      imgEl.src = images[idx];
      imgEl.alt = titleEl.textContent + ' — bilde ' + (idx + 1);
      counter.textContent = (idx + 1) + ' / ' + images.length;
      imgEl.classList.remove('fading');
    }, 180);
  }

  function prev() { setImage(idx - 1); }
  function next() { setImage(idx + 1); }

  function open(item) {
    try { images = JSON.parse(item.dataset.galleryImages); } catch { return; }
    idx = 0;
    titleEl.textContent = item.dataset.galleryTitle || '';
    descEl.textContent  = item.dataset.galleryDesc  || '';
    imgEl.src           = images[0];
    imgEl.alt           = titleEl.textContent + ' — bilde 1';
    counter.textContent = '1 / ' + images.length;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lb.hidden = true;
    document.body.style.overflow = '';
    imgEl.src = '';
  }

  document.querySelectorAll('[data-gallery]').forEach(el => {
    el.addEventListener('click', () => open(el));
  });
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape')     close();
  });

  // Swipe support
  let touchX = 0;
  imgWrap.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  imgWrap.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
  });
})();


/* ============================================================
   LIGHTBOX
   ============================================================ */
(function initLightbox() {
  const lightbox  = document.getElementById('lightbox');
  const imgEl     = document.getElementById('lightbox-img');
  const titleEl   = document.getElementById('lightbox-title');
  const descEl    = document.getElementById('lightbox-desc');
  const closeBtn  = document.getElementById('lightbox-close');
  const backdrop  = document.getElementById('lightbox-backdrop');
  if (!lightbox) return;

  function open(item) {
    const img = item.querySelector('.gallery-img');
    imgEl.src         = img.src;
    imgEl.alt         = img.alt;
    titleEl.textContent = item.dataset.title || '';
    descEl.textContent  = item.dataset.desc  || '';
    lightbox.hidden     = false;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    imgEl.src = '';
  }

  document.querySelectorAll('[data-lightbox]').forEach(item => {
    item.addEventListener('click', () => open(item));
  });
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lightbox.hidden) close(); });
})();
