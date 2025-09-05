import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking deployment status...");
  
  // Check if we have a deployment file
  const fs = require('fs');
  
  if (fs.existsSync('deployment-base-sepolia.json')) {
    const deployment = JSON.parse(fs.readFileSync('deployment-base-sepolia.json', 'utf8'));
    console.log("📄 Found deployment file:", deployment);
    
    if (deployment.contract?.TalesUserRegistry) {
      const address = deployment.contract.TalesUserRegistry;
      console.log("📋 Contract address from file:", address);
      
      // Check if contract exists
      const code = await ethers.provider.getCode(address);
      console.log("🔍 Contract exists at address:", code !== "0x" ? "✅ Yes" : "❌ No");
    }
  } else {
    console.log("📄 No deployment file found");
  }
}

main().catch(console.error);