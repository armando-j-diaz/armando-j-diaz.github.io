/* ================================================
   ARMANDO DIAZ — SHARED JS
   Scroll animations, mobile nav, utilities
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initMobileNav();
});

/* ------------------------------------------------
   SCROLL ANIMATION OBSERVER
   ------------------------------------------------ */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-on-scroll');
  if (!elements.length) return;

  // Group elements by parent for staggered delays
  const groups = new Map();
  elements.forEach(el => {
    const group = el.closest('[data-stagger-group]') || el.parentElement;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(el);
  });

  // Assign stagger delays within each group
  groups.forEach(children => {
    children.forEach((child, index) => {
      child.style.setProperty('--stagger-delay', `${index * 100}ms`);
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

/* ------------------------------------------------
   MOBILE NAV TOGGLE
   ------------------------------------------------ */
function initMobileNav() {
  const toggle = document.querySelector('.nav__toggle');
  const links = document.querySelector('.nav__links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('nav__links--open');
    toggle.setAttribute('aria-expanded', String(isOpen));

    // Animate hamburger lines
    const lines = toggle.querySelectorAll('.nav__toggle-line');
    if (isOpen) {
      lines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      lines[1].style.opacity = '0';
      lines[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      lines[0].style.transform = '';
      lines[1].style.opacity = '';
      lines[2].style.transform = '';
    }
  });

  // Close nav on link click
  links.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('nav__links--open');
      toggle.setAttribute('aria-expanded', 'false');
      const lines = toggle.querySelectorAll('.nav__toggle-line');
      lines.forEach(l => { l.style.transform = ''; l.style.opacity = ''; });
    });
  });

  // Close nav on outside click
  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('nav__links--open');
      toggle.setAttribute('aria-expanded', 'false');
      const lines = toggle.querySelectorAll('.nav__toggle-line');
      lines.forEach(l => { l.style.transform = ''; l.style.opacity = ''; });
    }
  });
}
