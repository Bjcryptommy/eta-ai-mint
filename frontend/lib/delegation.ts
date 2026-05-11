import { WalletClient, numberToHex, zeroAddress } from 'viem';

async function buildAuthorization(walletClient: WalletClient, wallet: `0x${string}`, contractAddress: `0x${string}`) {
  return walletClient.prepareAuthorization({
    account: wallet,
    contractAddress,
  });
}

async function ensureWalletReady(walletClient: WalletClient, wallet: `0x${string}`) {
  await (walletClient as any).request({ method: 'eth_requestAccounts' });

  if (walletClient.chain?.id) {
    try {
      await (walletClient as any).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: numberToHex(walletClient.chain.id) }],
      });
    } catch {
      // ignore switch failures here; send step will still surface a real error
    }
  }

  const accounts = (await (walletClient as any).request({ method: 'eth_accounts' })) as string[];
  const normalized = accounts.map((x) => x.toLowerCase());
  if (!normalized.includes(wallet.toLowerCase())) {
    throw new Error('Connected wallet does not match the selected account. Reconnect the correct MetaMask account and try again.');
  }
}

async function sendAuthorizationTx(walletClient: WalletClient, wallet: `0x${string}`, contractAddress: `0x${string}`) {
  await ensureWalletReady(walletClient, wallet);

  try {
    return (await (walletClient as any).request({ method: 'catshit_request7702', params: [{ delegate: contractAddress }] })) as `0x${string}`;
  } catch (error) {
    const message = error instanceof Error ? `${error.message} ${String((error as { details?: unknown }).details ?? '')}` : String(error);
    if (!/Method not found|does not exist|unsupported method/i.test(message)) {
      throw error;
    }
  }

  const authorization = await buildAuthorization(walletClient, wallet, contractAddress);
  const params = {
    from: wallet,
    to: wallet,
    value: '0x0',
    authorizationList: [authorization],
  };

  try {
    return (await (walletClient as any).request({ method: 'wallet_sendTransaction', params: [params] })) as `0x${string}`;
  } catch (error) {
    const message = error instanceof Error ? `${error.message} ${String((error as { details?: unknown }).details ?? '')}` : String(error);
    if (/Method not found|does not exist|unsupported method/i.test(message)) {
      return (await (walletClient as any).request({ method: 'eth_sendTransaction', params: [params] })) as `0x${string}`;
    }
    throw error;
  }
}

export async function activateDelegation(walletClient: WalletClient, wallet: `0x${string}`, delegateAddress: `0x${string}`) {
  return sendAuthorizationTx(walletClient, wallet, delegateAddress);
}

export async function revokeDelegation(walletClient: WalletClient, wallet: `0x${string}`) {
  return sendAuthorizationTx(walletClient, wallet, zeroAddress);
}
