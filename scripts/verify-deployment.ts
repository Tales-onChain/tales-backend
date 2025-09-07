import { ethers } from "hardhat";
import { verifyContract } from "./verify-utils";

async function main() {
  console.log("⚙️ Running contract verification...");

  try {
    const deploymentData = require("../deployment-tales-registry.json");
    
    console.log("📋 Verifying TalesRegistry...");
    await verifyContract(deploymentData.contracts.TalesRegistry);
    
    console.log("📋 Verifying TalesUserRegistry...");
    await verifyContract(deploymentData.contracts.TalesUserRegistry);
    
    console.log("✅ All contracts verified successfully!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
