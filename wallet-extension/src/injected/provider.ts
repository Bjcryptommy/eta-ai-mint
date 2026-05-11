type Listener = (...args: any[]) => void;

type PendingCallback = { resolve: (value: any) => void; reject: (reason?: any) => void };

const DEV_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEV === 'true');
const pending = new Map<string, PendingCallback>();

class CatshitProvider {
  isCATSHITWallet = true;
  isMetaMask = false;
  rdns = 'com.catshit.wallet';
  providers?: any[];
  selectedAddress?: string;
  chainId?: string;
  private listeners = new Map<string, Set<Listener>>();
  private info: { uuid: string; name: string; icon: string; rdns: string };

  constructor() {
    const script = document.currentScript as HTMLScriptElement | null;
    const extensionBase = script?.src ? new URL('.', script.src).toString() : '';
    this.info = {
      uuid: '58f3a36e-3a0f-4af2-a0c2-catshitwallet',
      name: 'CATSHIT Wallet',
      icon: `${extensionBase}../icons/icon128.png`,
      rdns: 'com.catshit.wallet'
    };

    if (DEV_LOGS) console.info('[catshit-wallet][inject] provider injected');
    this.announce();
    window.addEventListener('eip6963:requestProvider', this.announce.bind(this));
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.data?.target !== 'catshit-wallet-injected') return;
      const { id, ok, pending: isPending, result, error } = event.data;
      const callback = pending.get(id);
      if (!callback) return;
      if (isPending) return;
      pending.delete(id);
      if (ok) callback.resolve(result);
      else {
        const err: any = new Error(error?.message || error || 'wallet request failed');
        if (error?.code) err.code = error.code;
        if (error?.data) err.data = error.data;
        callback.reject(err);
      }
    });
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.data?.target !== 'catshit-wallet-notify') return;
      if (event.data.event === 'requestResolved') {
        const callback = pending.get(event.data.payload?.requestId);
        if (!callback) return;
        pending.delete(event.data.payload.requestId);
        callback.resolve(event.data.payload.result);
        return;
      }
      if (event.data.event === 'requestRejected') {
        const callback = pending.get(event.data.payload?.requestId);
        if (!callback) return;
        pending.delete(event.data.payload.requestId);
        const err: any = new Error(event.data.payload?.error?.message || 'Request rejected');
        if (event.data.payload?.error?.code) err.code = event.data.payload.error.code;
        callback.reject(err);
        return;
      }
      if (event.data.event === 'accountsChanged') {
        this.selectedAddress = event.data.payload?.accounts?.[0];
        this.emit('accountsChanged', event.data.payload?.accounts || []);
        return;
      }
      if (event.data.event === 'chainChanged') {
        this.chainId = event.data.payload?.chainId;
        this.emit('chainChanged', event.data.payload?.chainId);
        return;
      }
      if (event.data.event === 'connect') {
        this.emit('connect', event.data.payload || {});
        return;
      }
      if (event.data.event === 'disconnect') {
        this.emit('disconnect', event.data.payload || { code: 4900, message: 'Disconnected' });
      }
    });
  }

  private announce() {
    if (DEV_LOGS) console.info('[catshit-wallet][inject] eip6963 announced', { name: this.info.name, rdns: this.info.rdns, uuid: this.info.uuid });
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info: this.info, provider: this } }));
  }

  async request({ method, params }: { method: string; params?: any[] }) {
    const id = `catshit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    window.postMessage({ target: 'catshit-wallet-content', id, method, params }, '*');
    const result = await new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
      this.selectedAddress = Array.isArray(result) ? result[0] : undefined;
      this.emit('accountsChanged', result);
    }
    if (method === 'eth_chainId') {
      this.chainId = result as string;
    }
    if (method === 'wallet_switchEthereumChain') {
      const nextChainId = params?.[0]?.chainId;
      if (nextChainId) {
        this.chainId = nextChainId;
        this.emit('chainChanged', nextChainId);
      }
    }
    return result;
  }

  enable() {
    return this.request({ method: 'eth_requestAccounts' });
  }

  send(methodOrPayload: any, params?: any[]) {
    if (typeof methodOrPayload === 'string') return this.request({ method: methodOrPayload, params });
    return this.request({ method: methodOrPayload.method, params: methodOrPayload.params });
  }

  sendAsync(payload: any, callback: (error: any, response?: any) => void) {
    this.request({ method: payload.method, params: payload.params })
      .then((result) => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
      .catch((error) => callback(error));
  }

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  removeListener(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }
}

const provider = new CatshitProvider();
provider.providers = [provider];
const win = window as any;
const existing = win.ethereum;
if (existing?.providers && Array.isArray(existing.providers)) {
  if (!existing.providers.includes(provider)) existing.providers.push(provider);
} else if (existing) {
  existing.providers = [existing, provider];
} else {
  provider.providers = [provider];
  win.ethereum = provider;
}
win.catshitWallet = provider;
window.dispatchEvent(new Event('ethereum#initialized'));
