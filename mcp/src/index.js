import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import * as z from 'zod/v4';

const app = express();
app.use(express.json({ limit: '32kb' }));

const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const backendAuthToken = process.env.BACKEND_AUTH_TOKEN || '';
const mcpAuthToken = process.env.MCP_AUTH_TOKEN || '';
const requireMcpAuth = process.env.REQUIRE_MCP_AUTH !== 'false';
const frontendPublicUrl = (process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
const transports = {};

function authHeaders(extra = {}) {
  return backendAuthToken ? { authorization: `Bearer ${backendAuthToken}`, ...extra } : extra;
}

async function backend(path, options = {}) {
  const response = await fetch(`${backendUrl}${path}`, {
    headers: { 'content-type': 'application/json', ...authHeaders(options.headers || {}) },
    ...options,
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function backendStrict(path, options = {}) {
  const upstream = await backend(path, options);
  if (upstream.status >= 400) {
    const error = new Error(upstream.data?.message || upstream.data?.error?.message || `backend request failed (${upstream.status})`);
    error.upstream = upstream;
    throw error;
  }
  return upstream.data;
}

function unauthorized(res, message = 'unauthorized') {
  return res.status(401).json({ ok: false, error: { code: 'unauthorized', message } });
}

function mcpAuthMiddleware(req, res, next) {
  if (!requireMcpAuth) return next();
  if (!mcpAuthToken) return unauthorized(res, 'mcp auth token not configured');

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return unauthorized(res, 'missing bearer token');
  const token = header.slice('Bearer '.length).trim();
  if (token !== mcpAuthToken) return unauthorized(res, 'invalid bearer token');
  next();
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

async function backendSessionTool(path, sessionToken, body = {}) {
  await ensureBackendAuthSession(sessionToken);
  return backend(path, {
    method: 'POST',
    body: JSON.stringify({ ...body, session_token: sessionToken }),
  });
}

function wrapLinkedSessionResponse(tool, upstream) {
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

function getMcpServer({ getSessionToken }) {
  const server = new McpServer({ name: 'eta-ai-mint-mcp', version: '0.1.0' });

  server.registerTool('token_info', {
    description: 'Get token name, symbol, mint price, mint amount, contract addresses, and current mint progress.',
    inputSchema: {},
  }, async () => {
    const payload = await backendStrict('/token-info');
    return {
      content: textContent(`${payload.name} (${payload.symbol}) mint price is ${payload.mintPriceEth} ETH and ${payload.remaining} public mints remain.`),
      structuredContent: payload,
    };
  });

  server.registerTool('wallet_status', {
    description: 'Get the linked wallet status for this CATSHIT connector session. If no wallet is linked yet, return the connect link.',
    inputSchema: {},
  }, async () => {
    const upstream = await backendSessionTool('/session/wallet-status', getSessionToken());
    const payload = wrapLinkedSessionResponse('wallet_status', upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    return {
      content: textContent(`Wallet ${payload.wallet}: delegated=${payload.delegated}, quota=${payload.quotaRemaining}, mints=${payload.mintsOf}, eth=${payload.ethBalanceEth}.`),
      structuredContent: payload,
    };
  });

  server.registerTool('authorization_status', {
    description: 'Check whether the wallet linked to this CATSHIT session is delegated to the configured MintDelegate.',
    inputSchema: {},
  }, async () => {
    const upstream = await backendSessionTool('/session/authorization-status', getSessionToken());
    const payload = wrapLinkedSessionResponse('authorization_status', upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    return {
      content: textContent(payload.delegated
        ? `${payload.wallet} is delegated to ${payload.delegateAddress}.`
        : `${payload.wallet} is not delegated to the configured MintDelegate.`),
      structuredContent: payload,
    };
  });

  server.registerTool('mint_quota_get', {
    description: 'Get the remaining mint quota for the wallet linked to this CATSHIT session.',
    inputSchema: {},
  }, async () => {
    const upstream = await backendSessionTool('/session/mint-quota', getSessionToken());
    const payload = wrapLinkedSessionResponse('mint_quota_get', upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    return {
      content: textContent(`${payload.wallet} has ${payload.quotaRemaining} mint slots remaining.`),
      structuredContent: payload,
    };
  });

  server.registerTool('token_balance', {
    description: 'Get the token balance and mint count for the wallet linked to this CATSHIT session.',
    inputSchema: {},
  }, async () => {
    const upstream = await backendSessionTool('/session/token-balance', getSessionToken());
    const payload = wrapLinkedSessionResponse('token_balance', upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    return {
      content: textContent(`${payload.wallet} holds ${payload.tokenBalance} token units and has minted ${payload.mintsOf} slot(s).`),
      structuredContent: payload,
    };
  });

  server.registerTool('token_mint', {
    description: 'Mint one or more slots for the wallet linked to this CATSHIT session. The receiver is always the linked wallet, never a prompt-supplied address.',
    inputSchema: {
      slots: z.number().int().min(1).optional().describe('Number of slots to mint.'),
      wallet: z.string().optional().describe('Ignored unless it matches the linked wallet exactly.'),
    },
  }, async ({ wallet, slots }) => {
    const upstream = await backendSessionTool('/session/mint', getSessionToken(), { wallet, slots: slots ?? 1 });
    const payload = wrapLinkedSessionResponse('token_mint', upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    return {
      content: textContent(`Mint successful for ${payload.wallet}. tx=${payload.txHash}. remaining quota=${payload.quotaRemaining}.`),
      structuredContent: payload,
    };
  });

  server.registerTool('tx_status', {
    description: 'Get transaction status, block number, and gas used by transaction hash.',
    inputSchema: { hash: z.string().describe('Transaction hash.') },
  }, async ({ hash }) => {
    const payload = await backendStrict(`/tx-status/${hash}`);
    return {
      content: textContent(`Transaction ${payload.txHash} is ${payload.status} in block ${payload.blockNumber}.`),
      structuredContent: payload,
    };
  });

  server.registerTool('revoke_info', {
    description: 'Explain whether the wallet linked to this CATSHIT session is delegated and how revocation should work.',
    inputSchema: {},
  }, async () => {
    const upstream = await backendSessionTool('/session/authorization-status', getSessionToken());
    const payload = wrapLinkedSessionResponse('revoke_info', upstream);
    if (upstream.status === 428 || upstream.status === 410) return payload;
    return {
      content: textContent(payload.delegated
        ? `${payload.wallet} is currently delegated to ${payload.delegateAddress}. Revoke by sending a new EIP-7702 authorization that clears or replaces the current delegate.`
        : `${payload.wallet} is not currently delegated to the configured MintDelegate.`),
      structuredContent: payload,
    };
  });

  return server;
}

function isInitializeRequest(body) {
  return body?.method === 'initialize';
}

app.get('/health', async (_req, res) => {
  try {
    const upstream = await backend('/health');
    res.json({ ok: true, service: 'eta-ai-mint-mcp', backend: upstream.data, authRequired: requireMcpAuth, remoteMcpPath: '/mcp', frontendPublicUrl });
  } catch (error) {
    res.status(500).json({ ok: false, error: { code: 'backend_unavailable', message: error.message || 'backend unavailable' } });
  }
});

app.use(mcpAuthMiddleware);

app.get('/tools', (_req, res) => {
  res.json({
    ok: true,
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

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  try {
    let transport = sessionId ? transports[sessionId] : null;

    if (!transport) {
      if (sessionId || !isInitializeRequest(req.body)) {
        res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session ID provided' }, id: null });
        return;
      }

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: async (newSessionId) => {
          transports[newSessionId] = transport;
          await ensureBackendAuthSession(newSessionId, { aiClient: 'mcp', origin: 'streamable-http' });
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) delete transports[sid];
      };

      const server = getMcpServer({ getSessionToken: () => transport.sessionId });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: error?.message || 'Internal server error' }, id: null });
    }
  }
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

const port = Number(process.env.PORT || 3002);
app.listen(port, () => {
  console.log(`eta-ai-mint-mcp listening on :${port} -> ${backendUrl} (remote MCP at /mcp)`);
});
