import 'dotenv/config';
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  getAddress,
  http,
  isAddress,
  parseAbi,
  verifyMessage,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, mainnet } from 'viem/chains';

const app = express();
app.use(express.json({ limit: '32kb' }));

const chain = Number(process.env.CHAIN_ID) === 1 ? mainnet : sepolia;
const rpcUrl = process.env.RPC_URL;
const tokenAddress = getAddress(process.env.TOKEN_ADDRESS);
const delegateAddress = getAddress(process.env.MINT_DELEGATE_ADDRESS);
const relayerAddress = getAddress(process.env.RELAYER_ADDRESS);
const feeReceiver = getAddress(process.env.FEE_RECEIVER);
const mintPriceWei = BigInt(process.env.MINT_PRICE_WEI);
const relayerAccount = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY);
const testDelegationEnabled = process.env.ENABLE_TEST_DELEGATION === 'true';
const testDelegationPrivateKey = process.env.TEST_DELEGATION_PRIVATE_KEY || process.env.USER_PRIVATE_KEY || '';
const testDelegationAccount = testDelegationPrivateKey ? privateKeyToAccount(testDelegationPrivateKey) : null;
const backendAuthToken = process.env.BACKEND_AUTH_TOKEN || '';
const maxMintSlotsPerRequest = Number(process.env.MAX_MINT_SLOTS_PER_REQUEST || '10');
const requireAuth = process.env.REQUIRE_BACKEND_AUTH !== 'false';
const frontendPublicUrl = (process.env.FRONTEND_PUBLIC_URL || process.env.NEXT_PUBLIC_FRONTEND_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
const mcpPublicUrl = (process.env.MCP_PUBLIC_URL || process.env.NEXT_PUBLIC_MCP_PUBLIC_URL || '').replace(/\/$/, '');
const authSessionTtlMs = Number(process.env.AUTH_SESSION_TTL_MS || 1000 * 60 * 60 * 24);
const authDbPath = process.env.AUTH_SESSION_DB_PATH || path.resolve(process.cwd(), 'data/auth-sessions.json');
const allowedChainIds = new Set(String(process.env.ALLOWED_AUTH_CHAIN_IDS || chain.id).split(',').map((v) => Number(v.trim())).filter(Number.isFinite));
const siweDomain = process.env.SIWE_DOMAIN || new URL(frontendPublicUrl).host;
const allowedVerifyDomains = new Set([siweDomain, new URL(frontendPublicUrl).host].filter(Boolean));

const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ chain, transport: http(rpcUrl), account: relayerAccount });

const tokenAbi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function quota(address) view returns (uint256)',
  'function remaining() view returns (uint256)',
  'function totalMints() view returns (uint256)',
  'function mintsOf(address) view returns (uint256)',
  'function MINT_AMOUNT() view returns (uint256)',
  'function MAX_TOTAL_MINTS() view returns (uint256)',
  'function MAX_PER_WALLET() view returns (uint256)',
  'function RELAYER() view returns (address)',
  'function MINT_DELEGATE() view returns (address)',
  'function isDelegatedToMintDelegate(address) view returns (bool)',
]);

const delegateAbi = parseAbi([
  'function TOKEN() view returns (address)',
  'function FEE_RECEIVER() view returns (address)',
  'function FEE_WEI() view returns (uint256)',
  'function mint()',
  'function batchMint(uint256 count)',
]);

function unauthorized(res, message = 'unauthorized') {
  return res.status(401).json({ ok: false, message });
}

function badRequest(res, message, extra = {}) {
  return res.status(400).json({ ok: false, message, ...extra });
}

function normalizeError(error) {
  const message = error?.shortMessage || error?.message || 'internal error';
  const details = String(error?.details || '');
  const joined = `${message} ${details}`;

  if (/External EIP-7702 transactions are not supported/i.test(joined)) {
    return {
      statusCode: 501,
      message: 'The configured RPC provider does not support EIP-7702 execution transactions yet. Switch the backend RPC_URL to a Sepolia endpoint that supports 7702.',
      code: 'EIP7702_UNSUPPORTED_BY_RPC',
    };
  }

  return { statusCode: error?.statusCode || 500, message };
}

function serverError(res, error, extra = {}) {
  const normalized = normalizeError(error);
  return res.status(normalized.statusCode).json({ ok: false, message: normalized.message, code: normalized.code, ...extra });
}

