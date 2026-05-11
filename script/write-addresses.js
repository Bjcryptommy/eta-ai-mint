import fs from 'node:fs';
import path from 'node:path';

const [network, tokenAddress, delegateAddress] = process.argv.slice(2);
if (!network || !tokenAddress || !delegateAddress) {
  console.error('usage: node script/write-addresses.js <network> <tokenAddress> <delegateAddress>');
  process.exit(1);
}

const file = path.resolve('config', `${network}.json`);
const current = JSON.parse(fs.readFileSync(file, 'utf8'));
current.token.address = tokenAddress;
current.mintDelegate.address = delegateAddress;
fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
console.log(`updated ${file}`);
