import { bytesToHex, getAddress, hexToString, isAddress, parseEther, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { activateDelegation, parseDelegationFromCode, signDelegationAuthorization } from '../eip7702';
import { allowSite, isSiteAllowed } from '../permissions';
import { getNativeBalance, getPublicClient, getTokenBalance, getTokenMetadata } from '../rpc';
import { estimateGasForTx, sendNativeTransaction } from '../transactions';
import { DEFAULT_CHAINS, getChainById, type ChainConfig } from '../shared/chains';
import type { PendingRequest, PersistedState, VaultData } from '../shared/types';
import { normalizeMnemonicInput, normalizeChainId, SESSION_KEY, toHexChainId, uid } from '../shared/utils';
import { validateRecoveryPhrase } from '../shared/mnemonic';
import { addCustomChain, addDerivedAccount, cacheVaultSession, createWallet, defaultState, exportPrivateKey, getPrivateKeyForAddress, getState, getActiveChain, hydrateSession, importPrivateKeyAccount, importWalletFromMnemonic, importWalletFromPrivateKey, lockWallet, readCachedVault, removeCustomChain, resetWallet, revealRecoveryPhrase, setState, unlockWallet } from '../walletStore';

const CATSHIT_DELEGATE = (import.meta.env.VITE_CATSHIT_DELEGATE_ADDRESS || '0x0000000000000000000000000000000000000000') as Address;
const DEV_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEV === 'true');
const PROVIDER_EVENT_TYPE = 'CATSHIT_PROVIDER_EVENT';

function debugLog(message: string, extra?: Record<string, unknown>) {
  if (!DEV_LOGS) return;
  console.info(`[catshit-wallet] ${message}`, extra || {});
}

function providerError(message: string, code = 4001, data?: unknown) {
  return { message, code, data };
}

function sanitizeForLog(value: unknown) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 160 ? `${value.slice(0, 157)}...` : value;
  if (typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value, (_, inner) => typeof inner === 'string' && inner.length > 160 ? `${inner.slice(0, 157)}...` : inner));
  } catch {
    return '[unserializable]';
  }
}

function parsePersonalSign(params: any[], activeAccount: Address) {
  const [first, second] = params || [];
  const firstIsAddress = typeof first === 'string' && isAddress(first);
  const secondIsAddress = typeof second === 'string' && isAddress(second);
  const requestedAddress = getAddress((firstIsAddress ? first : secondIsAddress ? second : activeAccount) as Address);
  const rawMessage = firstIsAddress ? second : first;
  if (requestedAddress.toLowerCase() !== activeAccount.toLowerCase()) {
    throw providerError('Requested address does not match the active CATSHIT Wallet account.', 4001);
  }
  const displayMessage = typeof rawMessage === 'string' && rawMessage.startsWith('0x')
    ? (() => { try { return hexToString(rawMessage as Hex); } catch { return rawMessage; } })()
    : String(rawMessage ?? '');
  return { requestedAddress, rawMessage, displayMessage };
}

