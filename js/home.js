/* ================================================
   HOME PAGE — Typewriter Effect
   The signature interaction of the site.
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const typewriterEl = document.getElementById('typewriter');
  const cursor = document.getElementById('cursor');
  const nameLine = document.getElementById('nameLine');
  const heroName = document.getElementById('heroName');
  const cursorName = document.getElementById('cursorName');
  const subtitleLine = document.getElementById('subtitleLine');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const cursorSubtitle = document.getElementById('cursorSubtitle');
  const heroButtons = document.getElementById('heroButtons');
  const heroScroll = document.getElementById('heroScroll');

  if (!typewriterEl) return;

  // Start cursor blinking
  cursor.classList.add('hero__cursor--blinking');

  // Sequence steps
  const sequence = [
    // 1. Blink cursor for 400ms
    { action: 'wait', duration: 200 },

    // 2. Type "Information Systems Student..."
    { action: 'type', target: 'typewriter', text: 'Information Systems Student...', speed: 40 },

    // 3. Pause
    { action: 'wait', duration: 300 },

    // 4. Backspace all
    { action: 'backspace', target: 'typewriter', speed: 20 },

    // 5. Pause
    { action: 'wait', duration: 150 },

    // 6. Type "Data Engineer..."
    { action: 'type', target: 'typewriter', text: 'Data Engineer...', speed: 40 },

    // 7. Pause
    { action: 'wait', duration: 300 },

    // 8. Backspace all
    { action: 'backspace', target: 'typewriter', speed: 20 },

    // 9. Pause
    { action: 'wait', duration: 200 },

    // 10. Hide first line cursor, show name line
    { action: 'switchToName' },

    // 11. Type "Armando Diaz" (slower, more deliberate)
    { action: 'type', target: 'name', text: 'Armando Diaz', speed: 30 },

    // 12. Pause
    { action: 'wait', duration: 100 },

    // 13. Switch to subtitle
    { action: 'switchToSubtitle' },

    // 14. Type subtitle
    { action: 'type', target: 'subtitle', text: 'building no-bs data systems that drive revenue', speed: 35 },

    // 15. Finish
    { action: 'finish' }
  ];

  let stepIndex = 0;

  function getTargetEl(target) {
    switch (target) {
      case 'typewriter': return typewriterEl;
      case 'name': return heroName;
      case 'subtitle': return heroSubtitle;
      default: return typewriterEl;
    }
  }

  function getCursorEl(target) {
    switch (target) {
      case 'typewriter': return cursor;
      case 'name': return cursorName;
      case 'subtitle': return cursorSubtitle;
      default: return cursor;
    }
  }

  function runStep() {
    if (stepIndex >= sequence.length) return;

    const step = sequence[stepIndex];
    stepIndex++;

    switch (step.action) {
      case 'wait':
        setTimeout(runStep, step.duration);
        break;

      case 'type':
        typeText(getTargetEl(step.target), step.text, step.speed, () => {
          runStep();
        });
        break;

      case 'backspace':
        backspaceText(getTargetEl(step.target), step.speed, () => {
          runStep();
        });
        break;

      case 'switchToName':
        // Hide first-line cursor
        cursor.classList.remove('hero__cursor--blinking');
        cursor.classList.add('hero__cursor--hidden');
        // Show name line + cursor
        nameLine.style.opacity = '1';
        cursorName.style.display = 'inline-block';
        cursorName.classList.add('hero__cursor--blinking');
        // Hide typewriter line (keep text visible but fade it out)
        typewriterEl.style.transition = 'opacity 0.3s';
        typewriterEl.style.opacity = '0';
        setTimeout(runStep, 100);
        break;

      case 'switchToSubtitle':
        // Stop name cursor blinking, make solid
        cursorName.classList.remove('hero__cursor--blinking');
        cursorName.classList.add('hero__cursor--hidden');
        // Show subtitle line + cursor
        subtitleLine.style.opacity = '1';
        cursorSubtitle.style.display = 'inline-block';
        cursorSubtitle.classList.add('hero__cursor--blinking');
        setTimeout(runStep, 100);
        break;

      case 'finish':
        // Stop subtitle cursor blinking — make it solid
        cursorSubtitle.classList.remove('hero__cursor--blinking');
        cursorSubtitle.classList.add('hero__cursor--solid');

        // Fade in buttons
        setTimeout(() => {
          heroButtons.classList.add('hero__buttons--visible');
        }, 300);

        // Fade in scroll indicator
        setTimeout(() => {
          heroScroll.classList.add('hero__scroll--visible');
        }, 600);
        break;
    }
  }

  function typeText(el, text, speed, callback) {
    let i = 0;
    function tick() {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        setTimeout(tick, speed);
      } else {
        callback();
      }
    }
    tick();
  }

  function backspaceText(el, speed, callback) {
    function tick() {
      const current = el.textContent;
      if (current.length > 0) {
        el.textContent = current.slice(0, -1);
        setTimeout(tick, speed);
      } else {
        callback();
      }
    }
    tick();
  }

  // Start the sequence
  runStep();
});
