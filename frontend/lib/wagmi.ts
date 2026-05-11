import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { injected } from 'wagmi/connectors';
import { bsc, bscTestnet, mainnet, sepolia } from 'wagmi/chains';

declare global {
  interface Window {
    catshitWallet?: any;
    ethereum?: any;
  }
}

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111');
const chainMap = {
  1: mainnet,
  56: bsc,
  97: bscTestnet,
  11155111: sepolia,
} as const;

export const chain = chainMap[chainId as keyof typeof chainMap] || sepolia;

const CATSHIT_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="#0b1020"/>
  <path d="M66 21c9 0 16 8 16 18 0 2 0 4-1 6 13 6 22 18 22 33 0 21-17 38-39 38S25 99 25 78c0-15 9-28 23-34-1-2-2-4-2-7 0-10 8-16 20-16z" fill="#7c3aed" stroke="#00f5d4" stroke-width="6"/>
  <circle cx="50" cy="68" r="6" fill="#0b1020"/>
  <circle cx="78" cy="68" r="6" fill="#0b1020"/>
  <path d="M49 89c9 6 21 6 30 0" stroke="#0b1020" stroke-width="6" stroke-linecap="round" fill="none"/>
</svg>
`)}`;

function injectedProviders() {
  if (typeof window === 'undefined') return [];
  const providers = window.ethereum?.providers;
  if (Array.isArray(providers) && providers.length) return providers;
  return window.ethereum ? [window.ethereum] : [];
}

function getCatshitProvider() {
  if (typeof window === 'undefined') return undefined;
  return window.catshitWallet || injectedProviders().find((provider) => provider?.isCATSHITWallet || provider?.rdns === 'com.catshit.wallet');
}

function getMetaMaskProvider() {
  return injectedProviders().find((provider) => provider?.isMetaMask);
}

const catshitWallet = () => ({
  id: 'catshit-wallet',
  name: 'CATSHIT Wallet',
  rdns: 'com.catshit.wallet',
  iconUrl: CATSHIT_ICON,
  iconBackground: '#0b1020',
  installed: typeof window !== 'undefined' ? true : undefined,
  downloadUrls: {
    browserExtension: 'chrome://extensions',
  },
  createConnector: ({ rkDetails }: any) => injected({
    shimDisconnect: true,
    unstable_shimAsyncInject: 2000,
    target: {
      ...rkDetails,
      id: 'catshit-wallet',
      name: 'CATSHIT Wallet',
      provider: getCatshitProvider,
    },
  }),
});

const metaMaskWallet = () => ({
  id: 'metamask-fallback',
  name: 'MetaMask',
  iconUrl: CATSHIT_ICON,
  iconBackground: '#f6851b',
  installed: typeof window !== 'undefined' ? Boolean(getMetaMaskProvider()) : undefined,
  createConnector: ({ rkDetails }: any) => injected({
    shimDisconnect: true,
    target: {
      ...rkDetails,
      id: 'metaMask',
      name: 'MetaMask',
      provider: getMetaMaskProvider,
    },
  }),
});

export const wagmiConfig = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Catshit',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'replace_with_walletconnect_project_id',
  chains: [chain],
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [catshitWallet, metaMaskWallet],
    },
  ],
  multiInjectedProviderDiscovery: false,
  ssr: true,
});
