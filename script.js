// Check-in date min = today
document.getElementById('fcheckin').min = new Date().toISOString().split('T')[0];

// Nav scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60));

// Hamburger menu
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  burger.classList.toggle('open');
  burger.setAttribute('aria-expanded', isOpen);
});
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});

// Scroll animations — fade-in generici
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));

// ──────────────────────────────────────────────────────────────
//  TOAST — notifica custom
// ──────────────────────────────────────────────────────────────
let _toastTimer = null;

function showToast(title, msg, type) {
  const toast = document.getElementById('toastNotification');
  toast.querySelector('.toast-title').textContent = title;
  toast.querySelector('.toast-msg').textContent   = msg;
  toast.className = 'toast toast--' + type + ' toast--visible';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => hideToast(), 5000);
}

function hideToast() {
  const toast = document.getElementById('toastNotification');
  toast.classList.remove('toast--visible');
}

document.getElementById('toastNotification')
  .querySelector('.toast-close')
  .addEventListener('click', hideToast);

// ──────────────────────────────────────────────────────────────
//  FORM — validazione + Formspree
// ──────────────────────────────────────────────────────────────
document.getElementById('fconsent').addEventListener('change', function () {
  document.getElementById('btnSubmit').disabled = !this.checked;
});

document.getElementById('contactForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const fname    = document.getElementById('fname').value;
  const fphone   = document.getElementById('fphone').value.trim();
  const fcheckin = document.getElementById('fcheckin').value;
  const ftime    = document.getElementById('ftime').value;

  // Validazione campi obbligatori
  const missing = [];
  if (!fname)    missing.push('Nome');
  if (!fphone)   missing.push('Numero di telefono');
  if (!fcheckin) missing.push('Data check-in');
  if (!ftime)    missing.push('Orario di arrivo');

  if (missing.length) {
    showToast('Campi mancanti', 'Compila: ' + missing.join(', ') + '.', 'error');
    return;
  }

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.textContent = 'Invio in corso…';

  try {
    const data = new FormData(this);
    const res  = await fetch(this.action, {
      method:  'POST',
      body:    data,
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      showToast('Messaggio inviato!', 'Gabriele ti risponderà presto al numero indicato.', 'success');
      this.reset();
      document.getElementById('fconsent').dispatchEvent(new Event('change')); // aggiorna btn
    } else {
      const json = await res.json().catch(() => ({}));
      const errMsg = (json.errors && json.errors[0] && json.errors[0].message) || 'Riprova tra qualche momento.';
      showToast('Errore di invio', errMsg, 'error');
      btn.disabled = false;
      btn.textContent = 'Invia richiesta →';
    }
  } catch {
    showToast('Errore di rete', 'Controlla la connessione e riprova.', 'error');
    btn.disabled = false;
    btn.textContent = 'Invia richiesta →';
  }
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ──────────────────────────────────────────────────────────────
//  STORIA E RADICI — animazioni scroll
// ──────────────────────────────────────────────────────────────

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 1. Foto museo — reveal con effetto tenda (clip-path) in sequenza
document.querySelectorAll('.storia-museo-item').forEach((item, i) => {
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const delay = reducedMotion ? 0 : i * 200;
        setTimeout(() => item.classList.add('revealed'), delay);
        revealObs.disconnect();
      }
    });
  }, { threshold: 0 });
  revealObs.observe(item);
});

// 2. Nodi timeline — pulse dorato sull'indicatore al momento dell'entrata
document.querySelectorAll('.storia-node').forEach((node, i) => {
  const nodeObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const delay = reducedMotion ? 0 : i * 120;
        setTimeout(() => node.classList.add('node-pulse'), delay);
        nodeObs.disconnect();
      }
    });
  }, { threshold: 0.3 });
  nodeObs.observe(node);
});

// 3. Count-up per i numeri nelle statistiche
function countUp(el, target, hasPlus, duration) {
  el.classList.add('counting');
  let startTime = null;
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(ease * target);
    el.textContent = current + (hasPlus ? '+' : '');
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.classList.remove('counting');
    }
  };
  requestAnimationFrame(step);
}

document.querySelectorAll('.storia-fact-num').forEach(el => {
  const raw = el.textContent.trim();
  const hasPlus = raw.endsWith('+');
  const target = parseFloat(raw.replace('+', ''));
  if (isNaN(target)) return;
  // Imposta a zero in attesa
  el.textContent = '0' + (hasPlus ? '+' : '');
  const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const duration = reducedMotion ? 0 : 1400;
        countUp(el, target, hasPlus, duration);
        countObs.disconnect();
      }
    });
  }, { threshold: 0.6 });
  countObs.observe(el);
});

// 4. Quote — reveal parola per parola
const quotePara = document.querySelector('.storia-quote p');
if (quotePara && !reducedMotion) {
  // Suddivide il testo in parole conservando gli spazi
  const words = quotePara.textContent.split(' ');
  quotePara.innerHTML = words
    .map(w => `<span class="storia-quote-word">${w}</span>`)
    .join(' ');
  const wordSpans = quotePara.querySelectorAll('.storia-quote-word');
  const quoteObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        wordSpans.forEach((s, i) => {
          setTimeout(() => s.classList.add('visible'), i * 48);
        });
        quoteObs.disconnect();
      }
    });
  }, { threshold: 0.4 });
  quoteObs.observe(quotePara);
}

