import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { create } from "ipfs-http-client";
import { readFileSync } from "fs";
import { basename } from "path";
dotenv.config();

interface BatchUploadResult {
  cids: string[];
  urls: string[];
  timestamp: string;
}

class BatchOperationsManager {
  private readonly ipfs: any;
  private readonly pinataApiKey: string;
  private readonly pinataSecretKey: string;

  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY || "";
    this.pinataSecretKey = process.env.PINATA_SECRET_API_KEY || "";
    
    // Initialize IPFS client (you can use Infura or other providers)
    this.ipfs = create({
      host: "ipfs.infura.io",
      port: 5001,
      protocol: "https",
    });
  }

  async batchUploadToIPFS(filePaths: string[]): Promise<BatchUploadResult> {
    console.log("📦 Starting batch upload to IPFS...");
    const results: BatchUploadResult = {
      cids: [],
      urls: [],
      timestamp: new Date().toISOString()
    };

    for (const filePath of filePaths) {
      try {
        const fileData = readFileSync(filePath);
        const fileName = basename(filePath);
        
        // Upload to IPFS
        const added = await this.ipfs.add({
          path: fileName,
          content: fileData
        });

        results.cids.push(added.cid.toString());
        results.urls.push(`https://ipfs.io/ipfs/${added.cid.toString()}`);
        
        console.log(`✅ Uploaded ${fileName} to IPFS:`, added.cid.toString());
      } catch (error) {
        console.error(`❌ Failed to upload ${filePath}:`, error);
      }
    }

    return results;
  }

  async batchCreateTales(
    talesRegistryAddress: string,
    contentHashes: string[]
  ) {
    console.log("🚀 Creating tales in batch...");
    
    const talesRegistry = await ethers.getContractAt(
      "TalesRegistry",
      talesRegistryAddress
    );

    try {
      const tx = await talesRegistry.batchCreateTales(contentHashes);
      const receipt = await tx.wait();
      console.log("✅ Batch tales creation successful!");
      
      // Parse events to get tale IDs
      const taleIds = receipt.events
        ?.filter((e: any) => e.event === "TaleCreated")
        .map((e: any) => e.args.taleId);
      
      console.log("📝 Created tale IDs:", taleIds);
      return taleIds;
    } catch (error) {
      console.error("❌ Failed to create tales:", error);
      throw error;
    }
  }

  async batchAppreciateTales(
    talesRegistryAddress: string,
    taleIds: number[]
  ) {
    console.log("👍 Appreciating tales in batch...");
    
    const talesRegistry = await ethers.getContractAt(
      "TalesRegistry",
      talesRegistryAddress
    );

    try {
      const tx = await talesRegistry.batchAppreciateTales(taleIds);
      await tx.wait();
      console.log("✅ Batch appreciation successful!");
    } catch (error) {
      console.error("❌ Failed to appreciate tales:", error);
      throw error;
    }
  }

  async batchMintUsers(
    userRegistryAddress: string,
    addresses: string[],
    uris: string[]
  ) {
    console.log("🎨 Minting user NFTs in batch...");
    
    const userRegistry = await ethers.getContractAt(
      "TalesUserRegistry",
      userRegistryAddress
    );

    try {
      const tx = await userRegistry.batchMint(addresses, uris);
      const receipt = await tx.wait();
      console.log("✅ Batch minting successful!");
      
      // Parse events to get token IDs
      const tokenIds = receipt.events
        ?.filter((e: any) => e.event === "BatchMinted")
        .map((e: any) => e.args.tokenIds);
      
      console.log("🎫 Minted token IDs:", tokenIds);
      return tokenIds;
    } catch (error) {
      console.error("❌ Failed to mint NFTs:", error);
      throw error;
    }
  }
}

export const batchManager = new BatchOperationsManager();

// Example usage
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Example: Batch upload files to IPFS
  const filePaths = [
    // Add your file paths here
  ];
  const uploadResults = await batchManager.batchUploadToIPFS(filePaths);
  console.log("Upload results:", uploadResults);

  // Add more batch operations as needed
}

if (require.main === module) {
  main().catch(console.error);
}
