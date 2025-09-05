import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🚀 Proper deployment of TalesUserRegistry to Base Sepolia...");

  const [deployer] = await ethers.getSigners();
  console.log("📦 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💼 Account balance:", ethers.formatEther(balance), "ETH");

  // Check if we have enough gas
  if (balance < ethers.parseEther("0.001")) {
    console.log("❌ Insufficient balance for deployment. Get more test ETH from faucet.");
    return;
  }

  const RESOLVER_ADDRESS = process.env.ENS_RESOLVER!;
  const BASE_DOMAIN_NODE = process.env.BASE_DOMAIN_NODE!;

  console.log("🔧 Using resolver:", RESOLVER_ADDRESS);
  console.log("🔧 Using base domain node:", BASE_DOMAIN_NODE);

  try {
    // Deploy the contract with proper error handling
    console.log("⏳ Deploying contract...");
    const TalesUserRegistry = await ethers.getContractFactory("TalesUserRegistry");
    const userRegistry = await TalesUserRegistry.deploy(RESOLVER_ADDRESS, BASE_DOMAIN_NODE);
    
    // Wait for deployment to complete
    console.log("⏳ Waiting for deployment transaction...");
    await userRegistry.waitForDeployment();
    
    // Get the actual address
    const contractAddress = await userRegistry.getAddress();
    console.log("✅ TalesUserRegistry deployed to:", contractAddress);
    
    // Verify the deployment
    const code = await ethers.provider.getCode(contractAddress);
    console.log("📋 Contract code deployed:", code !== "0x" ? "✅ Success" : "❌ Failed");
    
    if (code !== "0x") {
      // Test basic functionality
      const domainNode = await userRegistry.baseDomainNode();
      console.log("🔍 baseDomainNode:", domainNode);
      
      const owner = await userRegistry.owner();
      console.log("👑 Contract owner:", owner);
      
      // Save deployment info
      const fs = require('fs');
      const deploymentInfo = {
        network: "baseSepolia",
        timestamp: new Date().toISOString(),
        contract: {
          TalesUserRegistry: contractAddress,
          deployer: deployer.address,
          resolver: RESOLVER_ADDRESS,
          baseDomainNode: BASE_DOMAIN_NODE,
          transactionHash: userRegistry.deploymentTransaction()?.hash
        }
      };
      
      fs.writeFileSync('deployment-success.json', JSON.stringify(deploymentInfo, null, 2));
      console.log("💾 Deployment info saved to deployment-success.json");
      
      console.log("🎉 Deployment completed successfully!");
    } else {
      console.log("❌ Contract deployment failed - no code at address");
    }

  } catch (error) {
    console.log("❌ Deployment error:", error.message);
    
    if (error.transactionHash) {
      console.log("📄 Transaction hash:", error.transactionHash);
      console.log("🔍 Check transaction on BaseScan for details");
    }
  }
}

main().catch(console.error);