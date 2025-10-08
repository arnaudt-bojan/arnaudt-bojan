import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import { Metaplex, keypairIdentity, bundlrStorage } from "@metaplex-foundation/js";

const NETWORK = process.env.SOLANA_NETWORK || "devnet";
const RPC_ENDPOINT = process.env.SOLANA_RPC_URL || clusterApiUrl(NETWORK as any);

export interface NftMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  properties?: {
    category?: string;
    files?: Array<{ uri: string; type: string }>;
  };
}

export interface MintResult {
  mintAddress: string;
  transactionSignature: string;
  metadataUri: string;
}

export class SolanaService {
  private connection: Connection;
  private metaplex: Metaplex | null = null;
  private payer: Keypair | null = null;

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, "confirmed");
  }

  private initializeMetaplex() {
    if (!this.metaplex) {
      if (!process.env.SOLANA_PAYER_PRIVATE_KEY) {
        throw new Error(
          "SOLANA_PAYER_PRIVATE_KEY environment variable is not set. This wallet will pay for gas fees."
        );
      }

      try {
        const privateKeyArray = JSON.parse(process.env.SOLANA_PAYER_PRIVATE_KEY);
        this.payer = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
      } catch (error) {
        throw new Error(
          "Invalid SOLANA_PAYER_PRIVATE_KEY format. Expected JSON array of numbers."
        );
      }

      this.metaplex = Metaplex.make(this.connection)
        .use(keypairIdentity(this.payer))
        .use(
          bundlrStorage({
            address: "https://devnet.bundlr.network",
            providerUrl: RPC_ENDPOINT,
            timeout: 60000,
          })
        );
    }
  }

  async mintNFT(
    recipientAddress: string,
    metadata: NftMetadata
  ): Promise<MintResult> {
    try {
      this.initializeMetaplex();

      if (!this.metaplex) {
        throw new Error("Metaplex not initialized");
      }

      console.log("Uploading metadata to Arweave via Bundlr...");
      const { uri } = await this.metaplex.nfts().uploadMetadata(metadata);
      console.log("Metadata uploaded:", uri);

      console.log("Minting NFT to recipient:", recipientAddress);
      const recipient = new PublicKey(recipientAddress);

      const { nft } = await this.metaplex.nfts().create({
        uri,
        name: metadata.name,
        sellerFeeBasisPoints: 0,
        symbol: metadata.symbol || "UPSH",
        creators: [
          {
            address: this.payer!.publicKey,
            share: 100,
          },
        ],
        isMutable: false,
        tokenOwner: recipient,
      });

      console.log("NFT minted successfully!");
      console.log("Mint address:", nft.address.toString());
      console.log("Metadata URI:", uri);

      return {
        mintAddress: nft.address.toString(),
        transactionSignature: nft.mint.address.toString(),
        metadataUri: uri,
      };
    } catch (error: any) {
      console.error("NFT minting error:", error);
      throw new Error(`Failed to mint NFT: ${error.message}`);
    }
  }

  async getBalance(): Promise<number> {
    if (!this.payer) {
      this.initializeMetaplex();
    }
    if (!this.payer) {
      throw new Error("Payer wallet not initialized");
    }
    const balance = await this.connection.getBalance(this.payer.publicKey);
    return balance / 1e9;
  }

  getPayerAddress(): string {
    if (!this.payer) {
      this.initializeMetaplex();
    }
    if (!this.payer) {
      throw new Error("Payer wallet not initialized");
    }
    return this.payer.publicKey.toString();
  }
}

export const solanaService = new SolanaService();
