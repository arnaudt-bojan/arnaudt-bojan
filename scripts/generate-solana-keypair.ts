import { Keypair } from "@solana/web3.js";

console.log("Generating new Solana keypair for NFT minting...\n");

const keypair = Keypair.generate();
const publicKey = keypair.publicKey.toString();
const secretKeyArray = Array.from(keypair.secretKey);

console.log("✅ Keypair generated successfully!\n");
console.log("📍 Public Key (Wallet Address):");
console.log(publicKey);
console.log("\n🔑 Private Key (for SOLANA_PAYER_PRIVATE_KEY secret):");
console.log(JSON.stringify(secretKeyArray));
console.log("\n⚠️  IMPORTANT:");
console.log("1. Copy the private key array above (the long JSON array)");
console.log("2. Go to Replit Secrets and update SOLANA_PAYER_PRIVATE_KEY with this value");
console.log("3. Fund this wallet with devnet SOL for testing:");
console.log(`   Visit: https://faucet.solana.com/`);
console.log(`   Paste this address: ${publicKey}`);
console.log("4. Each NFT mint costs ~0.01-0.02 SOL in gas fees");
console.log("\n💡 This wallet will pay gas fees for all NFT mints on behalf of your users.");
