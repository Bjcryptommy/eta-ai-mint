export type TokenInfo = {
  ok: true;
  tokenAddress: string;
  delegateAddress: string;
  relayerAddress: string;
  feeReceiver: string;
  mintPriceWei: string;
  mintPriceEth: string;
  name: string;
  symbol: string;
  mintAmount: string;
  maxTotalMints: string;
  maxPerWallet: string;
  remaining: string;
  totalMints: string;
};

export type WalletStatus = {
  ok: true;
  wallet: string;
  delegated: boolean;
  quotaRemaining: string;
  tokenBalance: string;
  mintsOf: string;
  ethBalanceWei: string;
  ethBalanceEth: string;
};

export type MintResponse = {
  ok: boolean;
  wallet?: string;
  slotsRequested?: number;
  feeWei?: string;
  feeEth?: string;
  txHash?: string;
  blockNumber?: string;
  gasUsed?: string;
  quotaRemaining?: string;
  tokenBalance?: string;
  mintsOf?: string;
  totalMints?: string;
  message?: string;
};

export type DelegationDebug = {
  action: 'delegate' | 'revoke';
  outcome: 'idle' | 'pending' | 'success' | 'error';
  wallet: string | null;
  walletClientAccount: string | null;
  chainLabel: string | null;
  walletChainId: number | null;
  connectorName: string | null;
  providerFlags: string[];
  rawMessage: string | null;
  rawDetails: string | null;
  rawCode: string | null;
  rawPayload: string | null;
  txHash: string | null;
};
