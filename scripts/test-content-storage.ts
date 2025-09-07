import { ethers } from "hardhat";
import { contentManager } from "./content-manager";
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("🧪 Testing content storage with gas estimation...");

    // Get deployment info
    const deploymentInfo = JSON.parse(fs.readFileSync('deployment-baseSepolia.json', 'utf8'));
    const talesRegistry = await ethers.getContractAt(
        "TalesRegistry",
        deploymentInfo.contracts.TalesRegistry.address
    );

    // Example content
    const taleContent = {
        text: "This is a test tale with a longer text that would be expensive to store on-chain. " +
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
              "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        timestamp: Date.now(),
        tags: ["test", "example"]
    };

    console.log("\n📝 Content to store:");
    console.log("Text length:", taleContent.text.length, "characters");
    console.log("Estimated on-chain storage cost:", taleContent.text.length * 400, "gas");

    // Upload to IPFS
    console.log("\n📤 Uploading to IPFS...");
    const ipfsHash = await contentManager.uploadContent(taleContent);
    console.log("IPFS Hash:", ipfsHash);

    // Estimate gas for storing hash on-chain
    const gasEstimate = await talesRegistry.createTale.estimateGas(ipfsHash);
    console.log("\n⛽ Gas comparison:");
    console.log("Storing full content on-chain:", taleContent.text.length * 400, "gas");
    console.log("Storing IPFS hash on-chain:", gasEstimate.toString(), "gas");
    
    const savings = (1 - (Number(gasEstimate) / (taleContent.text.length * 400))) * 100;
    console.log(`Gas savings: ${savings.toFixed(2)}%`);

    // Create the tale
    console.log("\n📝 Creating tale on-chain...");
    const tx = await talesRegistry.createTale(ipfsHash);
    const receipt = await tx.wait();
    
    console.log("\n✅ Tale created!");
    console.log("Transaction hash:", receipt.hash);
    console.log("Actual gas used:", receipt.gasUsed.toString());

    // Retrieve and verify content
    console.log("\n🔍 Retrieving content from IPFS...");
    const retrievedContent = await contentManager.retrieveContent(ipfsHash);
    console.log("Retrieved content matches:", JSON.stringify(retrievedContent) === JSON.stringify(taleContent));
}

main().catch(console.error);
