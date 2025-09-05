import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🔍 Verifying namehash calculation...");

  // Calculate namehash for "tales.eth"
  const calculatedNamehash = ethers.namehash("tales.eth");
  console.log("Calculated namehash for 'tales.eth':", calculatedNamehash);

  // Compare with your .env value
  const envNamehash = process.env.BASE_DOMAIN_NODE;
  console.log("Environment BASE_DOMAIN_NODE:", envNamehash);
  console.log("✅ Match?", calculatedNamehash === envNamehash);

  // Check if "eth" exists first
  const ethNamehash = ethers.namehash("eth");
  console.log("Namehash for 'eth':", ethNamehash);

  const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
  const ensRegistry = await ethers.getContractAt("IENSRegistry", ENS_REGISTRY);

  // Check if .eth root exists
  try {
    const ethOwner = await ensRegistry.owner(ethNamehash);
    console.log("Owner of .eth:", ethOwner);
  } catch (error) {
    console.log("❌ Error getting .eth owner:", error.message);
  }

  // Check if tales.eth exists
  try {
    const talesEthOwner = await ensRegistry.owner(calculatedNamehash);
    console.log("Owner of tales.eth:", talesEthOwner);
  } catch (error) {
    console.log("❌ tales.eth does not exist or cannot be resolved");
  }
}

main().catch(console.error);