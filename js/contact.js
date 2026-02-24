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

    const subject = encodeURIComponent('Contact from ' + name);
    const body = encodeURIComponent('From: ' + name + '\nEmail: ' + email + '\n\n' + message);
    const mailtoUrl = 'mailto:Armando.diaz@ufl.edu?subject=' + subject + '&body=' + body;

    // Create a temporary link and click it — most reliable cross-browser method
    const link = document.createElement('a');
    link.href = mailtoUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show confirmation notification
    let note = form.querySelector('.form__notification');
    if (!note) {
      note = document.createElement('p');
      note.className = 'form__notification';
      form.appendChild(note);
    }
    note.textContent = '✓ Opening your default email app...';
    note.style.opacity = '1';
    setTimeout(() => { note.style.opacity = '0'; }, 4000);
  });
}