function authMiddleware(req, res, next) {
  if (!requireAuth) return next();
  if (!backendAuthToken) return unauthorized(res, 'backend auth token not configured');

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return unauthorized(res, 'missing bearer token');
  const token = header.slice('Bearer '.length).trim();
  if (token !== backendAuthToken) return unauthorized(res, 'invalid bearer token');
  next();
}

function normalizeSlots(slots) {
  const count = Number(slots ?? 1);
  if (!Number.isInteger(count) || count <= 0) {
    const error = new Error('slots must be a positive integer');
    error.statusCode = 400;
    throw error;
  }
  if (count > maxMintSlotsPerRequest) {
    const error = new Error(`slots exceeds max per request (${maxMintSlotsPerRequest})`);
    error.statusCode = 400;
    throw error;
  }
  return count;
}

function assertTestDelegationAllowed() {
  if (!testDelegationEnabled) {
    const error = new Error('test delegation endpoint is disabled');
    error.statusCode = 403;
    throw error;
  }
  if (chain.id === 1) {
    const error = new Error('test delegation endpoint is blocked on mainnet');
    error.statusCode = 403;
    throw error;
  }
  if (!testDelegationAccount) {
    const error = new Error('test delegation private key is not configured');
    error.statusCode = 500;
    throw error;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomId(size = 18) {
  return crypto.randomBytes(size).toString('base64url');
}

async function ensureAuthDb() {
  await fs.mkdir(path.dirname(authDbPath), { recursive: true });
  try {
    await fs.access(authDbPath);
  } catch {
    await fs.writeFile(authDbPath, JSON.stringify({ sessions: [] }, null, 2));
  }
}

async function readAuthDb() {
  await ensureAuthDb();
  try {
    const raw = await fs.readFile(authDbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.sessions) ? parsed : { sessions: [] };
  } catch {
    return { sessions: [] };
  }
}

let authWriteChain = Promise.resolve();
function updateAuthDb(mutator) {
  authWriteChain = authWriteChain.then(async () => {
    const db = await readAuthDb();
    const result = await mutator(db);
    await fs.writeFile(authDbPath, JSON.stringify(db, null, 2));
    return result;
  });
  return authWriteChain;
}

function connectUrlForSession(sessionId) {
  return `${frontendPublicUrl}/oauth/authorize?session=${encodeURIComponent(sessionId)}`;
}

function sanitizeSession(session) {
  return {
    id: session.id,
    ai_client: session.ai_client,
    wallet_address: session.wallet_address,
    status: session.status,
    scopes: session.scopes,
    created_at: session.created_at,
    updated_at: session.updated_at,
    expires_at: session.expires_at,
    linked_at: session.linked_at,
    last_seen_at: session.last_seen_at,
    origin: session.origin,
    connector_request_id: session.connector_request_id,
    redirect_uri: session.redirect_uri,
    state: session.state,
    connect_url: connectUrlForSession(session.id),
  };
}

function isExpired(session) {
  return new Date(session.expires_at).getTime() <= Date.now();
}

async function findSessionById(sessionId) {
  const db = await readAuthDb();
  return db.sessions.find((session) => session.id === sessionId) || null;
}

async function findSessionByToken(sessionToken) {
  const tokenHash = sha256(sessionToken);
  const db = await readAuthDb();
  return db.sessions.find((session) => session.session_token_hash === tokenHash) || null;
}

async function touchSessionByToken(sessionToken, attrs = {}) {
  return updateAuthDb((db) => {
    const tokenHash = sha256(sessionToken);
    const session = db.sessions.find((item) => item.session_token_hash === tokenHash);
    if (!session) return null;
    Object.assign(session, attrs, { updated_at: nowIso(), last_seen_at: nowIso() });
    if (isExpired(session) && session.status !== 'expired') session.status = 'expired';
    return session;
  });
}

async function createOrRefreshAuthSession({ sessionToken, aiClient = 'mcp', scopes = ['wallet_status', 'mint_quota', 'token_balance', 'token_mint', 'authorization_status'], origin = null, connectorRequestId = null, redirectUri = null, state = null, }) {
  const tokenHash = sha256(sessionToken);
  const expiresAt = new Date(Date.now() + authSessionTtlMs).toISOString();
  return updateAuthDb((db) => {
    let session = db.sessions.find((item) => item.session_token_hash === tokenHash);
    if (session) {
      session.ai_client = aiClient || session.ai_client;
      session.origin = origin ?? session.origin;
      session.connector_request_id = connectorRequestId ?? session.connector_request_id;
      session.redirect_uri = redirectUri ?? session.redirect_uri;
      session.state = state ?? session.state;
      session.scopes = scopes;
      session.expires_at = expiresAt;
      session.updated_at = nowIso();
      session.last_seen_at = nowIso();
      if (isExpired(session)) session.status = 'expired';
      return session;
    }

    session = {
      id: randomId(12),
      session_token_hash: tokenHash,
      ai_client: aiClient,
      wallet_address: null,
      nonce: null,
      nonce_issued_at: null,
      status: 'pending',
      scopes,
      created_at: nowIso(),
      updated_at: nowIso(),
      expires_at: expiresAt,
      linked_at: null,
      last_seen_at: nowIso(),
      origin,
      connector_request_id: connectorRequestId,
      redirect_uri: redirectUri,
      state,
      last_verified_message: null,
      last_signature: null,
    };
    db.sessions.push(session);
    return session;
  });
}

function parseSiweLikeMessage(message) {
  const lines = String(message || '').split(/\r?\n/);
  const firstLine = lines[0] || '';
  const domain = firstLine.split(' wants you to sign in with your Ethereum account:')[0]?.trim();
  const address = lines[1]?.trim();
  const out = { domain, address };
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (!rest.length) continue;
    out[key.trim().toLowerCase()] = rest.join(':').trim();
  }
  return {
    domain: out.domain,
    address: out.address,
    uri: out.uri,
    version: out.version,
    chainId: Number(out['chain id']),
    nonce: out.nonce,
    issuedAt: out['issued at'],
    sessionId: out['session id'],
  };
}

function buildSiweMessage({ walletAddress, sessionId, nonce }) {
  const issuedAt = nowIso();
  return `${siweDomain} wants you to sign in with your Ethereum account:\n${walletAddress}\n\nSign in to CATSHIT to link this wallet to your AI mint session.\n\nURI: ${frontendPublicUrl}\nVersion: 1\nChain ID: ${chain.id}\nNonce: ${nonce}\nIssued At: ${issuedAt}\nSession ID: ${sessionId}`;
}

async function getTokenInfo() {
  const [name, symbol, mintAmount, maxTotalMints, maxPerWallet, remaining, totalMints] = await Promise.all([
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'name' }),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'symbol' }),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'MINT_AMOUNT' }),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'MAX_TOTAL_MINTS' }),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'MAX_PER_WALLET' }),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'remaining' }),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'totalMints' }),
  ]);

  return {
    tokenAddress,
    delegateAddress,
    relayerAddress,
    feeReceiver,
    mintPriceWei: mintPriceWei.toString(),
    mintPriceEth: formatEther(mintPriceWei),
    name,
    symbol,
    mintAmount: mintAmount.toString(),
    maxTotalMints: maxTotalMints.toString(),
    maxPerWallet: maxPerWallet.toString(),
    remaining: remaining.toString(),
    totalMints: totalMints.toString(),
  };
}

