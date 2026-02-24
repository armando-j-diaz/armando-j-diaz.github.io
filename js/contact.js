/* ================================================
   CONTACT PAGE — Click-to-Copy & Form Submit
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initClickToCopy();
  initContactForm();
});

function initClickToCopy() {
  const copyBtn = document.querySelector('[data-copy]');
  if (!copyBtn) return;

  const tooltip = copyBtn.querySelector('.contact-item__tooltip');

  copyBtn.addEventListener('click', async () => {
    const text = copyBtn.dataset.copy;

    try {
      await navigator.clipboard.writeText(text);

      // Show tooltip
      if (tooltip) {
        tooltip.classList.add('contact-item__tooltip--visible');
        setTimeout(() => {
          tooltip.classList.remove('contact-item__tooltip--visible');
        }, 1500);
      }
    } catch (err) {
      // Fallback: select text for manual copy
      const range = document.createRange();
      const textNode = copyBtn.childNodes[1] || copyBtn;
      range.selectNodeContents(textNode);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  });
}

function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const message = form.querySelector('#message').value.trim();

    const subject = encodeURIComponent(`Contact from ${name}`);
    const body = encodeURIComponent(`From: ${name}\nEmail: ${email}\n\n${message}`);

    window.location.href = `mailto:Armando.diaz@ufl.edu?subject=${subject}&body=${body}`;
  });
}