function normalizePrivateKeyForSigner(privateKey: unknown): Hex {
  if (typeof privateKey === 'string') {
    return (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as Hex;
  }
  if (privateKey instanceof Uint8Array) {
    return bytesToHex(privateKey) as Hex;
  }
  if (privateKey && typeof privateKey === 'object' && 'length' in (privateKey as any)) {
    try {
      return bytesToHex(Uint8Array.from(privateKey as ArrayLike<number>)) as Hex;
    } catch {}
  }
  throw new Error(`Invalid private key type: ${typeof privateKey}`);
}

async function fetchNativeUsdPrice(chainId: number) {
  const coinId = chainId === 56 || chainId === 97 ? 'binancecoin' : 'ethereum';
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
  if (!res.ok) throw new Error('price lookup failed');
  const data = await res.json();
  return Number(data?.[coinId]?.usd || 0);
}

function parseTypedDataRequest(method: string, params: any[], activeAccount: Address, activeChainId: number) {
  const [first, second] = params || [];
  const firstIsAddress = typeof first === 'string' && isAddress(first);
  const secondIsAddress = typeof second === 'string' && isAddress(second);
  const requestedAddress = getAddress((firstIsAddress ? first : secondIsAddress ? second : activeAccount) as Address);
  const rawTypedData = firstIsAddress ? second : first;
  if (requestedAddress.toLowerCase() !== activeAccount.toLowerCase()) {
    throw providerError('Requested address does not match the active CATSHIT Wallet account.', 4001);
  }
  const typedDataObject = typeof rawTypedData === 'string' ? JSON.parse(rawTypedData) : rawTypedData;
  if (!typedDataObject || typeof typedDataObject !== 'object') throw providerError('Invalid typed data payload.', 32602);
  if (!typedDataObject.domain || !typedDataObject.types || !typedDataObject.message) throw providerError('Typed data must include domain, types, and message.', 32602);
  const domainChainId = typedDataObject.domain?.chainId;
  const normalizedDomainChainId = domainChainId === undefined || domainChainId === null ? null : normalizeChainId(domainChainId);
  if (normalizedDomainChainId && normalizedDomainChainId !== activeChainId) throw providerError('Typed data chainId does not match the active network.', 4001);
  return { requestedAddress, typedDataObject };
}

async function notifyTab(tabId: number | undefined, event: string, payload: Record<string, unknown>) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: PROVIDER_EVENT_TYPE, event, payload });
  } catch {
    // ignore missing/closed tabs
  }
}

async function broadcastProviderEvent(event: string, payload: Record<string, unknown>) {
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    await Promise.all(tabs.map((tab) => notifyTab(tab.id, event, payload)));
  } catch {
    // ignore broadcast failures
  }
}

async function setStateAndBroadcast(next: PersistedState) {
  const prev = await getState();
  const state = await setState(next);
  if (prev.settings.activeChainId !== state.settings.activeChainId) {
    await broadcastProviderEvent('chainChanged', { chainId: toHexChainId(state.settings.activeChainId) });
  }
  const prevAddress = prev.primaryAddress || null;
  const nextAddress = state.primaryAddress || null;
  if (prevAddress !== nextAddress) {
    await broadcastProviderEvent('accountsChanged', { accounts: nextAddress ? [nextAddress] : [] });
  }
  return state;
}

async function resolvePendingRequest(pending: PendingRequest, result: unknown) {
  await notifyTab(pending.tabId, 'requestResolved', { requestId: pending.requestId, result });
}

async function rejectPendingRequest(pending: PendingRequest, error: { message: string; code?: number; data?: unknown }) {
  await notifyTab(pending.tabId, 'requestRejected', { requestId: pending.requestId, error });
}

async function openApprovalPopup() {
  try {
    if (chrome.action?.openPopup) {
      await chrome.action.openPopup();
      debugLog('approval popup opened via action');
      return;
    }
  } catch (error) {
    debugLog('approval popup action failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

async function normalizeBootState() {
  const current = await getState();
  const defaultChainId = Number(import.meta.env.VITE_DEFAULT_CHAIN_ID || 11155111);
  const nextChains = current.chains?.length ? current.chains : DEFAULT_CHAINS;
  const activeChainId = Number.isFinite(current.settings?.activeChainId) && current.settings?.activeChainId
    ? current.settings.activeChainId
    : defaultChainId;
  const next = {
    ...defaultState,
    ...current,
    chains: nextChains,
    settings: {
      ...defaultState.settings,
      ...current.settings,
      activeChainId,
    },
  };
  await setState(next);
  debugLog('boot state normalized', { activeChainId: next.settings.activeChainId, chainName: getChainById(next.settings.activeChainId, next.chains).name });
  return next;
}

chrome.runtime.onInstalled.addListener(async () => {
  await normalizeBootState();
});

void normalizeBootState();

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'auto-lock') await lockWallet();
});

async function persistSession(vault: VaultData, state: PersistedState) {
  await cacheVaultSession(vault);
  await chrome.alarms.create('auto-lock', { when: Date.now() + state.settings.autoLockMinutes * 60_000 });
}

