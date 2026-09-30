(() => {
  'use strict';

  const glow = document.querySelector('.cursor-glow');
  if (glow) {
    window.addEventListener('pointermove', (event) => {
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
    }, { passive: true });
  }

  document.querySelectorAll('.copy[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copy || '';
      const oldText = button.textContent;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = 'COPIED ✓';
      } catch {
        button.textContent = 'COPY FAILED';
      }
      window.setTimeout(() => { button.textContent = oldText; }, 1400);
    });
  });
})();
