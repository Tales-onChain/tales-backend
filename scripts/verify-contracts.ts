import { run } from "hardhat";
import * as fs from 'fs';

async function main() {
  console.log("🔍 Starting contract verification...");

  try {
    // Read deployment information
    const deploymentInfo = JSON.parse(fs.readFileSync('deployment-baseSepolia.json', 'utf8'));
    
    // Verify TalesRegistry
    console.log("\n🔎 Verifying TalesRegistry...");
    try {
      await run("verify:verify", {
        address: deploymentInfo.contracts.TalesRegistry.address,
        constructorArguments: []
      });
      console.log("✅ TalesRegistry verified successfully!");
    } catch (error: any) {
      if (error?.message?.includes("Already Verified")) {
        console.log("✅ TalesRegistry already verified!");
      } else {
        console.error("❌ TalesRegistry verification failed:", error?.message || error);
      }
    }

    // Verify TalesUserRegistry
    console.log("\n🔎 Verifying TalesUserRegistry...");
    try {
      await run("verify:verify", {
        address: deploymentInfo.contracts.TalesUserRegistry.address,
        constructorArguments: []
      });
      console.log("✅ TalesUserRegistry verified successfully!");
    } catch (error: any) {
      if (error?.message?.includes("Already Verified")) {
        console.log("✅ TalesUserRegistry already verified!");
      } else {
        console.error("❌ TalesUserRegistry verification failed:", error?.message || error);
      }
    }

  } catch (error: any) {
    console.error("❌ Verification process failed:", error?.message || error);
    console.log("\n💡 Make sure you:");
    console.log("1. Have set the correct ETHERSCAN_API_KEY in your .env file");
    console.log("2. Are using a Base Sepolia API key from https://basescan.org/apis");
    console.log("3. Wait a few minutes after deployment before verifying");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