async function getWalletStatus(wallet) {
  const address = getAddress(wallet);
  const [delegated, quotaRemaining, tokenBalance, mintsOf, ethBalance] = await Promise.all([
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'isDelegatedToMintDelegate', args: [address] }),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'quota', args: [address] }),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'balanceOf', args: [address] }),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'mintsOf', args: [address] }),
    publicClient.getBalance({ address }),
  ]);

  return {
    wallet: address,
    delegated,
    quotaRemaining: quotaRemaining.toString(),
    tokenBalance: tokenBalance.toString(),
    mintsOf: mintsOf.toString(),
    ethBalanceWei: ethBalance.toString(),
    ethBalanceEth: formatEther(ethBalance),
  };
}

async function getAuthorizationStatus(wallet) {
  const status = await getWalletStatus(wallet);
  return {
    wallet: status.wallet,
    delegated: status.delegated,
    delegateAddress,
  };
}

async function mintForWallet(wallet, slots) {
  const address = getAddress(wallet);
  const count = normalizeSlots(slots);

  const [walletStatus, remaining] = await Promise.all([
    getWalletStatus(address),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'remaining' }),
  ]);

  if (!walletStatus.delegated) {
    const error = new Error('wallet is not delegated to the configured MintDelegate');
    error.statusCode = 400;
    throw error;
  }

  if (BigInt(walletStatus.quotaRemaining) < BigInt(count)) {
    const error = new Error('wallet quota too low for requested slots');
    error.statusCode = 400;
    throw error;
  }

  if (remaining < BigInt(count)) {
    const error = new Error('public mint remaining is too low for requested slots');
    error.statusCode = 400;
    throw error;
  }

  const requiredFee = mintPriceWei * BigInt(count);
  if (BigInt(walletStatus.ethBalanceWei) < requiredFee) {
    const error = new Error('wallet balance is too low for mint fee');
    error.statusCode = 400;
    throw error;
  }

  const hash = await walletClient.sendTransaction({
    account: relayerAccount,
    to: address,
    data: count === 1
      ? encodeFunctionData({ abi: delegateAbi, functionName: 'mint' })
      : encodeFunctionData({ abi: delegateAbi, functionName: 'batchMint', args: [BigInt(count)] }),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const updated = await getWalletStatus(address);
  const totalMints = await publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'totalMints' });

  return {
    ok: true,
    wallet: address,
    slotsRequested: count,
    feeWei: requiredFee.toString(),
    feeEth: formatEther(requiredFee),
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    quotaRemaining: updated.quotaRemaining,
    tokenBalance: updated.tokenBalance,
    mintsOf: updated.mintsOf,
    totalMints: totalMints.toString(),
  };
}

