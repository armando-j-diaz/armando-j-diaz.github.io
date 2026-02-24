/* ================================================
   PROJECTS PAGE — Filter & Count-Up
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initProjectFilter();
  initCountUp();
});

/* ------------------------------------------------
   FILTER LOGIC
   ------------------------------------------------ */
function initProjectFilter() {
  const filterBtns = document.querySelectorAll('[data-filter]');
  const projects = document.querySelectorAll('[data-category]');
  if (!filterBtns.length || !projects.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // Update active button
      filterBtns.forEach(b => b.classList.remove('filter__btn--active'));
      btn.classList.add('filter__btn--active');

      // Filter projects
      projects.forEach(project => {
        const category = project.dataset.category;
        const show = filter === 'all' || category === filter;

        if (show) {
          project.style.display = '';
          // Re-trigger entrance animation
          project.style.opacity = '0';
          project.style.transform = 'translateY(16px)';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              project.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
              project.style.opacity = '1';
              project.style.transform = 'translateY(0)';
            });
          });
        } else {
          project.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          project.style.opacity = '0';
          project.style.transform = 'translateY(8px)';
          setTimeout(() => {
            project.style.display = 'none';
          }, 300);
        }
      });
    });
  });
}

/* ------------------------------------------------
   COUNT-UP ANIMATION
   ------------------------------------------------ */
function initCountUp() {
  const stats = document.querySelectorAll('[data-count-target]');
  if (!stats.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.countTarget, 10);
        const duration = 2000;
        const startTime = performance.now();

        function update(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);

          el.textContent = current;

          if (progress < 1) {
            requestAnimationFrame(update);
          }
        }

        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(stat => observer.observe(stat));
}
