import { english, generateMnemonic, mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import type { Address, Hex } from 'viem';
import { DEFAULT_CHAINS, getChainById, type ChainConfig } from './shared/chains';
import type { PersistedState, VaultAccount, VaultData } from './shared/types';
import { DEFAULT_TOKENS } from './shared/tokens';
import { fromBase64, normalizeMnemonicInput, SESSION_KEY, STORAGE_KEY, toBase64 } from './shared/utils';
import { bytesToHex } from 'viem';

export const defaultState: PersistedState = {
  isSetup: false,
  isUnlocked: false,
  activeAccountIndex: 0,
  settings: { autoLockMinutes: 30, activeChainId: Number(import.meta.env.VITE_DEFAULT_CHAIN_ID || 11155111), defaultCurrency: 'USD', developerRpcTrace: false, developerLogs: false },
  chains: DEFAULT_CHAINS,
  tokens: DEFAULT_TOKENS,
  connectedSites: [],
  pendingRequests: []
};

export type SessionSecrets = {
  mnemonic?: string;
  importedPrivateKeys: Record<string, Hex>;
};

let sessionSecrets: SessionSecrets = { importedPrivateKeys: {} };

async function deriveKey(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptVault(password: string, vault: VaultData) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const data = new TextEncoder().encode(JSON.stringify(vault));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { encryptedVault: toBase64(new Uint8Array(encrypted)), salt: toBase64(salt), iv: toBase64(iv) };
}

export async function decryptVault(password: string, encryptedVault: string, salt: string, iv: string) {
  try {
    const key = await deriveKey(password, fromBase64(salt));
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(encryptedVault));
    return JSON.parse(new TextDecoder().decode(decrypted)) as VaultData;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    if (!message || /decrypt|operation-specific reason|aes|gcm/i.test(message)) {
      throw new Error('Wrong password. Try again.');
    }
    throw error;
  }
}


function sanitizePersistedState(state: PersistedState) {
  const allowedDefaults = new Map(DEFAULT_CHAINS.map((chain) => [chain.id, chain]));
  const customChains = (state.chains || []).filter((chain) => !allowedDefaults.has(chain.id) && chain.id !== 97);
  const mergedChains = [...DEFAULT_CHAINS, ...customChains];
  const activeChainId = state.settings?.activeChainId === 97 ? 56 : state.settings?.activeChainId;
  return {
    ...state,
    chains: mergedChains,
    settings: {
      ...state.settings,
      activeChainId: mergedChains.some((chain) => chain.id === activeChainId) ? activeChainId : DEFAULT_CHAINS[0].id,
    },
  } as PersistedState;
}

export async function getState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const merged = { ...defaultState, ...(stored[STORAGE_KEY] || {}) } as PersistedState;
  return sanitizePersistedState(merged);
}

export async function setState(next: PersistedState) {
  const sanitized = sanitizePersistedState(next);
  await chrome.storage.local.set({ [STORAGE_KEY]: sanitized });
  return sanitized;
}

function deriveStateFromVault(state: PersistedState, vault: VaultData) {
  return {
    ...state,
    primaryAddress: vault.accounts[0]?.address || state.primaryAddress,
    primaryAccountName: vault.accounts[0]?.name || state.primaryAccountName
  };
}

export function hydrateSession(vault: VaultData) {
  const importedPrivateKeys = Object.fromEntries(vault.importedPrivateKeys.map((entry) => [entry.address.toLowerCase(), entry.privateKey]));
  sessionSecrets = { mnemonic: vault.mnemonic || undefined, importedPrivateKeys };
}

async function writeVault(password: string, state: PersistedState, vault: VaultData) {
  const encrypted = await encryptVault(password, vault);
  const next = await setState(deriveStateFromVault({ ...state, ...encrypted }, vault));
  await cacheVaultSession(vault);
  hydrateSession(vault);
  return { state: next, vault };
}

