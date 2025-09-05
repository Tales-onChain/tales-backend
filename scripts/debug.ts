import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Debugging contract name...");

  const CONTRACT_ADDRESS = "0x2aB233a671037Bb5403FC9F570E868504a33F3db";
  
  // Try different contract name variations
  const possibleNames = [
    "talesUserRegistry",
    "TalesUserRegistry", 
    "talesuserregistry",
    "Talesuserregistry"
  ];
  
  for (const name of possibleNames) {
    try {
      const contract = await ethers.getContractAt(name, CONTRACT_ADDRESS);
      const baseDomainNode = await contract.baseDomainNode();
      console.log(`✅ Contract name found: ${name}`);
      console.log(`   baseDomainNode: ${baseDomainNode}`);
      break;
    } catch (error) {
      console.log(`❌ Not ${name}: ${error.message}`);
    }
  }
}

main().catch(console.error);