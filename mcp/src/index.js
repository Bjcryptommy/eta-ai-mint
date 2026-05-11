import 'dotenv/config';
import express from 'express';
import { randomUUID, createHash, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import * as z from 'zod/v4';

const app = express();
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false }));

const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const backendAuthToken = process.env.BACKEND_AUTH_TOKEN || '';
const mcpAuthToken = process.env.MCP_AUTH_TOKEN || '';
const requireMcpAuth = process.env.REQUIRE_MCP_AUTH !== 'false';
const mcpDevOpen = process.env.MCP_DEV_OPEN === 'true';
const frontendPublicUrl = (process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
const mcpPublicUrl = (process.env.MCP_PUBLIC_URL || process.env.NEXT_PUBLIC_MCP_PUBLIC_URL || 'http://localhost:3002').replace(/\/$/, '');
const oauthAuthorizePath = '/oauth/authorize';
const oauthApprovePath = '/oauth/approve';
const oauthTokenPath = '/oauth/token';
const oauthMetadataPath = '/.well-known/oauth-authorization-server';
const protectedResourcePath = '/.well-known/oauth-protected-resource';
const oauthAllowedRedirects = new Set(String(process.env.OAUTH_ALLOWED_REDIRECT_URIS || 'https://claude.ai/api/mcp/auth_callback').split(',').map((v) => v.trim()).filter(Boolean));
const oauthCodeTtlMs = Number(process.env.OAUTH_CODE_TTL_MS || 1000 * 60 * 10);
const oauthAccessTokenTtlMs = Number(process.env.OAUTH_ACCESS_TOKEN_TTL_MS || 1000 * 60 * 60);
const oauthDbPath = process.env.MCP_OAUTH_DB_PATH || path.resolve(process.cwd(), 'data/oauth-store.json');
const transports = {};
const transportServers = {};
const transportSessionBindings = {};

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function base64urlSha256(value) {
  return createHash('sha256').update(String(value)).digest('base64url');
}

function randomSecret(size = 24) {
  return randomBytes(size).toString('base64url');
}

function authHeaders(extra = {}) {
  return backendAuthToken ? { authorization: `Bearer ${backendAuthToken}`, ...extra } : extra;
}

function logRequest(req, extra = {}) {
  console.log(JSON.stringify({
    at: nowIso(),
    method: req.method,
    path: req.path,
    query: req.query,
    hasAuthorizationHeader: Boolean(req.headers.authorization),
    sessionIdFound: Boolean(req.headers['mcp-session-id']),
    mcpInitializeRequest: (req.path === '/mcp' || req.path === '/') && req.method === 'POST' && req.body?.method === 'initialize',
    ...extra,
  }));
}

app.use((req, _res, next) => {
  logRequest(req);
  next();
});

async function backend(pathname, options = {}) {
  const response = await fetch(`${backendUrl}${pathname}`, {
    headers: { 'content-type': 'application/json', ...authHeaders(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: response.status, data };
}

async function backendStrict(pathname, options = {}) {
  const upstream = await backend(pathname, options);
  if (upstream.status >= 400) {
    const error = new Error(upstream.data?.message || upstream.data?.error?.message || `backend request failed (${upstream.status})`);
    error.upstream = upstream;
    throw error;
  }
  return upstream.data;
}

async function ensureOauthDb() {
  await fs.mkdir(path.dirname(oauthDbPath), { recursive: true });
  try {
    await fs.access(oauthDbPath);
  } catch {
    await fs.writeFile(oauthDbPath, JSON.stringify({ grants: [], tokens: [] }, null, 2));
  }
}

async function readOauthDb() {
  await ensureOauthDb();
  try {
    const raw = await fs.readFile(oauthDbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      grants: Array.isArray(parsed.grants) ? parsed.grants : [],
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
    };
  } catch {
    return { grants: [], tokens: [] };
  }
}

let oauthWriteChain = Promise.resolve();
function updateOauthDb(mutator) {
  oauthWriteChain = oauthWriteChain.then(async () => {
    const db = await readOauthDb();
    pruneOauthDb(db);
    const result = await mutator(db);
    await fs.writeFile(oauthDbPath, JSON.stringify(db, null, 2));
    return result;
  });
  return oauthWriteChain;
}

function pruneOauthDb(db) {
  const now = Date.now();
  db.grants = db.grants.filter((grant) => new Date(grant.expires_at).getTime() > now && !grant.consumed_at);
  db.tokens = db.tokens.filter((token) => new Date(token.expires_at).getTime() > now && !token.revoked_at);
}

async function createGrant({ clientId, redirectUri, state, scope, backendSessionToken, backendSessionId, codeChallenge = null, codeChallengeMethod = null }) {
  const grant = {
    id: randomUUID(),
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state || null,
    scope: scope || 'openid profile',
    backend_session_token: backendSessionToken,
    backend_session_token_hash: sha256(backendSessionToken),
    backend_session_id: backendSessionId,
    code: null,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    approved_at: null,
    consumed_at: null,
    created_at: nowIso(),
    expires_at: new Date(Date.now() + oauthCodeTtlMs).toISOString(),
  };
  return updateOauthDb((db) => {
    db.grants.push(grant);
    return grant;
  });
}

async function updateGrant(grantId, patch) {
  return updateOauthDb((db) => {
    const grant = db.grants.find((item) => item.id === grantId);
    if (!grant) return null;
    Object.assign(grant, patch);
    return grant;
  });
}

async function findGrantByCode(code) {
  const db = await readOauthDb();
  pruneOauthDb(db);
  return db.grants.find((grant) => grant.code === code) || null;
}

async function createAccessToken({ clientId, backendSessionToken, backendSessionId, scope }) {
  const accessToken = `catshit_${randomSecret(32)}`;
  const token = {
    id: randomUUID(),
    client_id: clientId,
    access_token_hash: sha256(accessToken),
    backend_session_token: backendSessionToken,
    backend_session_token_hash: sha256(backendSessionToken),
    backend_session_id: backendSessionId,
    scope: scope || 'openid profile',
    created_at: nowIso(),
    expires_at: new Date(Date.now() + oauthAccessTokenTtlMs).toISOString(),
    revoked_at: null,
  };
  await updateOauthDb((db) => {
    db.tokens.push(token);
    return token;
  });
  return { raw: accessToken, record: token };
}

async function findAccessToken(accessToken) {
  const db = await readOauthDb();
  pruneOauthDb(db);
  return db.tokens.find((token) => token.access_token_hash === sha256(accessToken)) || null;
}

async function getOauthSessionSnapshot(accessToken) {
  const oauthToken = await findAccessToken(accessToken);
  if (!oauthToken) return null;
  const backendSession = await backend(`/auth/session/${oauthToken.backend_session_id}`);
  return {
    oauthToken,
    backendSession: backendSession.status >= 400 ? null : backendSession.data?.session || null,
    walletStatus: backendSession.status >= 400 ? null : backendSession.data?.wallet_status || null,
    chainId: backendSession.status >= 400 ? null : backendSession.data?.chainId || null,
  };
}

function textContent(text) {
  return [{ type: 'text', text }];
}

function sessionPromptText(payload) {
  return `${payload.message}\n${payload.connect_url}`;
}

async function ensureBackendAuthSession(sessionToken, meta = {}) {
  return backendStrict('/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      session_token: sessionToken,
      ai_client: meta.aiClient || 'mcp',
      origin: meta.origin || null,
      connector_request_id: meta.connectorRequestId || null,
      redirect_uri: meta.redirectUri || null,
      state: meta.state || null,
    }),
  });
}

async function backendSessionTool(pathname, sessionToken, body = {}) {
  await ensureBackendAuthSession(sessionToken);
  return backend(pathname, {
    method: 'POST',
    body: JSON.stringify({ ...body, session_token: sessionToken }),
  });
}

function wrapLinkedSessionResponse(upstream) {
  if (upstream.status === 428 || upstream.status === 410) {
    return {
      content: textContent(sessionPromptText(upstream.data)),
      structuredContent: upstream.data,
    };
  }
  if (upstream.status >= 400) {
    throw new Error(upstream.data?.message || `request failed (${upstream.status})`);
  }
  return upstream.data;
}

function walletAuthNeededResponse(snapshot) {
  const authUrl = snapshot?.backendSession?.connect_url || `${frontendPublicUrl}/oauth/authorize?session=${encodeURIComponent(snapshot?.backendSession?.id || '')}`;
  return {
    ok: false,
    needsWalletAuth: true,
    message: 'Your CATSHIT connector is connected, but your wallet is not linked yet.',
    authUrl,
    sessionId: snapshot?.backendSession?.id || null,
  };
}

async function runSessionTool(toolName, bearerToken, run) {
  const snapshot = bearerToken ? await getOauthSessionSnapshot(bearerToken) : null;
  const hasBearerToken = Boolean(bearerToken);
  const accessTokenFound = Boolean(snapshot?.oauthToken);
  const oauthSessionFound = Boolean(snapshot?.backendSession);
  const walletLinked = Boolean(snapshot?.backendSession?.wallet_address);
  const sessionToken = snapshot?.oauthToken?.backend_session_token;
  console.log(JSON.stringify({ at: nowIso(), event: 'mcp-tool-call', toolName, hasBearerToken, accessTokenFound, oauthSessionFound, walletLinked, sessionIdUsed: snapshot?.backendSession?.id || null, walletAddress: snapshot?.backendSession?.wallet_address || null }));

  if (!sessionToken) {
    const payload = walletAuthNeededResponse(snapshot);
    console.log(JSON.stringify({ at: nowIso(), event: 'mcp-tool-result', toolName, needsWalletAuth: true, sessionIdUsed: snapshot?.backendSession?.id || null }));
    return { content: textContent(`${payload.message}\n${payload.authUrl}`), structuredContent: payload };
  }

  if (!walletLinked) {
    const payload = walletAuthNeededResponse(snapshot);
    console.log(JSON.stringify({ at: nowIso(), event: 'mcp-tool-result', toolName, needsWalletAuth: true, sessionIdUsed: snapshot?.backendSession?.id || null }));
    return { content: textContent(`${payload.message}\n${payload.authUrl}`), structuredContent: payload };
  }

  const result = await run({ sessionToken, snapshot });
  console.log(JSON.stringify({ at: nowIso(), event: 'mcp-tool-result', toolName, needsWalletAuth: false, sessionIdUsed: snapshot?.backendSession?.id || null, walletAddress: snapshot?.backendSession?.wallet_address || null }));
  return result;
}

function isInitializeRequest(body) {
  return body?.method === 'initialize';
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

async function resolveMcpAccess(req) {
  const bearer = getBearerToken(req);
  const sessionId = req.headers['mcp-session-id'];

  if (bearer) {
    if (mcpAuthToken && bearer === mcpAuthToken) {
      return { ok: true, mode: 'static-token', sessionToken: sessionId || `legacy-${randomUUID()}` };
    }
    const oauthToken = await findAccessToken(bearer);
    if (oauthToken) {
      return {
        ok: true,
        mode: 'oauth-token',
        sessionToken: oauthToken.backend_session_token,
        backendSessionId: oauthToken.backend_session_id,
        oauthToken,
      };
    }
  }

  if (!requireMcpAuth || mcpDevOpen) {
    return { ok: true, mode: mcpDevOpen ? 'dev-open' : 'auth-disabled', sessionToken: sessionId || `dev-${randomUUID()}` };
  }

  return { ok: false, status: 401, message: 'missing bearer token' };
}

function getMcpServer({ getSessionToken, getBearerTokenForTool }) {
  const server = new McpServer({ name: 'eta-ai-mint-mcp', version: '0.2.0' });

  server.registerTool('token_info', {
    description: 'Get token name, symbol, mint price, mint amount, contract addresses, and current mint progress.',
    inputSchema: {},
  }, async () => {
    const payload = await backendStrict('/token-info');
    return { content: textContent(`${payload.name} (${payload.symbol}) mint price is ${payload.mintPriceEth} ETH and ${payload.remaining} public mints remain.`), structuredContent: payload };
  });

  server.registerTool('wallet_status', { description: 'Get the linked wallet status for this CATSHIT connector session. If no wallet is linked yet, return the connect link. Includes the most recent mint transaction when available.', inputSchema: {} }, async () => runSessionTool('wallet_status', getBearerTokenForTool(), async ({ sessionToken, snapshot }) => {
    const upstream = await backendSessionTool('/session/wallet-status', sessionToken);
    const payload = wrapLinkedSessionResponse(upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    const enriched = {
      ...payload,
      signed: ['signed', 'delegated'].includes(snapshot?.backendSession?.status || ''),
      canMint: Boolean(payload.delegated && BigInt(payload.quotaRemaining || '0') > 0n),
      network: snapshot?.chainId === 11155111 ? 'Sepolia' : `Chain ${snapshot?.chainId ?? 'unknown'}`,
      chainId: snapshot?.chainId,
      lastMintTxHash: payload.lastMintTxHash || snapshot?.backendSession?.lastMintTxHash || null,
      lastMintAt: payload.lastMintAt || snapshot?.backendSession?.lastMintAt || null,
      lastMintAmount: payload.lastMintAmount || snapshot?.backendSession?.lastMintAmount || null,
    };
    return { content: textContent(`Wallet ${enriched.wallet}: ${enriched.network}, signed=${enriched.signed}, delegated=${enriched.delegated}, quota=${enriched.quotaRemaining}, balance=${enriched.displayBalance || enriched.formattedBalance || enriched.tokenBalance}.`), structuredContent: enriched };
  }));

  server.registerTool('authorization_status', { description: 'Check whether the wallet linked to this CATSHIT session is delegated to the configured MintDelegate.', inputSchema: {} }, async () => runSessionTool('authorization_status', getBearerTokenForTool(), async ({ sessionToken }) => {
    const upstream = await backendSessionTool('/session/authorization-status', sessionToken);
    const payload = wrapLinkedSessionResponse(upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    return { content: textContent(payload.delegated ? `${payload.wallet} is delegated to ${payload.delegateAddress}.` : `${payload.wallet} is not delegated to the configured MintDelegate.`), structuredContent: payload };
  }));

  server.registerTool('mint_quota_get', { description: 'Get the remaining mint quota for the wallet linked to this CATSHIT session.', inputSchema: {} }, async () => runSessionTool('mint_quota_get', getBearerTokenForTool(), async ({ sessionToken }) => {
    const upstream = await backendSessionTool('/session/mint-quota', sessionToken);
    const payload = wrapLinkedSessionResponse(upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    return { content: textContent(`${payload.wallet} has ${payload.quotaRemaining} mint slots remaining.`), structuredContent: payload };
  }));

  server.registerTool('token_balance', { description: 'Get the token balance and mint count for the wallet linked to this CATSHIT session.', inputSchema: {} }, async () => runSessionTool('token_balance', getBearerTokenForTool(), async ({ sessionToken }) => {
    const upstream = await backendSessionTool('/session/token-balance', sessionToken);
    const payload = wrapLinkedSessionResponse(upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    return { content: textContent(`${payload.wallet} holds ${payload.displayBalance || payload.formattedBalance || payload.tokenBalance} and has minted ${payload.mintsOf} slot(s).`), structuredContent: payload };
  }));

  server.registerTool('token_mint', { description: 'Mint one or more slots for the wallet linked to this CATSHIT session. Validates both max per request and remaining quota before minting. The receiver is always the linked wallet, never a prompt-supplied address.', inputSchema: { slots: z.number().int().min(1).optional().describe('Number of slots to mint.'), wallet: z.string().optional().describe('Ignored unless it matches the linked wallet exactly.') } }, async ({ wallet, slots }) => runSessionTool('token_mint', getBearerTokenForTool(), async ({ sessionToken }) => {
    const upstream = await backendSessionTool('/session/mint', sessionToken, { wallet, slots: slots ?? 1 });
    const payload = wrapLinkedSessionResponse(upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    if (!payload.ok) {
      return { content: textContent(payload.message), structuredContent: payload };
    }
    return { content: textContent(`Mint successful for ${payload.wallet}. tx=${payload.txHash}. remaining quota=${payload.quotaRemaining}.`), structuredContent: payload };
  }));

  server.registerTool('tx_status', { description: 'Get transaction status, block number, gas used, and explorer link by transaction hash. If txHash is omitted, the most recent mint transaction for this session is used.', inputSchema: { hash: z.string().optional().describe('Transaction hash. Optional; falls back to the most recent mint tx for this session.') } }, async ({ hash }) => runSessionTool('tx_status', getBearerTokenForTool(), async ({ snapshot }) => {
    const txHash = hash || snapshot?.backendSession?.lastMintTxHash;
    if (!txHash) {
      const payload = { ok: false, message: "I don't have a recent mint transaction for this session. Please provide a transaction hash." };
      return { content: textContent(payload.message), structuredContent: payload };
    }
    const payload = await backendStrict(`/tx-status/${txHash}`);
    return { content: textContent(`Transaction ${payload.txHash} is ${payload.status} in block ${payload.blockNumber}. Explorer: ${payload.explorerUrl}`), structuredContent: payload };
  }));

  server.registerTool('revoke_info', { description: 'Explain whether the wallet linked to this CATSHIT session is delegated and how revocation should work.', inputSchema: {} }, async () => runSessionTool('revoke_info', getBearerTokenForTool(), async ({ sessionToken }) => {
    const upstream = await backendSessionTool('/session/authorization-status', sessionToken);
    const payload = wrapLinkedSessionResponse(upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    return { content: textContent(payload.delegated ? `${payload.wallet} is currently delegated to ${payload.delegateAddress}. Revoke by sending a new EIP-7702 authorization that clears or replaces the current delegate.` : `${payload.wallet} is not currently delegated to the configured MintDelegate.`), structuredContent: payload };
  }));

  return server;
}

async function ensureTransport(sessionToken, meta = {}) {
  const existingSessionId = Object.keys(transportSessionBindings).find((key) => transportSessionBindings[key]?.backendSessionToken === sessionToken);
  if (existingSessionId && transports[existingSessionId]) return transports[existingSessionId];

  let transport;
  transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: async (newSessionId) => {
      transports[newSessionId] = transport;
      transportSessionBindings[newSessionId] = { backendSessionToken: sessionToken, meta };
      await ensureBackendAuthSession(sessionToken, meta);
    },
  });

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid && transports[sid]) delete transports[sid];
    if (sid && transportServers[sid]) delete transportServers[sid];
    if (sid && transportSessionBindings[sid]) delete transportSessionBindings[sid];
  };

  const server = getMcpServer({ getSessionToken: () => {
    const sid = transport.sessionId;
    return sid && transportSessionBindings[sid] ? transportSessionBindings[sid].backendSessionToken : sessionToken;
  }, getBearerTokenForTool: () => transport.authToken || null });
  await server.connect(transport);
  return transport;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'eta-ai-mint-mcp' });
});

function sendOAuthChallenge(res, { scope, error } = {}) {
  const parts = [
    'Bearer realm="eta-ai-mint-mcp"',
    `resource_metadata="${mcpPublicUrl}${protectedResourcePath}"`,
  ];
  if (scope) parts.push(`scope="${scope}"`);
  if (error) parts.push(`error="${error}"`);
  res.setHeader('WWW-Authenticate', parts.join(', '));
  return res.status(401).json({ ok: false, error: error || 'unauthorized' });
}

function oauthMetadataPayload() {
  return {
    issuer: mcpPublicUrl,
    authorization_endpoint: `${mcpPublicUrl}${oauthAuthorizePath}`,
    token_endpoint: `${mcpPublicUrl}${oauthTokenPath}`,
    registration_endpoint: `${mcpPublicUrl}${oauthTokenPath}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    code_challenge_methods_supported: ['S256', 'plain'],
  };
}

function protectedResourcePayload(resource = `${mcpPublicUrl}/mcp`) {
  return {
    resource,
    authorization_servers: [mcpPublicUrl],
    bearer_methods_supported: ['header'],
    scopes_supported: ['openid', 'profile', 'wallet_status', 'token_balance', 'mint_quota', 'token_mint'],
    resource_aliases: [mcpPublicUrl, `${mcpPublicUrl}/mcp`],
  };
}

app.get(oauthMetadataPath, (req, res) => {
  logRequest(req, { discoveryRequest: true, event: 'authorization-metadata-served' });
  res.json(oauthMetadataPayload());
});

app.get('/mcp/.well-known/oauth-authorization-server', (req, res) => {
  logRequest(req, { discoveryRequest: true, underMcpPath: true, event: 'authorization-metadata-served' });
  res.json(oauthMetadataPayload());
});

app.get(protectedResourcePath, (req, res) => {
  logRequest(req, { discoveryRequest: true, protectedResourceDiscovery: true, event: 'protected-resource-metadata-served' });
  res.json(protectedResourcePayload(mcpPublicUrl));
});

app.get('/mcp/.well-known/oauth-protected-resource', (req, res) => {
  logRequest(req, { discoveryRequest: true, protectedResourceDiscovery: true, underMcpPath: true, event: 'protected-resource-metadata-served' });
  res.json(protectedResourcePayload(`${mcpPublicUrl}/mcp`));
});

app.get(oauthAuthorizePath, async (req, res) => {
  try {
    logRequest(req, { authorizeRequest: true });
    const clientId = String(req.query.client_id || 'claude');
    const redirectUri = String(req.query.redirect_uri || '');
    const state = String(req.query.state || '');
    const scope = String(req.query.scope || 'openid profile wallet_status token_balance mint_quota token_mint');
    const codeChallenge = req.query.code_challenge ? String(req.query.code_challenge) : null;
    const codeChallengeMethod = req.query.code_challenge_method ? String(req.query.code_challenge_method) : null;
    if (!redirectUri || !oauthAllowedRedirects.has(redirectUri)) {
      return res.status(400).send('Invalid redirect_uri');
    }

    const backendSessionToken = randomUUID();
    const backendSession = await ensureBackendAuthSession(backendSessionToken, {
      aiClient: 'claude',
      origin: 'oauth-authorize',
      redirectUri,
      state,
      connectorRequestId: clientId,
    });

    if (codeChallengeMethod && !['S256', 'plain'].includes(codeChallengeMethod)) {
      return res.status(400).send('Unsupported code_challenge_method');
    }
    if (codeChallengeMethod && !codeChallenge) {
      return res.status(400).send('Missing code_challenge');
    }

    logRequest(req, { authorizeRequest: true, pkceMethod: codeChallengeMethod || null });
    const grant = await createGrant({ clientId, redirectUri, state, scope, backendSessionToken, backendSessionId: backendSession.session_id, codeChallenge, codeChallengeMethod });
    const authorizeUrl = new URL(`${frontendPublicUrl}/oauth/authorize`);
    authorizeUrl.searchParams.set('session', backendSession.session_id);
    authorizeUrl.searchParams.set('grant', grant.id);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('mcp_origin', mcpPublicUrl);
    return res.redirect(authorizeUrl.toString());
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return res.status(500).send('Authorization setup failed');
  }
});

app.get(oauthApprovePath, async (req, res) => {
  try {
    const grantId = String(req.query.grant || '');
    const sessionId = String(req.query.session || '');
    if (!grantId || !sessionId) return res.status(400).send('Missing grant or session');
    const db = await readOauthDb();
    const grant = db.grants.find((item) => item.id === grantId);
    if (!grant) return res.status(404).send('Grant not found or expired');
    if (grant.backend_session_id !== sessionId) return res.status(400).send('Grant/session mismatch');

    const code = `code_${randomSecret(18)}`;
    await updateGrant(grantId, { code, approved_at: nowIso() });
    const redirectUrl = new URL(grant.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (grant.state) redirectUrl.searchParams.set('state', grant.state);
    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth approve error:', error);
    return res.status(500).send('Approval failed');
  }
});

app.post(oauthTokenPath, async (req, res) => {
  try {
    const grantType = String(req.body.grant_type || '');
    const code = String(req.body.code || '');
    const redirectUri = String(req.body.redirect_uri || '');
    const codeVerifier = req.body.code_verifier ? String(req.body.code_verifier) : null;
    logRequest(req, { tokenRequestReceived: true, pkceMethod: req.body.code_challenge_method || null });
    if (grantType !== 'authorization_code') return res.status(400).json({ error: 'unsupported_grant_type' });
    if (!code) return res.status(400).json({ error: 'invalid_request', error_description: 'Missing code' });

    const grant = await findGrantByCode(code);
    if (!grant) return res.status(400).json({ error: 'invalid_grant' });
    if (grant.redirect_uri !== redirectUri) return res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
    if (grant.consumed_at) return res.status(400).json({ error: 'invalid_grant', error_description: 'code already used' });
    if (grant.code_challenge_method) {
      if (!codeVerifier) {
        console.log(JSON.stringify({ at: nowIso(), event: 'token-issued', issued: false, reason: 'missing_code_verifier', pkceMethod: grant.code_challenge_method }));
        return res.status(400).json({ error: 'invalid_request', error_description: 'Missing code_verifier' });
      }
      const expected = grant.code_challenge_method === 'S256' ? base64urlSha256(codeVerifier) : codeVerifier;
      if (expected !== grant.code_challenge) {
        console.log(JSON.stringify({ at: nowIso(), event: 'token-issued', issued: false, reason: 'pkce_verification_failed', pkceMethod: grant.code_challenge_method }));
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
      }
    }

    const token = await createAccessToken({
      clientId: grant.client_id,
      backendSessionToken: grant.backend_session_token,
      backendSessionId: grant.backend_session_id,
      scope: grant.scope,
    });
    await updateGrant(grant.id, { consumed_at: nowIso() });

    console.log(JSON.stringify({ at: nowIso(), event: 'token-issued', issued: true, pkceMethod: grant.code_challenge_method || null }));
    return res.json({
      access_token: token.raw,
      token_type: 'Bearer',
      expires_in: Math.floor(oauthAccessTokenTtlMs / 1000),
      scope: grant.scope,
    });
  } catch (error) {
    console.error('OAuth token error:', error);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post(`${oauthTokenPath}/register`, (req, res) => {
  logRequest(req, { event: 'client-registration-request' });
  const clientId = String(req.body.client_id || 'claude');
  return res.json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code'],
    response_types: ['code'],
    redirect_uris: [...oauthAllowedRedirects],
  });
});

app.get('/tools', (_req, res) => {
  res.json({
    ok: true,
    warning: mcpDevOpen ? 'MCP_DEV_OPEN=true is enabled. This should not be used in production.' : undefined,
    tools: [
      { name: 'authorization_status', description: 'Check whether the linked wallet is actively delegated to the configured MintDelegate.', input: {} },
      { name: 'mint_quota_get', description: 'Get remaining wallet mint quota for the linked wallet.', input: {} },
      { name: 'token_info', description: 'Get token configuration and current mint progress.', input: {} },
      { name: 'token_balance', description: 'Get token balance and mint count for the linked wallet.', input: {} },
      { name: 'token_mint', description: 'Mint one or more slots for the linked wallet through the relayer.', input: { slots: 1 } },
      { name: 'tx_status', description: 'Check a transaction receipt/status by hash.', input: { hash: '0x-tx-hash' } },
      { name: 'revoke_info', description: 'Explain whether the linked wallet is delegated and how revoke works.', input: {} },
      { name: 'wallet_status', description: 'Get combined delegated status, balances, and quota for the linked wallet.', input: {} },
    ],
  });
});

async function handleMcpPost(req, res) {
  try {
    const access = await resolveMcpAccess(req);
    console.log(JSON.stringify({ at: nowIso(), event: 'mcp-request-auth', path: req.path, hasBearerToken: Boolean(getBearerToken(req)), authorized: access.ok, mode: access.mode || null }));
    if (!access.ok) {
      if ((req.body?.method === 'initialize' || !req.body) && requireMcpAuth) {
        return sendOAuthChallenge(res, { scope: 'openid profile wallet_status token_balance mint_quota token_mint' });
      }
      return res.status(access.status || 401).json({ jsonrpc: '2.0', error: { code: -32001, message: access.message }, id: req.body?.id ?? null });
    }

    const sessionId = req.headers['mcp-session-id'];
    const initialize = isInitializeRequest(req.body);
    const shouldAllowFresh = initialize || mcpDevOpen;
    const sessionToken = access.sessionToken;

    let transport = sessionId ? transports[sessionId] : transports[sessionToken];
    if (!transport) {
      if (sessionId && !shouldAllowFresh) {
        return res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session ID provided' }, id: req.body?.id ?? null });
      }
      if (!sessionId && !shouldAllowFresh) {
        return res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session ID provided' }, id: req.body?.id ?? null });
      }
      transport = await ensureTransport(sessionToken, { aiClient: access.mode === 'oauth-token' ? 'claude' : 'mcp', origin: access.mode || 'mcp' });
    }

    transport.authToken = getBearerToken(req);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: error?.message || 'Internal server error' }, id: req.body?.id ?? null });
    }
  }
}

async function handleMcpGet(req, res) {
  const access = await resolveMcpAccess(req);
  console.log(JSON.stringify({ at: nowIso(), event: 'mcp-sse-auth', path: req.path, hasBearerToken: Boolean(getBearerToken(req)), authorized: access.ok, mode: access.mode || null }));
  if (!access.ok) return sendOAuthChallenge(res, { scope: 'openid profile wallet_status token_balance mint_quota token_mint' });
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    if (mcpDevOpen) return res.status(200).send('MCP dev open ready; initialize with POST / or /mcp');
    return res.status(400).send('Invalid or missing session ID');
  }
  await transports[sessionId].handleRequest(req, res);
}

async function handleMcpDelete(req, res) {
  const access = await resolveMcpAccess(req);
  if (!access.ok) return res.status(access.status || 401).send(access.message || 'Unauthorized');
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) return res.status(400).send('Invalid or missing session ID');
  await transports[sessionId].handleRequest(req, res);
}

app.post('/mcp', handleMcpPost);
app.post('/', handleMcpPost);
app.get('/mcp', handleMcpGet);
app.get('/', handleMcpGet);
app.delete('/mcp', handleMcpDelete);
app.delete('/', handleMcpDelete);

const port = Number(process.env.PORT || 3002);
app.listen(port, () => {
  console.log(`eta-ai-mint-mcp listening on :${port} -> ${backendUrl} (remote MCP at /mcp)`);
  if (mcpDevOpen) console.warn('WARNING: MCP_DEV_OPEN=true is enabled. Do not use this in production.');
});
