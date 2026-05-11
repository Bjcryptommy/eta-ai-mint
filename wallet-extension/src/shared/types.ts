import type { Address, Hex } from 'viem';
import type { ChainConfig } from './chains';

export type VaultAccount = { index: number; address: Address; name: string };
export type TokenEntry = { chainId: number; address: Address; symbol: string; name: string; decimals: number };
export type ConnectedSite = { origin: string; accounts: Address[]; connectedAt: number };
export type DelegationState = 'not_delegated' | 'delegated_known' | 'delegated_unknown' | 'revoked';
export type PendingRequestType = 'connect' | 'signMessage' | 'signTypedData' | 'sendTransaction' | 'eip7702' | 'addChain';

export type PendingRequest = {
  id: string;
  type: PendingRequestType;
  origin: string;
  createdAt: number;
  account?: Address;
  requestId?: string;
  tabId?: number;
  payload: any;
};

export type WalletSettings = {
  autoLockMinutes: 30 | 60 | 120;
  activeChainId: number;
  defaultCurrency: 'USD';
  developerRpcTrace: boolean;
  developerLogs: boolean;
};

export type VaultData = {
  mnemonic: string;
  accounts: VaultAccount[];
  importedPrivateKeys: { address: Address; privateKey: Hex; name: string }[];
};

export type PersistedState = {
  isSetup: boolean;
  isUnlocked: boolean;
  activeAccountIndex: number;
  settings: WalletSettings;
  chains: ChainConfig[];
  tokens: TokenEntry[];
  connectedSites: ConnectedSite[];
  pendingRequests: PendingRequest[];
  encryptedVault?: string;
  salt?: string;
  iv?: string;
  lockAt?: number;
  latestDelegationTxHash?: Hex;
  primaryAddress?: Address;
  primaryAccountName?: string;
};
