import { bytesToHex } from 'viem';

export const STORAGE_KEY = 'catshit-wallet-state';
export const SESSION_KEY = 'catshit-wallet-session';

export function shortAddress(value?: string | null) {
  if (!value) return '—';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function uid(prefix = 'req') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function hexRandom(bytes = 16) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function toBase64(data: Uint8Array) {
  return btoa(String.fromCharCode(...data));
}

export function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export function normalizeMnemonicInput(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeChainId(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return Number.NaN;
    if (trimmed.startsWith('0x')) return parseInt(trimmed, 16);
    return Number(trimmed);
  }
  return Number.NaN;
}

export function toHexChainId(value: number) {
  return `0x${value.toString(16)}`;
}

export function toDecimalChainId(value: unknown) {
  return normalizeChainId(value);
}

export async function copyText(text: string) {
  if (!text) throw new Error('Nothing to copy');
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn('Clipboard API copy failed');
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!success) throw new Error('Copy failed');
  return true;
}
