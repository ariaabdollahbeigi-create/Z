$Z Website - FINAL v5

Treasury:
- Wallet: 9NqECEQ3w9U6kyV42h1G7bZiyHwCddEZCeEuNnHcbHsT
- Shows only $Z balance. SOL balance is intentionally removed.
- Server-side /api/treasury uses Solana getTokenAccountsByOwner with the $Z mint filter.
- The previous Token-2022 program-ID call was removed because one invalid/unsupported
  secondary RPC request could fail the whole Promise even when the main SPL request succeeded.
- Optional server-side environment variables: SOLANA_RPC_URL, HELIUS_RPC_URL, QUICKNODE_RPC_URL.
- Public Solana mainnet RPC is the final fallback.
- No API key is shipped to the browser.

Deploy on Vercel. If you add a paid RPC, add its URL as a Vercel Environment Variable.
