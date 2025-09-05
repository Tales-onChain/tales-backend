import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🔍 Verifying ENS deployment on Base Sepolia...");

  const [user] = await ethers.getSigners();
  console.log("Checking for account:", user.address);

  // Your deployed contract address
  const CONTRACT_ADDRESS = "0xdE02c1B542E4DA5c11b418F933A3CE3CcBF7ED57";
  const userRegistry = await ethers.getContractAt("TalesUserRegistry", CONTRACT_ADDRESS);

  // ENS Registry address (same on all networks)
  const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
  const ensRegistry = await ethers.getContractAt("IENSRegistry", ENS_REGISTRY);

  // Check if user has a subname registered
  const userSubname = await userRegistry.userToSubname(user.address);
  console.log("User subname from contract:", userSubname);

  if (userSubname && userSubname !== "") {
    const fullDomain = `${userSubname}.tales.eth`;
    console.log("Full ENS domain:", fullDomain);

    // Calculate the namehash of the subdomain
    const namehash = ethers.namehash(fullDomain);
    console.log("Namehash:", namehash);

    // Check owner of the ENS name
    const owner = await ensRegistry.owner(namehash);
    console.log("ENS owner:", owner);
    console.log("✅ Correct owner?", owner.toLowerCase() === user.address.toLowerCase());

    // Check resolver
    const resolver = await ensRegistry.resolver(namehash);
    console.log("ENS resolver:", resolver);

    // Check if resolver has address record
    if (resolver !== ethers.ZeroAddress) {
      const ensResolver = await ethers.getContractAt("IENSResolver", resolver);
      try {
        const resolvedAddress = await ensResolver.addr(namehash);
        console.log("Resolved address:", resolvedAddress);
        console.log("✅ Correct resolution?", resolvedAddress.toLowerCase() === user.address.toLowerCase());
      } catch (error) {
        console.log("ℹ️ Could not resolve address (might be normal for new registration)");
      }
    }
  } else {
    console.log("❌ No subname found for this user");
  }
}

main().catch(console.error);