import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🚀 Deploying TalesUserRegistry for talez.eth...");

  const [deployer] = await ethers.getSigners();
  console.log("📦 Deploying with account:", deployer.address);
  console.log("💼 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const RESOLVER_ADDRESS = process.env.ENS_RESOLVER!;
  const TALEZ_DOMAIN_NODE = process.env.BASE_DOMAIN_NODE!;

  console.log("🔧 Using resolver:", RESOLVER_ADDRESS);
  console.log("🔧 Using talez.eth namehash:", TALEZ_DOMAIN_NODE);

  // Deploy the contract
  const TalesUserRegistry = await ethers.getContractFactory("TalesUserRegistry");
  const userRegistry = await TalesUserRegistry.deploy(RESOLVER_ADDRESS, TALEZ_DOMAIN_NODE);
  
  console.log("⏳ Waiting for deployment...");
  await userRegistry.waitForDeployment();
  
  const contractAddress = await userRegistry.getAddress();
  console.log("✅ TalesUserRegistry deployed to:", contractAddress);

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "baseSepolia",
    timestamp: new Date().toISOString(),
    domain: "talez.eth",
    contract: {
      TalesUserRegistry: contractAddress,
      deployer: deployer.address,
      resolver: RESOLVER_ADDRESS,
      baseDomainNode: TALEZ_DOMAIN_NODE
    }
  };
  
  fs.writeFileSync('deployment-talez.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to deployment-talez.json");

  console.log("\n🎉 Deployment complete!");
  console.log("Next: Set contract as delegate for talez.eth in ENS app");
}

main().catch(console.error);