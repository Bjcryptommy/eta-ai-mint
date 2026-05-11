import { createWallet, decryptVault, encryptVault } from '../walletStore';
import { parseDelegationFromCode } from '../eip7702';

(async function run() {
  const vault = { mnemonic: 'test test test test test test test test test test test junk', accounts: [], importedPrivateKeys: [] };
  const encrypted = await encryptVault('password123', vault as any);
  const decrypted = await decryptVault('password123', encrypted.encryptedVault, encrypted.salt, encrypted.iv);
  console.log('vault encryption ok', decrypted.mnemonic === vault.mnemonic);
  console.log('delegation parser ok', parseDelegationFromCode('0xef0100000000000000000000000000000000000000000000').state);
})();
