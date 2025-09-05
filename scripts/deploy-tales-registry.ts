import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🚀 Deploying TalesRegistry...");

  const [deployer] = await ethers.getSigners();
  console.log("📦 Deploying with account:", deployer.address);
  console.log("💼 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy TalesRegistry
  const TalesRegistry = await ethers.getContractFactory("TalesRegistry");
  const talesRegistry = await TalesRegistry.deploy();
  
  await talesRegistry.waitForDeployment();
  const talesRegistryAddress = await talesRegistry.getAddress();
  
  console.log("✅ TalesRegistry deployed to:", talesRegistryAddress);
  console.log("Transaction hash:", talesRegistry.deploymentTransaction()?.hash);

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "baseSepolia",
    timestamp: new Date().toISOString(),
    contracts: {
      TalesRegistry: talesRegistryAddress,
      TalesUserRegistry: "0x2aB233a671037Bb5403FC9F570E868504a33F3db", // Your existing contract
      deployer: deployer.address
    }
  };
  
  fs.writeFileSync('deployment-tales-registry.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to deployment-tales-registry.json");

  console.log("\n🎉 TalesRegistry deployment complete!");
  console.log("Next: Deploy RewardManager and set up contract relationships");
}

main().catch(console.error);