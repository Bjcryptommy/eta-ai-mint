import type { ConnectedSite } from './shared/types';
import type { Address } from 'viem';

export function allowSite(connectedSites: ConnectedSite[], origin: string, accounts: Address[]) {
  const existing = connectedSites.find((site) => site.origin === origin);
  if (existing) {
    existing.accounts = accounts;
    return [...connectedSites];
  }
  return [...connectedSites, { origin, accounts, connectedAt: Date.now() }];
}

export function revokeSite(connectedSites: ConnectedSite[], origin: string) {
  return connectedSites.filter((site) => site.origin !== origin);
}

export function isSiteAllowed(connectedSites: ConnectedSite[], origin: string) {
  return connectedSites.some((site) => site.origin === origin);
}
