import { formatEther, type Address, type Hex } from 'viem';
import type { ChainConfig } from './shared/chains';
import { getPublicClient, getWalletClient } from './rpc';

export async function estimateGasForTx(chain: ChainConfig, from: Address, to: Address, value: bigint, data?: Hex) {
  const client = getPublicClient(chain);
  const gas = await client.estimateGas({ account: from, to, value, data });
  const fees = await client.estimateFeesPerGas();
  const maxFeePerGas = fees.maxFeePerGas ?? fees.gasPrice ?? 0n;
  return {
    gas,
    fees,
    feeWei: gas * maxFeePerGas,
    feeFormatted: formatEther(gas * maxFeePerGas)
  };
}

export async function sendNativeTransaction(chain: ChainConfig, privateKey: Hex, to: Address, value: bigint, data?: Hex) {
  const walletClient = getWalletClient(chain, privateKey);
  return walletClient.sendTransaction({ account: walletClient.account!, to, value, data, chain: walletClient.chain });
}