export async function createWallet(password: string, mnemonicInput?: string) {
  const mnemonic = normalizeMnemonicInput(mnemonicInput || generateMnemonic(english));
  const account = mnemonicToAccount(mnemonic);
  const vault: VaultData = { mnemonic, accounts: [{ index: 0, address: account.address, name: 'Account 1' }], importedPrivateKeys: [] };
  const encrypted = await encryptVault(password, vault);
  hydrateSession(vault);
  const next = await setState({ ...defaultState, ...encrypted, isSetup: true, isUnlocked: true, activeAccountIndex: 0, primaryAddress: vault.accounts[0].address, primaryAccountName: vault.accounts[0].name });
  return { state: next, mnemonic: vault.mnemonic, account: vault.accounts[0], vault };
}

export async function importWalletFromMnemonic(password: string, mnemonic: string) {
  const cleaned = normalizeMnemonicInput(mnemonic);
  const account = mnemonicToAccount(cleaned);
  const vault: VaultData = { mnemonic: cleaned, accounts: [{ index: 0, address: account.address, name: 'Account 1' }], importedPrivateKeys: [] };
  const encrypted = await encryptVault(password, vault);
  hydrateSession(vault);
  const next = await setState({ ...defaultState, ...encrypted, isSetup: true, isUnlocked: true, activeAccountIndex: 0, primaryAddress: vault.accounts[0].address, primaryAccountName: vault.accounts[0].name });
  return { state: next, account: vault.accounts[0], vault };
}

export async function importWalletFromPrivateKey(password: string, privateKey: Hex) {
  const normalized = privateKey.startsWith('0x') ? privateKey : (`0x${privateKey}` as Hex);
  const account = privateKeyToAccount(normalized);
  const vault: VaultData = { mnemonic: '', accounts: [{ index: 0, address: account.address, name: 'Imported 1' }], importedPrivateKeys: [{ address: account.address, privateKey: normalized, name: 'Imported 1' }] };
  const encrypted = await encryptVault(password, vault);
  hydrateSession(vault);
  const next = await setState({ ...defaultState, ...encrypted, isSetup: true, isUnlocked: true, activeAccountIndex: 0, primaryAddress: vault.accounts[0].address, primaryAccountName: vault.accounts[0].name });
  return { state: next, account: vault.accounts[0], vault };
}

export async function unlockWallet(password: string) {
  const state = await getState();
  if (!state.encryptedVault || !state.salt || !state.iv) throw new Error('vault not initialized');
  const vault = await decryptVault(password, state.encryptedVault, state.salt, state.iv);
  hydrateSession(vault);
  const next = await setState(deriveStateFromVault({ ...state, isUnlocked: true, lockAt: Date.now() + state.settings.autoLockMinutes * 60_000 }, vault));
  return { state: next, vault };
}

export async function lockWallet() {
  sessionSecrets = { importedPrivateKeys: {} };
  const state = await getState();
  return setState({ ...state, isUnlocked: false, lockAt: undefined });
}

export function deriveAccount(index: number) {
  if (!sessionSecrets.mnemonic) throw new Error('mnemonic unavailable');
  const account = mnemonicToAccount(sessionSecrets.mnemonic, { addressIndex: index });
  return { index, address: account.address, name: `Account ${index + 1}` } as VaultAccount;
}

export async function addDerivedAccount(password: string) {
  const state = await getState();
  if (!state.encryptedVault || !state.salt || !state.iv) throw new Error('vault missing');
  const vault = await decryptVault(password, state.encryptedVault, state.salt, state.iv);
  if (!vault.mnemonic) throw new Error('This wallet has no recovery phrase. Imported private-key-only wallets cannot derive new accounts.');
  const nextAccount = mnemonicToAccount(vault.mnemonic, { addressIndex: vault.accounts.length });
  vault.accounts.push({ index: vault.accounts.length, address: nextAccount.address, name: `Account ${vault.accounts.length + 1}` });
  const result = await writeVault(password, state, vault);
  return result;
}