async function activateTestDelegation(wallet) {
  assertTestDelegationAllowed();

  const targetWallet = getAddress(wallet || testDelegationAccount.address);
  if (targetWallet !== testDelegationAccount.address) {
    const error = new Error('wallet does not match configured test delegation account');
    error.statusCode = 400;
    throw error;
  }

  const before = await getWalletStatus(targetWallet);
  if (before.delegated) {
    return {
      ok: true,
      wallet: targetWallet,
      delegated: true,
      alreadyDelegated: true,
      delegateAddress,
      txHash: null,
    };
  }

  const delegationClient = createWalletClient({
    chain,
    transport: http(rpcUrl),
    account: testDelegationAccount,
  });

  const authorization = await delegationClient.signAuthorization({
    account: testDelegationAccount,
    contractAddress: delegateAddress,
    executor: 'self',
  });

  const hash = await delegationClient.sendTransaction({
    account: testDelegationAccount,
    to: targetWallet,
    value: 0n,
    authorizationList: [authorization],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const after = await getWalletStatus(targetWallet);

  return {
    ok: true,
    wallet: targetWallet,
    delegated: after.delegated,
    alreadyDelegated: false,
    delegateAddress,
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
  };
}

async function getSessionContextFromToken(sessionToken) {
  if (!sessionToken) {
    const error = new Error('missing session token');
    error.statusCode = 400;
    throw error;
  }

  let session = await findSessionByToken(sessionToken);
  if (!session) {
    session = await createOrRefreshAuthSession({ sessionToken, aiClient: 'mcp' });
  } else {
    session = await touchSessionByToken(sessionToken) || session;
  }

  if (isExpired(session)) {
    await updateAuthDb((db) => {
      const target = db.sessions.find((item) => item.id === session.id);
      if (target) {
        target.status = 'expired';
        target.updated_at = nowIso();
        target.last_seen_at = nowIso();
      }
    });
    return {
      ok: false,
      code: 'SESSION_EXPIRED',
      message: 'Your CATSHIT session expired. Reconnect your wallet:',
      connect_url: connectUrlForSession(session.id),
      session: sanitizeSession(session),
    };
  }

  if (!session.wallet_address || !['signed', 'delegated'].includes(session.status)) {
    return {
      ok: false,
      code: 'SESSION_UNLINKED',
      message: 'Your CATSHIT session is not linked to a wallet yet. Open this link to connect your wallet:',
      connect_url: connectUrlForSession(session.id),
      session: sanitizeSession(session),
    };
  }

  return { ok: true, session };
}

app.get('/health', async (_req, res) => {
  try {
    const [blockNumber, relayerBalance] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.getBalance({ address: relayerAccount.address }),
    ]);
    res.json({
      ok: true,
      service: 'eta-ai-mint-backend',
      network: process.env.NETWORK,
      chainId: chain.id,
      relayerAddress: relayerAccount.address,
      relayerBalanceWei: relayerBalance.toString(),
      blockNumber: blockNumber.toString(),
      authRequired: requireAuth,
      testDelegationEnabled,
      testDelegationWallet: testDelegationAccount?.address || null,
      executionModel: 'eip7702_external_execution',
      rpcUrlConfigured: Boolean(rpcUrl),
      authSessionStore: authDbPath,
    });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/auth/session', async (req, res) => {
  try {
    const body = req.body || {};
    const sessionToken = String(body.session_token || body.sessionToken || randomId(24));
    const session = await createOrRefreshAuthSession({
      sessionToken,
      aiClient: body.ai_client || body.aiClient || 'mcp',
      scopes: Array.isArray(body.scopes) && body.scopes.length ? body.scopes : undefined,
      origin: body.origin || null,
      connectorRequestId: body.connector_request_id || body.connectorRequestId || null,
      redirectUri: body.redirect_uri || body.redirectUri || null,
      state: body.state || null,
    });

    res.json({
      ok: true,
      session_id: session.id,
      connect_url: connectUrlForSession(session.id),
      expires_at: session.expires_at,
      session_token: body.include_session_token ? sessionToken : undefined,
    });
  } catch (error) {
    serverError(res, error);
  }
});

app.get('/auth/session/:id', async (req, res) => {
  try {
    const session = await findSessionById(req.params.id);
    if (!session) return res.status(404).json({ ok: false, message: 'session not found' });
    if (isExpired(session) && session.status !== 'expired') {
      await updateAuthDb((db) => {
        const target = db.sessions.find((item) => item.id === session.id);
        if (target) target.status = 'expired';
      });
      session.status = 'expired';
    }
    const walletStatus = session.wallet_address ? await getWalletStatus(session.wallet_address) : null;
    res.json({ ok: true, session: sanitizeSession(session), wallet_status: walletStatus, delegateAddress, chainId: chain.id });
  } catch (error) {
    serverError(res, error);
  }
});

app.get('/auth/nonce', async (req, res) => {
  try {
    const sessionId = String(req.query.session || '');
    const walletAddress = String(req.query.wallet || '');
    if (!sessionId) return badRequest(res, 'session is required');
    if (!walletAddress || !isAddress(walletAddress)) return badRequest(res, 'valid wallet is required');

    const session = await updateAuthDb((db) => {
      const target = db.sessions.find((item) => item.id === sessionId);
      if (!target) return null;
      if (isExpired(target)) {
        target.status = 'expired';
        return target;
      }
      const nonce = crypto.randomBytes(16).toString('hex');
      target.nonce = nonce;
      target.nonce_issued_at = nowIso();
      target.wallet_address = getAddress(walletAddress);
      target.status = 'wallet_connected';
      target.updated_at = nowIso();
      target.last_seen_at = nowIso();
      return target;
    });

    if (!session) return res.status(404).json({ ok: false, message: 'session not found' });
    if (session.status === 'expired') return res.status(410).json({ ok: false, message: 'session expired' });

    const message = buildSiweMessage({ walletAddress: getAddress(walletAddress), sessionId, nonce: session.nonce });
    res.json({ ok: true, nonce: session.nonce, message, session_id: sessionId, expires_at: session.expires_at, chain_id: chain.id, domain: siweDomain });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/auth/verify', async (req, res) => {
  try {
    const { session_id: sessionId, wallet_address: walletAddress, signature, message } = req.body || {};
    if (!sessionId) return badRequest(res, 'session_id is required');
    if (!walletAddress || !isAddress(walletAddress)) return badRequest(res, 'valid wallet_address is required');
    if (!signature || !message) return badRequest(res, 'signature and message are required');

    const session = await findSessionById(sessionId);
    if (!session) return res.status(404).json({ ok: false, message: 'session not found' });
    if (isExpired(session)) return res.status(410).json({ ok: false, message: 'session expired' });

    const parsed = parseSiweLikeMessage(message);
    if (!allowedVerifyDomains.has(parsed.domain)) return badRequest(res, 'invalid message domain');
    if (!allowedChainIds.has(parsed.chainId)) return badRequest(res, 'chain id is not allowed');
    if (parsed.sessionId !== sessionId) return badRequest(res, 'message session id does not match');
    if (parsed.nonce !== session.nonce) return badRequest(res, 'nonce does not match');
    if (getAddress(parsed.address) !== getAddress(walletAddress)) return badRequest(res, 'message wallet does not match request wallet');

    const valid = await verifyMessage({ address: getAddress(walletAddress), message, signature });
    if (!valid) return badRequest(res, 'signature verification failed');

    const nextWalletStatus = await getWalletStatus(walletAddress);
    const nextStatus = nextWalletStatus.delegated ? 'delegated' : 'signed';

    await updateAuthDb((db) => {
      const target = db.sessions.find((item) => item.id === sessionId);
      if (!target) return null;
      target.wallet_address = getAddress(walletAddress);
      target.status = nextStatus;
      target.linked_at = target.linked_at || nowIso();
      target.updated_at = nowIso();
      target.last_seen_at = nowIso();
      target.last_verified_message = message;
      target.last_signature = signature;
      return target;
    });

    res.json({
      ok: true,
      session_id: sessionId,
      wallet_address: getAddress(walletAddress),
      status: nextStatus,
      delegated: nextWalletStatus.delegated,
      connect_url: connectUrlForSession(sessionId),
      delegateAddress,
      wallet_status: nextWalletStatus,
    });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/auth/disconnect', async (req, res) => {
  try {
    const sessionId = req.body?.session_id || req.body?.sessionId;
    if (!sessionId) return badRequest(res, 'session_id is required');
    const session = await updateAuthDb((db) => {
      const target = db.sessions.find((item) => item.id === sessionId);
      if (!target) return null;
      target.wallet_address = null;
      target.status = 'revoked';
      target.updated_at = nowIso();
      target.last_seen_at = nowIso();
      return target;
    });
    if (!session) return res.status(404).json({ ok: false, message: 'session not found' });
    res.json({ ok: true, session: sanitizeSession(session) });
  } catch (error) {
    serverError(res, error);
  }
});

app.use(authMiddleware);

app.get('/token-info', async (_req, res) => {
  try {
    res.json({ ok: true, ...(await getTokenInfo()) });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/session/wallet-status', async (req, res) => {
  try {
    const ctx = await getSessionContextFromToken(String(req.body?.session_token || req.headers['x-session-token'] || ''));
    if (!ctx.ok) return res.status(ctx.code === 'SESSION_EXPIRED' ? 410 : 428).json(ctx);
    res.json({ ok: true, session: sanitizeSession(ctx.session), ...(await getWalletStatus(ctx.session.wallet_address)) });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/session/authorization-status', async (req, res) => {
  try {
    const ctx = await getSessionContextFromToken(String(req.body?.session_token || req.headers['x-session-token'] || ''));
    if (!ctx.ok) return res.status(ctx.code === 'SESSION_EXPIRED' ? 410 : 428).json(ctx);
    const payload = await getAuthorizationStatus(ctx.session.wallet_address);
    if (payload.delegated && ctx.session.status !== 'delegated') {
      await updateAuthDb((db) => {
        const target = db.sessions.find((item) => item.id === ctx.session.id);
        if (target) target.status = 'delegated';
      });
    }
    res.json({ ok: true, session: sanitizeSession(ctx.session), ...payload });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/session/mint-quota', async (req, res) => {
  try {
    const ctx = await getSessionContextFromToken(String(req.body?.session_token || req.headers['x-session-token'] || ''));
    if (!ctx.ok) return res.status(ctx.code === 'SESSION_EXPIRED' ? 410 : 428).json(ctx);
    const status = await getWalletStatus(ctx.session.wallet_address);
    res.json({ ok: true, session: sanitizeSession(ctx.session), wallet: status.wallet, quotaRemaining: status.quotaRemaining, delegated: status.delegated });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/session/token-balance', async (req, res) => {
  try {
    const ctx = await getSessionContextFromToken(String(req.body?.session_token || req.headers['x-session-token'] || ''));
    if (!ctx.ok) return res.status(ctx.code === 'SESSION_EXPIRED' ? 410 : 428).json(ctx);
    const status = await getWalletStatus(ctx.session.wallet_address);
    res.json({ ok: true, session: sanitizeSession(ctx.session), wallet: status.wallet, tokenBalance: status.tokenBalance, mintsOf: status.mintsOf });
  } catch (error) {
    serverError(res, error);
  }
});

app.post('/session/mint', async (req, res) => {
  try {
    const ctx = await getSessionContextFromToken(String(req.body?.session_token || req.headers['x-session-token'] || ''));
    if (!ctx.ok) return res.status(ctx.code === 'SESSION_EXPIRED' ? 410 : 428).json(ctx);
    const requestedWallet = req.body?.wallet;
    if (requestedWallet && isAddress(requestedWallet) && getAddress(requestedWallet) !== getAddress(ctx.session.wallet_address)) {
      return res.status(400).json({ ok: false, message: 'mint receiver must match the wallet linked to this CATSHIT session' });
    }
    const auth = await getAuthorizationStatus(ctx.session.wallet_address);
    if (!auth.delegated) return res.status(400).json({ ok: false, message: 'linked wallet is not delegated to the configured MintDelegate' });
    const payload = await mintForWallet(ctx.session.wallet_address, req.body?.slots ?? 1);
    res.json({ ...payload, session: sanitizeSession(ctx.session) });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ ok: false, message: error.message });
    serverError(res, error);
  }
});

app.get('/wallet-status/:wallet', async (req, res) => {
  try {
    if (!isAddress(req.params.wallet)) return badRequest(res, 'invalid wallet address');
    res.json({ ok: true, ...(await getWalletStatus(req.params.wallet)) });
  } catch (error) {
    serverError(res, error);
  }
});

app.get('/authorization-status/:wallet', async (req, res) => {
  try {
    if (!isAddress(req.params.wallet)) return badRequest(res, 'invalid wallet address');
    res.json({ ok: true, ...(await getAuthorizationStatus(req.params.wallet)) });
  } catch (error) {
    serverError(res, error);
  }
});

app.get('/mint-quota/:wallet', async (req, res) => {
  try {
    if (!isAddress(req.params.wallet)) return badRequest(res, 'invalid wallet address');
    const status = await getWalletStatus(req.params.wallet);
    res.json({ ok: true, wallet: status.wallet, quotaRemaining: status.quotaRemaining, delegated: status.delegated });
  } catch (error) {
    serverError(res, error);
  }
});

app.get('/token-balance/:wallet', async (req, res) => {
  try {
    if (!isAddress(req.params.wallet)) return badRequest(res, 'invalid wallet address');
    const status = await getWalletStatus(req.params.wallet);
    res.json({ ok: true, wallet: status.wallet, tokenBalance: status.tokenBalance, mintsOf: status.mintsOf });
  } catch (error) {
    serverError(res, error);
  }
});

app.get('/tx-status/:hash', async (req, res) => {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: req.params.hash });
    res.json({
      ok: true,
      txHash: req.params.hash,
      status: receipt.status,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      to: receipt.to,
      from: receipt.from,
    });
  } catch (error) {
    serverError(res, error, { txHash: req.params.hash });
  }
});

app.post('/mint', async (req, res) => {
  try {
    const { wallet, slots = 1 } = req.body ?? {};
    if (!wallet || !isAddress(wallet)) return badRequest(res, 'invalid wallet address');
    res.json(await mintForWallet(wallet, slots));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ ok: false, message: error.message });
    serverError(res, error);
  }
});

app.post('/test/delegate', async (req, res) => {
  try {
    const { wallet } = req.body ?? {};
    if (wallet && !isAddress(wallet)) return badRequest(res, 'invalid wallet address');
    res.json(await activateTestDelegation(wallet));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ ok: false, message: error.message });
    serverError(res, error);
  }
});

app.get('/revoke-info/:wallet', async (req, res) => {
  try {
    if (!isAddress(req.params.wallet)) return badRequest(res, 'invalid wallet address');
    const delegated = await publicClient.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: 'isDelegatedToMintDelegate',
      args: [getAddress(req.params.wallet)],
    });
    res.json({
      ok: true,
      wallet: getAddress(req.params.wallet),
      delegated,
      activeDelegate: delegated ? delegateAddress : null,
      revokeHint: 'Send an EIP-7702 authorization that clears or replaces the current delegate from the user wallet.',
    });
  } catch (error) {
    serverError(res, error);
  }
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`eta-ai-mint-backend listening on :${port}`);
});
