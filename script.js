// Check-in date min = today
document.getElementById('fcheckin').min = new Date().toISOString().split('T')[0];

// Nav scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60));

// Hamburger menu
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  burger.classList.toggle('open');
});
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    burger.classList.remove('open');
  });
});

// Scroll animations — fade-in generici
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));

// Form submit
document.getElementById('fconsent').addEventListener('change', function () {
  document.getElementById('btnSubmit').disabled = !this.checked;
});

function submitForm() {
  const name  = document.getElementById('fname').value.trim();
  const phone = document.getElementById('fphone').value.trim();
  if (!name || !phone) { alert('Compila nome e numero di telefono per procedere.'); return; }
  document.getElementById('contactForm').style.display = 'none';
  document.getElementById('formSuccess').style.display = 'block';
}

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