export async function importPrivateKeyAccount(password: string, privateKey: Hex) {
  const state = await getState();
  if (!state.encryptedVault || !state.salt || !state.iv) throw new Error('vault missing');
  const vault = await decryptVault(password, state.encryptedVault, state.salt, state.iv);
  const normalized = privateKey.startsWith('0x') ? privateKey : (`0x${privateKey}` as Hex);
  const account = privateKeyToAccount(normalized);
  const exists = vault.accounts.some((item) => item.address.toLowerCase() === account.address.toLowerCase());
  if (exists) throw new Error('This account is already in the wallet.');
  const name = `Imported ${vault.importedPrivateKeys.length + 1}`;
  vault.accounts.push({ index: vault.accounts.length, address: account.address, name });
  vault.importedPrivateKeys.push({ address: account.address, privateKey: normalized, name });
  return writeVault(password, state, vault);
}

export async function revealRecoveryPhrase(password: string) {
  const state = await getState();
  if (!state.encryptedVault || !state.salt || !state.iv) throw new Error('vault missing');
  const vault = await decryptVault(password, state.encryptedVault, state.salt, state.iv);
  if (!vault.mnemonic) throw new Error('No recovery phrase stored for this wallet.');
  return vault.mnemonic;
}

export async function exportPrivateKey(password: string, address?: Address) {
  const state = await getState();
  if (!state.encryptedVault || !state.salt || !state.iv) throw new Error('vault missing');
  const vault = await decryptVault(password, state.encryptedVault, state.salt, state.iv);
  hydrateSession(vault);
  const target = address || vault.accounts[state.activeAccountIndex]?.address;
  if (!target) throw new Error('No account selected');
  const pk = getPrivateKeyForAddress(target);
  if (!pk) throw new Error('Private key unavailable for this account');
  if (typeof pk === 'string') return pk.startsWith('0x') ? pk : (`0x${pk}` as Hex);
  if (pk instanceof Uint8Array) return bytesToHex(pk) as Hex;
  if (pk && typeof pk === 'object' && 'length' in (pk as any)) {
    try {
      return bytesToHex(Uint8Array.from(pk as ArrayLike<number>)) as Hex;
    } catch {}
  }
  throw new Error('Private key unavailable for this account');
}

export async function addCustomChain(chain: ChainConfig) {
  const state = await getState();
  const exists = state.chains.some((item) => item.id === chain.id);
  if (exists) throw new Error('Chain ID already exists.');
  return setState({ ...state, chains: [...state.chains, chain], settings: { ...state.settings, activeChainId: chain.id } });
}

export async function removeCustomChain(chainId: number) {
  const state = await getState();
  if (DEFAULT_CHAINS.some((chain) => chain.id === chainId)) throw new Error('Default chains cannot be removed.');
  const chains = state.chains.filter((chain) => chain.id !== chainId);
  const nextActive = state.settings.activeChainId === chainId ? DEFAULT_CHAINS[0].id : state.settings.activeChainId;
  return setState({ ...state, chains, settings: { ...state.settings, activeChainId: nextActive } });
}

export async function getActiveAccount() {
  const state = await getState();
  const cachedVault = await readCachedVault();
  return cachedVault?.accounts[state.activeAccountIndex] ?? null;
}

export async function cacheVaultSession(vault: VaultData) {
  await chrome.storage.session.set({ [SESSION_KEY]: vault });
}

export async function readCachedVault() {
  const rawVault = await chrome.storage.session.get(SESSION_KEY);
  return rawVault[SESSION_KEY] as VaultData | undefined;
}

export function getPrivateKeyForAddress(address: Address) {
  const lower = address.toLowerCase();
  if (sessionSecrets.importedPrivateKeys[lower]) return sessionSecrets.importedPrivateKeys[lower];
  if (!sessionSecrets.mnemonic) return null;
  for (let i = 0; i < 50; i += 1) {
    const account = mnemonicToAccount(sessionSecrets.mnemonic, { addressIndex: i });
    if (account.address.toLowerCase() === lower) return account.getHdKey().privateKey as Hex;
  }
  return null;
}

export async function resetWallet() {
  sessionSecrets = { importedPrivateKeys: {} };
  await chrome.storage.local.remove(STORAGE_KEY);
  await chrome.storage.session.remove(SESSION_KEY);
  return defaultState;
}

export function getActiveChain(state: PersistedState) {
  return getChainById(state.settings.activeChainId, state.chains);
}
