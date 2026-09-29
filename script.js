(() => {
  'use strict';

  /* =========================
     $Z TREASURY CONFIG
     ========================= */

  const TREASURY_WALLET =
    '9NqECEQ3w9U6kyV42h1G7bZiyHwCddEZCeEuNnHcbHsT';

  const Z_MINT =
    '7MQSupJTpY31HGChEHUAsS1pQhLSrHS5CCsB9bnaN3eS';

  const REFRESH_MS = 60000;
  const REQUEST_TIMEOUT_MS = 10000;

  const RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-rpc.publicnode.com',
    'https://solana.drpc.org'
  ];


  /* =========================
     EXISTING UI
     ========================= */

  const glow = document.querySelector('.cursor-glow');

  if (glow) {
    window.addEventListener(
      'pointermove',
      (event) => {
        glow.style.left = `${event.clientX}px`;
        glow.style.top = `${event.clientY}px`;
      },
      { passive: true }
    );
  }


  /* =========================
     COPY BUTTONS
     ========================= */

  document
    .querySelectorAll('.copy[data-copy]')
    .forEach((button) => {

      button.addEventListener('click', async () => {

        const value = button.dataset.copy || '';
        const oldText = button.textContent;

        try {

          await navigator.clipboard.writeText(value);

          button.textContent = 'COPIED ✓';

        } catch {

          button.textContent = 'COPY FAILED';

        }

        window.setTimeout(() => {
          button.textContent = oldText;
        }, 1400);

      });

    });


  /* =========================
     TREASURY ELEMENTS
     ========================= */

  const zBalanceEl =
    document.getElementById('z-balance');

  const updatedEl =
    document.getElementById('treasury-updated');

  const statusEl =
    document.getElementById('treasury-status');


  if (!zBalanceEl || !updatedEl || !statusEl) {
    console.error('Treasury HTML elements not found.');
    return;
  }


  /* =========================
     RPC REQUEST
     ========================= */

  async function rpcRequest(
    endpoint,
    method,
    params
  ) {

    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
      );


    try {

      const response =
        await fetch(endpoint, {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params
          }),

          cache: 'no-store',

          signal: controller.signal
        });


      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }


      const data =
        await response.json();


      if (data.error) {
        throw new Error(
          data.error.message ||
          'Solana RPC error'
        );
      }


      return data.result;

    } finally {

      clearTimeout(timer);

    }
  }


  /* =========================
     GET $Z BALANCE
     ========================= */

  async function getZBalance() {

    let lastError = null;


    for (const endpoint of RPC_ENDPOINTS) {

      try {

        const result =
          await rpcRequest(
            endpoint,
            'getTokenAccountsByOwner',
            [
              TREASURY_WALLET,

              {
                mint: Z_MINT
              },

              {
                encoding: 'jsonParsed',
                commitment: 'confirmed'
              }
            ]
          );


        if (
          !result ||
          !Array.isArray(result.value)
        ) {
          throw new Error(
            'Invalid Solana response'
          );
        }


        let rawAmount = 0n;
        let decimals = 0;


        for (
          const account
          of result.value
        ) {

          const tokenAmount =
            account
              ?.account
              ?.data
              ?.parsed
              ?.info
              ?.tokenAmount;


          if (!tokenAmount) {
            continue;
          }


          if (
            typeof tokenAmount.amount ===
            'string'
          ) {

            rawAmount += BigInt(
              tokenAmount.amount
            );

          }


          if (
            Number.isInteger(
              tokenAmount.decimals
            )
          ) {

            decimals =
              tokenAmount.decimals;

          }

        }


        const divisor =
          10 ** decimals;


        return Number(rawAmount) / divisor;

      } catch (error) {

        console.warn(
          `Treasury RPC failed: ${endpoint}`,
          error
        );

        lastError = error;

      }

    }


    throw (
      lastError ||
      new Error('All RPC endpoints failed')
    );
  }


  /* =========================
     NUMBER FORMAT
     ========================= */

  function formatNumber(value) {

    return new Intl.NumberFormat(
      'en-US',
      {
        maximumFractionDigits: 4,
        useGrouping: true
      }
    ).format(value);

  }


  /* =========================
     STATUS
     ========================= */

  function setStatus(
    live,
    message
  ) {

    statusEl.textContent =
      live
        ? ' LIVE'
        : ' TEMPORARILY UNAVAILABLE';


    statusEl.classList.toggle(
      'offline',
      !live
    );


    updatedEl.textContent =
      message;

  }


  /* =========================
     UPDATE TREASURY
     ========================= */

  async function updateTreasury() {

    try {

      setStatus(
        true,
        'Reading live data from Solana...'
      );


      const z =
        await getZBalance();


      if (
        !Number.isFinite(z) ||
        z < 0
      ) {

        throw new Error(
          'Invalid $Z balance'
        );

      }


      zBalanceEl.textContent =
        formatNumber(z);


      setStatus(
        true,
        `Live • Last updated: ${
          new Date().toLocaleTimeString()
        }`
      );


      console.log(
        '$Z Treasury Balance:',
        z
      );


    } catch (error) {

      console.error(
        'Treasury balance unavailable:',
        error
      );


      /*
       * Keep the previous balance
       * instead of replacing it with —
       */

      setStatus(
        false,
        'Treasury data temporarily unavailable • retrying automatically'
      );

    }

  }


  /* =========================
     START
     ========================= */

  updateTreasury();


  /* =========================
     AUTO REFRESH
     ========================= */

  setInterval(
    updateTreasury,
    REFRESH_MS
  );

})();
