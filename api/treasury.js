const TREASURY = '9NqECEQ3w9U6kyV42h1G7bZiyHwCddEZCeEuNnHcbHsT';
const MINT = '7MQSupJTpY31HGChEHUAsS1pQhLSrHS5CCsB9bnaN3eS';

// Keep RPC endpoints server-side. Add a paid endpoint in Vercel Environment Variables
// for higher reliability; the public Solana endpoint remains the last fallback.
const RPCS = [
  process.env.SOLANA_RPC_URL,
  process.env.HELIUS_RPC_URL,
  process.env.QUICKNODE_RPC_URL,
  'https://api.mainnet-beta.solana.com'
].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

async function rpc(url, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
    const data = await response.json();
    if (data?.error) throw new Error(data.error.message || 'RPC error');
    return data?.result?.value || [];
  } finally {
    clearTimeout(timer);
  }
}

function readBalance(accounts) {
  let raw = 0n;
  let decimals = null;

  for (const item of accounts) {
    const info = item?.account?.data?.parsed?.info;
    const amount = info?.tokenAmount;
    if (!info || info.mint !== MINT || !amount) continue;

    raw += BigInt(amount.amount || '0');
    if (decimals === null) decimals = Number(amount.decimals ?? 0);
  }

  if (decimals === null) return null;
  return Number(raw) / 10 ** decimals;
}

async function getZBalance(endpoint) {
  // IMPORTANT: filter by the mint itself. This works for the token's actual
  // Token Program without making a second, potentially incompatible program-ID call.
  // Solana documents getTokenAccountsByOwner with either `mint` or `programId` filters.
  const accounts = await rpc(endpoint, [
    TREASURY,
    { mint: MINT },
    { encoding: 'jsonParsed', commitment: 'confirmed' }
  ]);

  const balance = readBalance(accounts);
  if (balance === null || !Number.isFinite(balance) || balance < 0) {
    throw new Error('Token account not found');
  }
  return balance;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  for (const endpoint of RPCS) {
    try {
      const z = await getZBalance(endpoint);
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      return res.status(200).json({
        z,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Treasury RPC failed:', error?.message || String(error));
    }
  }

  return res.status(503).json({ error: 'Treasury data temporarily unavailable' });
}
