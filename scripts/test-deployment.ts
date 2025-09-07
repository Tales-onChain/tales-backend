import { ethers } from "hardhat";
import * as fs from 'fs';

async function main() {
  console.log("🧪 Testing deployed contracts...");

  // Read deployment information
  const deploymentInfo = JSON.parse(fs.readFileSync('deployment-baseSepolia.json', 'utf8'));
  
  // Get contract instances
  const talesRegistry = await ethers.getContractAt(
    "TalesRegistry",
    deploymentInfo.contracts.TalesRegistry.address
  );
  
  const talesUserRegistry = await ethers.getContractAt(
    "TalesUserRegistry",
    deploymentInfo.contracts.TalesUserRegistry.address
  );

  console.log("\n📊 Contract Status:");
  console.log("TalesRegistry address:", await talesRegistry.getAddress());
  console.log("TalesUserRegistry address:", await talesUserRegistry.getAddress());

  // Test TalesRegistry
  console.log("\n🧪 Testing TalesRegistry...");
  const taleCount = await talesRegistry.taleCount();
  console.log("Current tale count:", taleCount.toString());

  // Create a test tale
  console.log("\n📝 Creating a test tale...");
  try {
    const tx = await talesRegistry.createTale("QmTestHash123");
    await tx.wait();
    console.log("✅ Test tale created successfully!");
    
    const newTaleCount = await talesRegistry.taleCount();
    console.log("New tale count:", newTaleCount.toString());

    // Get the tale details
    const tale = await talesRegistry.getTale(newTaleCount);
    console.log("\n📖 Tale details:");
    console.log("Author:", tale[0]);
    console.log("Content Hash:", tale[1]);
    console.log("Timestamp:", new Date(Number(tale[2]) * 1000).toISOString());
    console.log("Appreciation count:", tale[4].toString());
  } catch (error: any) {
    console.error("❌ Error creating tale:", error?.message || error);
  }

  // Test TalesUserRegistry
  console.log("\n🧪 Testing TalesUserRegistry...");
  try {
    const name = await talesUserRegistry.name();
    const symbol = await talesUserRegistry.symbol();
    console.log("NFT Name:", name);
    console.log("NFT Symbol:", symbol);
  } catch (error: any) {
    console.error("❌ Error getting NFT details:", error?.message || error);
  }

  console.log("\n✨ Test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
