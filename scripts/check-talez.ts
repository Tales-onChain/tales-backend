import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🔍 Checking talez.eth availability...");

  const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
  const ensRegistry = await ethers.getContractAt("IENSRegistry", ENS_REGISTRY);

  // Calculate namehash for talez.eth
  const talezNamehash = ethers.namehash("talez.eth");
  console.log("Namehash for talez.eth:", talezNamehash);

  try {
    // Check if talez.eth is registered by seeing if it has an owner
    const owner = await ensRegistry.owner(talezNamehash);
    
    if (owner === ethers.ZeroAddress) {
      console.log("✅ talez.eth is AVAILABLE for registration!");
      console.log("\n🔗 Register it at: https://app.ens.domains/name/talez.eth");
    } else {
      console.log("❌ talez.eth is already REGISTERED");
      console.log("Current owner:", owner);
      console.log("\n💡 Try these alternative names instead:");
      console.log("   - talezapp.eth");
      console.log("   - talesocial.eth");
      console.log("   - talezworld.eth");
      console.log("   - talezafrica.eth");
      console.log("   - mytalez.eth");
    }
  } catch (error) {
    console.log("❌ Error checking talez.eth:", error.message);
    console.log("This usually means the domain doesn't exist yet");
    console.log("You can try to register it anyway at: https://app.ens.domains/name/talez.eth");
  }

  // Also check a few other domains to see what's available
  console.log("\n🔍 Checking alternative domains...");
  
  const alternatives = [
    "talezapp.eth",
    "talesocial.eth", 
    "talezworld.eth",
    "talezafrica.eth",
    "mytalez.eth"
  ];

  for (const domain of alternatives) {
    try {
      const namehash = ethers.namehash(domain);
      const owner = await ensRegistry.owner(namehash);
      
      if (owner === ethers.ZeroAddress) {
        console.log(`   ✅ ${domain} - AVAILABLE`);
      } else {
        console.log(`   ❌ ${domain} - TAKEN`);
      }
    } catch (error) {
      console.log(`   ❓ ${domain} - ERROR checking`);
    }
  }
}

main().catch(console.error);