async function queueRequest(type: PendingRequest['type'], origin: string, payload: any, account?: Address, requestId?: string, tabId?: number) {
  const state = await getState();
  const pending: PendingRequest = { id: uid('pending'), type, origin, payload, account, requestId, tabId, createdAt: Date.now() };
  await setStateAndBroadcast({ ...state, pendingRequests: [...state.pendingRequests, pending] });
  await openApprovalPopup();
  return pending;
}

async function resolveRequest(id: string) {
  const state = await getState();
  await setStateAndBroadcast({ ...state, pendingRequests: state.pendingRequests.filter((req) => req.id !== id) });
}

async function getLiveState() {
  const state = await getState();
  const vault = await readCachedVault();
  if (state.isUnlocked && !vault) {
    const locked = await setState({ ...state, isUnlocked: false, lockAt: undefined });
    return { state: locked, vault: undefined as VaultData | undefined };
  }
  return { state, vault };
}

async function activeVaultAndAccount() {
  const { state, vault } = await getLiveState();
  if (!state.isUnlocked || !vault) throw new Error('wallet locked');
  hydrateSession(vault);
  const account = vault.accounts[state.activeAccountIndex];
  if (!account) throw new Error('no active account');
  return { state, vault, account };
}

async function handleProviderRequest(message: any, sender: chrome.runtime.MessageSender) {
  const origin = sender.origin || new URL(sender.url || 'http://localhost').origin;
  const method = message.method;
  const params = message.params || [];
  const requestId = message.id as string | undefined;
  const tabId = sender.tab?.id;
  const { state } = await getLiveState();
  const chain = getActiveChain(state);
  debugLog('provider request', { origin, method, activeChainId: chain.id });

  switch (method) {
    case 'eth_requestAccounts': {
      if (!state.isUnlocked) {
        await openApprovalPopup();
        throw providerError('Wallet locked. Unlock CATSHIT Wallet and try again.', 4100);
      }
      const { account } = await activeVaultAndAccount();
      if (!isSiteAllowed(state.connectedSites, origin)) {
        const pending = await queueRequest('connect', origin, { method, permissions: ['eth_accounts'] }, account.address, requestId, tabId);
        return { __pending: true, id: pending.id };
      }
      await notifyTab(tabId, 'connect', { chainId: toHexChainId(chain.id) });
      return [account.address];
    }
    case 'eth_accounts': {
      if (!state.isUnlocked || !isSiteAllowed(state.connectedSites, origin)) return [];
      const { account } = await activeVaultAndAccount();
      return [account.address];
    }
    case 'eth_chainId':
      return toHexChainId(chain.id);
    case 'eth_getBalance': {
      const address = getAddress(params[0]);
      const balance = await getPublicClient(chain).getBalance({ address });
      debugLog('balance request ok', { chainId: chain.id, origin });
      return `0x${balance.toString(16)}`;
    }
    case 'eth_call': {
      return await getPublicClient(chain).call(params[0]);
    }
    case 'personal_sign': {
      const { account } = await activeVaultAndAccount();
      const parsed = parsePersonalSign(params, account.address);
      const pending = await queueRequest('signMessage', origin, { method, message: parsed.rawMessage, displayMessage: parsed.displayMessage, requestedAddress: parsed.requestedAddress }, account.address, requestId, tabId);
      debugLog('sign request queued', { method, origin, activeAccount: account.address, activeChainId: chain.id, requestId: pending.id });
      return { __pending: true, id: pending.id };
    }
    case 'eth_signTypedData_v4':
    case 'eth_signTypedData':
    case 'eth_signTypedData_v3': {
      const { account } = await activeVaultAndAccount();
      const parsed = parseTypedDataRequest(method, params, account.address, chain.id);
      const pending = await queueRequest('signTypedData', origin, { method, typedData: JSON.stringify(parsed.typedDataObject), typedDataObject: sanitizeForLog(parsed.typedDataObject), requestedAddress: parsed.requestedAddress }, account.address, requestId, tabId);
      debugLog('typed data request queued', { method, origin, activeAccount: account.address, activeChainId: chain.id, requestId: pending.id });
      return { __pending: true, id: pending.id };
    }
    case 'eth_sendTransaction': {
      const { account } = await activeVaultAndAccount();
      const tx = params[0];
      const estimate = await estimateGasForTx(chain, account.address, getAddress(tx.to), BigInt(tx.value || '0x0'), tx.data);
      const pending = await queueRequest('sendTransaction', origin, { tx, method, estimate }, account.address, requestId, tabId);
      return { __pending: true, id: pending.id };
    }
    case 'catshit_request7702': {
      const { account } = await activeVaultAndAccount();
      const pending = await queueRequest('eip7702', origin, { method, delegate: params[0]?.delegate || CATSHIT_DELEGATE, chainId: chain.id }, account.address, requestId, tabId);
      return { __pending: true, id: pending.id };
    }
    case 'wallet_switchEthereumChain': {
      const requestedChainId = normalizeChainId(params[0]?.chainId);
      const nextChain = state.chains.find((item) => item.id === requestedChainId);
      if (!nextChain) throw providerError('Chain not found in CATSHIT Wallet.', 4902, { chainId: params[0]?.chainId });
      await setStateAndBroadcast({ ...state, settings: { ...state.settings, activeChainId: nextChain.id } });
      await notifyTab(tabId, 'connect', { chainId: toHexChainId(nextChain.id) });
      debugLog('chain switched', { origin, chainId: nextChain.id });
      return null;
    }
    case 'wallet_addEthereumChain': {
      const next = params[0] || {};
      const chainConfig: ChainConfig = {
        id: normalizeChainId(next.chainId),
        name: next.chainName,
        rpcUrl: next.rpcUrls?.[0],
        symbol: next.nativeCurrency?.symbol || 'ETH',
        explorer: next.blockExplorerUrls?.[0] || '',
      };
      if (!chainConfig.id || !chainConfig.name || !chainConfig.rpcUrl) throw providerError('Invalid chain parameters.', 32602);
      const pending = await queueRequest('addChain', origin, { method, chain: chainConfig, raw: next }, undefined, requestId, tabId);
      return { __pending: true, id: pending.id };
    }
    default:
      throw providerError(`Unsupported method: ${method}`, 4200);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'CATSHIT_PROVIDER_REQUEST': {
          const result = await handleProviderRequest(message, sender);
          if ((result as any)?.__pending) {
            sendResponse({ ok: true, pending: true, result: null });
            return;
          }
          sendResponse({ ok: true, result });
          return;
        }
        case 'wallet:getState': {
          await normalizeBootState();
          const { state, vault } = await getLiveState();
          sendResponse({ ok: true, state, vault });
          return;
        }
        case 'wallet:create': {
          const result = await createWallet(message.password, message.mnemonic);
          await persistSession(result.vault, result.state);
          sendResponse({ ok: true, ...result });
          return;
        }
        case 'wallet:importMnemonic': {
          const checked = validateRecoveryPhrase(message.mnemonic || '');
          console.info('wallet:importMnemonic validation', { wordCount: checked.wordCount, valid: checked.valid });
          if (!checked.valid) throw new Error(`Recovery phrase validation failed (${checked.wordCount} words).`);
          const result = await importWalletFromMnemonic(message.password, checked.normalized);
          await persistSession(result.vault, result.state);
          sendResponse({ ok: true, ...result });
          return;
        }
        case 'wallet:importPrivateKey': {
          const result = await importWalletFromPrivateKey(message.password, message.privateKey);
          await persistSession(result.vault, result.state);
          sendResponse({ ok: true, ...result });
          return;
        }
        case 'wallet:unlock': {
          const result = await unlockWallet(message.password);
          await persistSession(result.vault, result.state);
          sendResponse({ ok: true, state: result.state, vault: result.vault });
          return;
        }
        case 'wallet:lock': {
          const state = await lockWallet();
          await chrome.storage.session.remove(SESSION_KEY);
          sendResponse({ ok: true, state });
          return;
        }
        case 'wallet:reset': {
          const state = await resetWallet();
          sendResponse({ ok: true, state });
          return;
        }
        case 'wallet:addDerivedAccount': {
          const result = await addDerivedAccount(message.password);
          sendResponse({ ok: true, ...result });
          return;
        }
        case 'wallet:importPrivateKeyAccount': {
          const result = await importPrivateKeyAccount(message.password, message.privateKey as Hex);
          sendResponse({ ok: true, ...result });
          return;
        }
        case 'wallet:revealRecoveryPhrase': {
          const mnemonic = await revealRecoveryPhrase(message.password);
          sendResponse({ ok: true, mnemonic });
          return;
        }
        case 'wallet:exportPrivateKey': {
          const privateKey = await exportPrivateKey(message.password, message.address ? getAddress(message.address) : undefined);
          sendResponse({ ok: true, privateKey });
          return;
        }
        case 'wallet:addCustomChain': {
          const state = await addCustomChain(message.chain);
          sendResponse({ ok: true, state });
          return;
        }
        case 'wallet:removeCustomChain': {
          const state = await removeCustomChain(Number(message.chainId));
          sendResponse({ ok: true, state });
          return;
        }
        case 'wallet:disconnectSite': {
          const current = await getState();
          const state = await setStateAndBroadcast({ ...current, connectedSites: current.connectedSites.filter((site) => site.origin !== message.origin) });
          await broadcastProviderEvent('disconnect', { code: 4900, message: `Disconnected from ${message.origin}` });
          sendResponse({ ok: true, state });
          return;
        }
        case 'wallet:disconnectAllSites': {
          const current = await getState();
          const state = await setStateAndBroadcast({ ...current, connectedSites: [] });
          await broadcastProviderEvent('disconnect', { code: 4900, message: 'Disconnected from all sites' });
          sendResponse({ ok: true, state });
          return;
        }
        case 'wallet:updateState': {
          const current = await getState();
          const next = { ...current, ...message.patch, settings: { ...current.settings, ...(message.patch?.settings || {}) } };
          const selectedAddress = message.patch?.activeAccountIndex !== undefined ? (await readCachedVault())?.accounts[message.patch.activeAccountIndex]?.address : current.primaryAddress;
          const state = await setStateAndBroadcast({ ...next, primaryAddress: selectedAddress || next.primaryAddress });
          sendResponse({ ok: true, state });
          return;
        }
        case 'wallet:getTokenMetadata': {
          const state = await getState();
          const chain = getActiveChain(state);
          const result = await getTokenMetadata(chain, getAddress(message.address));
          sendResponse({ ok: true, result });
          return;
        }
        case 'wallet:estimateSend': {
          const { account, state } = await activeVaultAndAccount();
          const chain = getActiveChain(state);
          const to = getAddress(message.to);
          const value = parseEther(message.amount);
          const estimate = await estimateGasForTx(chain, account.address, to, value);
          sendResponse({
            ok: true,
            estimate: {
              gas: estimate.gas.toString(),
              feeWei: estimate.feeWei.toString(),
              feeFormatted: estimate.feeFormatted,
              fees: {
                maxFeePerGas: estimate.fees.maxFeePerGas?.toString?.() ?? null,
                maxPriorityFeePerGas: estimate.fees.maxPriorityFeePerGas?.toString?.() ?? null,
                gasPrice: estimate.fees.gasPrice?.toString?.() ?? null,
              },
            },
            from: account.address,
            network: chain,
          });
          return;
        }
        case 'wallet:sendNative': {
          const { account, state } = await activeVaultAndAccount();
          const chain = getActiveChain(state);
          const privateKey = getPrivateKeyForAddress(account.address);
          if (!privateKey) throw new Error('Private key unavailable');
          const normalizedPrivateKey = normalizePrivateKeyForSigner(privateKey);
          const hash = await sendNativeTransaction(chain, normalizedPrivateKey, getAddress(message.to), parseEther(message.amount));
          await broadcastProviderEvent('accountsChanged', { accounts: [account.address] });
          sendResponse({ ok: true, hash, explorer: chain.explorer ? `${chain.explorer}/tx/${hash}` : undefined });
          return;
        }
        case 'wallet:approvePending': {
          const { id } = message;
          const state = await getState();
          const pending = state.pendingRequests.find((item) => item.id === id);
          if (!pending) throw new Error('Pending request not found');
          debugLog('approve pending start', { requestId: pending.id, method: pending.payload?.method || pending.type, origin: pending.origin, activeChainId: state.settings.activeChainId });
          const chain = getActiveChain(state);
          let result: any = null;
          if (pending.type === 'connect') {
            const { account } = await activeVaultAndAccount();
            const connectedSites = allowSite(state.connectedSites, pending.origin, [account.address]);
            await setStateAndBroadcast({ ...state, connectedSites, pendingRequests: state.pendingRequests.filter((req) => req.id !== id) });
            await resolvePendingRequest(pending, [account.address]);
            await notifyTab(pending.tabId, 'connect', { chainId: toHexChainId(chain.id) });
            sendResponse({ ok: true, result: [account.address] });
            return;
          }
          if (pending.type === 'addChain') {
            const stateAfterAdd = await addCustomChain(pending.payload.chain);
            await resolveRequest(id);
            await broadcastProviderEvent('chainChanged', { chainId: toHexChainId(stateAfterAdd.settings.activeChainId) });
            await resolvePendingRequest(pending, null);
            sendResponse({ ok: true, result: null });
            return;
          }
          const { account } = await activeVaultAndAccount();
          const privateKey = getPrivateKeyForAddress(account.address);
          if (!privateKey) throw new Error('Private key unavailable');
          const normalizedPrivateKey = normalizePrivateKeyForSigner(privateKey);
          const signer = privateKeyToAccount(normalizedPrivateKey);
          if (pending.type === 'signMessage') {
            const rawMessage = pending.payload.message;
            const messageToSign = typeof rawMessage === 'string' && rawMessage.startsWith('0x')
              ? (() => { try { return { raw: rawMessage as Hex }; } catch { return { raw: rawMessage }; } })()
              : { message: String(rawMessage ?? '') };
            result = 'message' in messageToSign
              ? await signer.signMessage({ message: messageToSign.message })
              : await signer.signMessage({ message: { raw: messageToSign.raw } });
            debugLog('sign request approved', { method: pending.payload.method, origin: pending.origin, activeAccount: account.address, activeChainId: chain.id, requestId: pending.id, signatureReturned: Boolean(result) });
          } else if (pending.type === 'signTypedData') {
            const typedData = JSON.parse(pending.payload.typedData);
            result = await signer.signTypedData(typedData);
            debugLog('sign request approved', { method: pending.payload.method, origin: pending.origin, activeAccount: account.address, activeChainId: chain.id, requestId: pending.id, signatureReturned: Boolean(result) });
          } else if (pending.type === 'sendTransaction') {
            const tx = pending.payload.tx;
            result = await sendNativeTransaction(chain, normalizedPrivateKey, getAddress(tx.to), BigInt(tx.value || '0x0'), tx.data);
          } else if (pending.type === 'eip7702') {
            const signedAuthorization = await signDelegationAuthorization({ privateKey: normalizedPrivateKey, chain, delegate: pending.payload.delegate, executor: 'self' });
            result = await activateDelegation({ privateKey: normalizedPrivateKey, chain, signedAuthorization });
            await setStateAndBroadcast({ ...state, latestDelegationTxHash: result });
          }
          await resolveRequest(id);
          await resolvePendingRequest(pending, result);
          sendResponse({ ok: true, result, explorer: typeof result === 'string' && chain.explorer ? `${chain.explorer}/tx/${result}` : undefined });
          return;
        }
        case 'wallet:rejectPending': {
          const state = await getState();
          const pending = state.pendingRequests.find((item) => item.id === message.id);
          if (pending) {
            debugLog('sign request rejected', { method: pending.payload?.method || pending.type, origin: pending.origin, activeAccount: pending.account, activeChainId: state.settings.activeChainId, requestId: pending.id, approved: false });
            await rejectPendingRequest(pending, providerError('Request rejected by user.', 4001));
          }
          await resolveRequest(message.id);
          sendResponse({ ok: true });
          return;
        }
        case 'wallet:getNativePrice': {
          const state = await getState();
          const chain = getActiveChain(state);
          const priceUsd = await fetchNativeUsdPrice(chain.id);
          sendResponse({ ok: true, priceUsd, symbol: chain.symbol, chainId: chain.id });
          return;
        }
        case 'wallet:getBalance': {
          const state = await getState();
          const vault = await readCachedVault();
          const address = vault?.accounts[state.activeAccountIndex]?.address || state.primaryAddress;
          if (!address) throw new Error('No active account address available');
          const chain = getActiveChain(state);
          debugLog('wallet:getBalance', { activeAccount: address, activeChainId: chain.id, activeChainName: chain.name, rpcUrl: chain.rpcUrl });
          const balance = await getNativeBalance(chain, address);
          sendResponse({ ok: true, balance: { ...balance, raw: balance.raw.toString() } });
          return;
        }
        case 'wallet:getTokenBalance': {
          const state = await getState();
          const vault = await readCachedVault();
          const owner = vault?.accounts[state.activeAccountIndex]?.address || state.primaryAddress;
          if (!owner) throw new Error('No active account address available');
          const chain = getActiveChain(state);
          const balance = await getTokenBalance(chain, getAddress(message.address), owner, Number(message.decimals || 18));
          sendResponse({ ok: true, balance: { ...balance, raw: balance.raw.toString() } });
          return;
        }
        case 'wallet:getDelegation': {
          const { account, state } = await activeVaultAndAccount();
          const chain = getActiveChain(state);
          const code = await getPublicClient(chain).getCode({ address: account.address });
          sendResponse({ ok: true, ...parseDelegationFromCode(code, CATSHIT_DELEGATE), code });
          return;
        }
        case 'wallet:signDelegation': {
          const { account, state } = await activeVaultAndAccount();
          const chain = getActiveChain(state);
          const privateKey = getPrivateKeyForAddress(account.address);
          if (!privateKey) throw new Error('Private key unavailable');
          const normalizedPrivateKey = normalizePrivateKeyForSigner(privateKey);
          const result = await signDelegationAuthorization({ privateKey: normalizedPrivateKey, chain, delegate: message.delegate || CATSHIT_DELEGATE, executor: 'self' });
          sendResponse({ ok: true, result });
          return;
        }
        case 'wallet:activateDelegation': {
          const { account, state } = await activeVaultAndAccount();
          const chain = getActiveChain(state);
          const privateKey = getPrivateKeyForAddress(account.address);
          if (!privateKey) throw new Error('Private key unavailable');
          const normalizedPrivateKey = normalizePrivateKeyForSigner(privateKey);
          const signedAuthorization = message.authorization || await signDelegationAuthorization({ privateKey: normalizedPrivateKey, chain, delegate: message.delegate || CATSHIT_DELEGATE, executor: 'self' });
          const hash = await activateDelegation({ privateKey: normalizedPrivateKey, chain, signedAuthorization });
          await setStateAndBroadcast({ ...state, latestDelegationTxHash: hash });
          sendResponse({ ok: true, hash });
          return;
        }
        case 'wallet:revokeDelegation': {
          const { account, state } = await activeVaultAndAccount();
          const chain = getActiveChain(state);
          const privateKey = getPrivateKeyForAddress(account.address);
          if (!privateKey) throw new Error('Private key unavailable');
          const normalizedPrivateKey = normalizePrivateKeyForSigner(privateKey);
          const signedAuthorization = await signDelegationAuthorization({ privateKey: normalizedPrivateKey, chain, delegate: '0x0000000000000000000000000000000000000000', executor: 'self' });
          const hash = await activateDelegation({ privateKey: normalizedPrivateKey, chain, signedAuthorization });
          await setStateAndBroadcast({ ...state, latestDelegationTxHash: hash });
          sendResponse({ ok: true, hash });
          return;
        }
        default:
          sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string')
          ? (error as any).message
          : String(error);
      const code = typeof error === 'object' && error && 'code' in error && typeof (error as any).code === 'number'
        ? (error as any).code
        : 4001;
      const data = typeof error === 'object' && error && 'data' in error ? (error as any).data : undefined;
      debugLog('background request failed', { message, code });
      sendResponse({ ok: false, error: { message, code, data } });
    }
  })();
  return true;
});
