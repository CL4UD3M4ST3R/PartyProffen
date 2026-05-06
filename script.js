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
(function initCalendar() {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  // --- OPPTATTE DATOER ---
  // Format: 'ÅÅÅÅ-MM-DD'
  // Legg til nye datoer i denne listen for å markere dem som opptatt.
  const busyDates = [
    '2026-05-10', '2026-05-17', '2026-05-24',
    '2026-06-05', '2026-06-06', '2026-06-13', '2026-06-20', '2026-06-27',
    '2026-07-04', '2026-07-11', '2026-07-18',
    '2026-08-08', '2026-08-15', '2026-08-22',
  ];

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
    startDow = startDow === 0 ? 6 : startDow - 1; // Mon-first

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
      // Strip cf-turnstile-response — Web3Forms does not accept this field
      const fd = new FormData(form);
      fd.delete('cf-turnstile-response');

      const res  = await fetch('https://api.web3forms.com/submit', {
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
