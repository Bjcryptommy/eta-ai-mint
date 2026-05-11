import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const backendAuthToken = process.env.BACKEND_AUTH_TOKEN || '';

function authHeaders() {
  return backendAuthToken ? { authorization: `Bearer ${backendAuthToken}` } : {};
}

async function backend(path, options = {}) {
  const response = await fetch(`${backendUrl}${path}`, {
    headers: { 'content-type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || data?.error?.message || `backend request failed (${response.status})`);
  }
  return data;
}

function summarize(tool, payload) {
  switch (tool) {
    case 'token_info':
      return [
        `${payload.name} (${payload.symbol}) is live at ${payload.tokenAddress}.`,
        `Mint price: ${payload.mintPriceEth} ETH per slot.`,
        `Mint amount: ${payload.mintAmount} units per slot.`,
        `Remaining public mints: ${payload.remaining}.`,
        `Total mints so far: ${payload.totalMints}.`,
      ].join('\n');
    case 'authorization_status':
      return payload.delegated
        ? `${payload.wallet} is delegated to ${payload.delegateAddress}.`
        : `${payload.wallet} is not delegated to the configured MintDelegate.`;
    case 'mint_quota_get':
      return `${payload.wallet} has ${payload.quotaRemaining} mint slots remaining.`;
    case 'token_balance':
      return `${payload.wallet} holds ${payload.tokenBalance} token units and has minted ${payload.mintsOf} slot(s).`;
    case 'wallet_status':
      return [
        `Wallet: ${payload.wallet}`,
        `Delegated: ${payload.delegated ? 'yes' : 'no'}`,
        `Quota remaining: ${payload.quotaRemaining}`,
        `Token balance: ${payload.tokenBalance}`,
        `Mint count: ${payload.mintsOf}`,
        `ETH balance: ${payload.ethBalanceEth}`,
      ].join('\n');
    case 'token_mint':
      return [
        `Mint successful for ${payload.wallet}.`,
        `Requested slots: ${payload.slotsRequested}`,
        `Transaction: ${payload.txHash}`,
        `Fee paid: ${payload.feeEth} ETH`,
        `Quota remaining: ${payload.quotaRemaining}`,
        `Token balance: ${payload.tokenBalance}`,
      ].join('\n');
    case 'tx_status':
      return [
        `Transaction ${payload.txHash} is ${payload.status}.`,
        `Block: ${payload.blockNumber}`,
        `Gas used: ${payload.gasUsed}`,
      ].join('\n');
    case 'revoke_info':
      return payload.delegated
        ? `${payload.wallet} is currently delegated to ${payload.activeDelegate}. Revoke by sending a new EIP-7702 authorization that clears or replaces the current delegate.`
        : `${payload.wallet} is not currently delegated to the configured MintDelegate.`;
    default:
      return JSON.stringify(payload, null, 2);
  }
}

function textResult(tool, payload) {
  return {
    content: [
      {
        type: 'text',
        text: summarize(tool, payload),
      },
    ],
    structuredContent: payload,
  };
}

const tools = [
  {
    name: 'token_info',
    description: 'Get token name, symbol, mint price, mint amount, contract addresses, and current mint progress.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'authorization_status',
    description: 'Check whether a wallet is currently delegated to the configured MintDelegate and therefore eligible to mint through the relayer.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address to inspect.' },
      },
      required: ['wallet'],
      additionalProperties: false,
    },
  },
  {
    name: 'mint_quota_get',
    description: 'Get the remaining mint quota for a wallet before attempting a mint.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address to inspect.' },
      },
      required: ['wallet'],
      additionalProperties: false,
    },
  },
  {
    name: 'token_balance',
    description: 'Get a wallet\'s current token balance and mint count.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address to inspect.' },
      },
      required: ['wallet'],
      additionalProperties: false,
    },
  },
  {
    name: 'wallet_status',
    description: 'Get delegated status, remaining quota, token balance, mint count, and ETH balance for a wallet in one call.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address to inspect.' },
      },
      required: ['wallet'],
      additionalProperties: false,
    },
  },
  {
    name: 'token_mint',
    description: 'Mint one or more slots for a delegated wallet through the relayer. Use only after confirming delegation and quota.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Delegated wallet address.' },
        slots: { type: 'integer', minimum: 1, description: 'Number of slots to mint.' },
      },
      required: ['wallet'],
      additionalProperties: false,
    },
  },
  {
    name: 'tx_status',
    description: 'Get transaction status, block number, and gas used by transaction hash.',
    inputSchema: {
      type: 'object',
      properties: {
        hash: { type: 'string', description: 'Transaction hash.' },
      },
      required: ['hash'],
      additionalProperties: false,
    },
  },
  {
    name: 'revoke_info',
    description: 'Explain whether a wallet is delegated and how revocation should work for that wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address to inspect.' },
      },
      required: ['wallet'],
      additionalProperties: false,
    },
  },
];

const server = new Server(
  {
    name: 'eta-ai-mint-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  switch (name) {
    case 'token_info':
      return textResult('token_info', await backend('/token-info'));
    case 'authorization_status':
      return textResult('authorization_status', await backend(`/authorization-status/${args.wallet}`));
    case 'mint_quota_get':
      return textResult('mint_quota_get', await backend(`/mint-quota/${args.wallet}`));
    case 'token_balance':
      return textResult('token_balance', await backend(`/token-balance/${args.wallet}`));
    case 'wallet_status':
      return textResult('wallet_status', await backend(`/wallet-status/${args.wallet}`));
    case 'token_mint':
      return textResult('token_mint', await backend('/mint', {
        method: 'POST',
        body: JSON.stringify({ wallet: args.wallet, slots: args.slots ?? 1 }),
      }));
    case 'tx_status':
      return textResult('tx_status', await backend(`/tx-status/${args.hash}`));
    case 'revoke_info':
      return textResult('revoke_info', await backend(`/revoke-info/${args.wallet}`));
    default:
      throw new Error(`unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
