export function delegatedStorageKey(address?: string) {
  return address ? `catshit:delegated:${address.toLowerCase()}` : null;
}

export function signedInStorageKey(address?: string) {
  return address ? `catshit:signed-in:${address.toLowerCase()}` : null;
}

export function readDelegatedOverride(address?: string): boolean | null {
  if (typeof window === 'undefined') return null;
  const key = delegatedStorageKey(address);
  if (!key) return null;
  const value = window.localStorage.getItem(key);
  if (value === '1') return true;
  if (value === '0') return false;
  return null;
}

export function writeDelegatedOverride(address: string | undefined, delegated: boolean) {
  if (typeof window === 'undefined' || !address) return;
  const key = delegatedStorageKey(address);
  if (!key) return;
  window.localStorage.setItem(key, delegated ? '1' : '0');
}

export function readSignedIn(address?: string): boolean {
  if (typeof window === 'undefined') return false;
  const key = signedInStorageKey(address);
  return Boolean(key && window.localStorage.getItem(key) === '1');
}

export function writeSignedIn(address: string | undefined, signedIn: boolean) {
  if (typeof window === 'undefined' || !address) return;
  const key = signedInStorageKey(address);
  if (!key) return;
  window.localStorage.setItem(key, signedIn ? '1' : '0');
}
