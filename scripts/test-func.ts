import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🧪 Testing TalesUserRegistry functionality...");

  const CONTRACT_ADDRESS = "0x2aB233a671037Bb5403FC9F570E868504a33F3db";
  const userRegistry = await ethers.getContractAt("TalesUserRegistry", CONTRACT_ADDRESS); // ← FIXED THIS LINE
  
  const [user] = await ethers.getSigners();
  console.log("Testing with account:", user.address);

  // Test 1: Check contract basics
  console.log("\n1. 📋 Checking contract basics...");
  
  const owner = await userRegistry.owner();
  console.log("Contract owner:", owner);
  console.log("✅ Is caller the owner?", owner === user.address);

  // Test 2: Check initial subname state
  console.log("\n2. 🔍 Checking initial subname state...");
  const userSubname = await userRegistry.userToSubname(user.address);
  console.log("Initial user subname:", userSubname || "None");

  // Test 3: Check if a test subname is available
  console.log("\n3. 📊 Checking subname availability...");
  const testSubname = "testuser" + Date.now().toString().slice(-4);
  const isClaimed = await userRegistry.isSubnameClaimed(testSubname);
  console.log(`Subname "${testSubname}" is claimed:`, isClaimed);

  // Test 4: Claim a subname
  console.log("\n4. 🎯 Claiming a subname...");
  console.log("Attempting to claim:", testSubname);

  try {
    const tx = await userRegistry.claimSubname(testSubname);
    console.log("⏳ Waiting for transaction...");
    const receipt = await tx.wait();
    console.log("✅ Subname claimed! TX hash:", receipt.hash);

    // Verify the claim
    const newSubname = await userRegistry.userToSubname(user.address);
    console.log("Verified subname:", newSubname);
    console.log("✅ Claim successful!");

  } catch (error) {
    console.log("❌ Error claiming subname:", error.message);
    if (error.transactionHash) {
      console.log("Transaction hash:", error.transactionHash);
    }
    return;
  }

  console.log("\n🎉 TalesUserRegistry tests completed successfully!");
}

main().catch(console.error);