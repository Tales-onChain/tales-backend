import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🚀 Deploying TalesUserRegistry...");

  const [deployer] = await ethers.getSigners();
  console.log("📦 Deploying with account:", deployer.address);
  console.log("💼 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy the contract
  const TalesUserRegistry = await ethers.getContractFactory("TalesUserRegistry");
  const userRegistry = await TalesUserRegistry.deploy();
  
  console.log("⏳ Waiting for deployment...");
  await userRegistry.waitForDeployment();
  
  const contractAddress = await userRegistry.getAddress();
  console.log("✅ TalesUserRegistry deployed to:", contractAddress);

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "baseSepolia",
    timestamp: new Date().toISOString(),
    contract: {
      TalesUserRegistry: contractAddress,
      deployer: deployer.address
    }
  };
  
  fs.writeFileSync('deployment-talez.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to deployment-talez.json");

  console.log("\n🎉 Deployment complete!");
}

main().catch(console.error);