import { mnemonicToAccount } from 'viem/accounts';
import { normalizeMnemonicInput } from './utils';

export function validateRecoveryPhrase(value: string) {
  const normalized = normalizeMnemonicInput(value);
  const wordCount = normalized ? normalized.split(' ').filter(Boolean).length : 0;
  let valid = false;
  if ([12, 24].includes(wordCount)) {
    try {
      mnemonicToAccount(normalized);
      valid = true;
    } catch {
      valid = false;
    }
  }
  return { normalized, wordCount, valid };
}
