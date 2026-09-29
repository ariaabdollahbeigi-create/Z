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

  const TREASURY_WALLET = '9NqECEQ3w9U6kyV42h1G7bZiyHwCddEZCeEuNnHcbHsT';
  const REFRESH_MS = 60000;
  const REQUEST_TIMEOUT_MS = 10000;

  const zBalanceEl = document.getElementById('z-balance');
  const updatedEl = document.getElementById('treasury-updated');
  const statusEl = document.getElementById('treasury-status');
  if (!zBalanceEl || !updatedEl || !statusEl) return;

  async function getJson(url, timeout = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const r = await fetch(url, { cache: 'no-store', credentials: 'same-origin', signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally { clearTimeout(timer); }
  }

  function formatNumber(value, max = 4) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: max, useGrouping: true }).format(value);
  }

  function setStatus(live, message) {
    statusEl.textContent = live ? ' LIVE' : ' TEMPORARILY UNAVAILABLE';
    statusEl.classList.toggle('offline', !live);
    updatedEl.textContent = message;
  }

  async function updateTreasury() {
    try {
      // Production: all blockchain calls happen server-side. No RPC endpoint or key is exposed in the browser.
      const data = await getJson(`/api/treasury?t=${Date.now()}`);
      const z = Number(data?.z);
      if (!Number.isFinite(z) || z < 0) throw new Error('Invalid $Z balance');
      zBalanceEl.textContent = formatNumber(z, 4);
      setStatus(true, `Live • Last updated: ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error('Treasury balance unavailable:', error);
      zBalanceEl.textContent = '—';
      setStatus(false, 'Treasury data temporarily unavailable • retrying automatically');
    }
  }

  updateTreasury();
  setInterval(updateTreasury, REFRESH_MS);
})();
