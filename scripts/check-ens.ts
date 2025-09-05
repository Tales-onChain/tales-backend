import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🔐 Checking ENS permissions...");

  const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
  const ensRegistry = await ethers.getContractAt("IENSRegistry", ENS_REGISTRY);
  
  const BASE_DOMAIN_NODE = "0x822c6cdaca03e7e96a197990a82a7b0fca56c42b0cec9a88d942545eb1ce98b2";
  
  // Check who owns the tales.eth domain
  const domainOwner = await ensRegistry.owner(BASE_DOMAIN_NODE);
  console.log("Owner of tales.eth:", domainOwner);
  
  const CONTRACT_ADDRESS = "0x2aB233a671037Bb5403FC9F570E868504a33F3db";
  console.log("Our contract address:", CONTRACT_ADDRESS);
  
  console.log("✅ Contract is domain owner?", domainOwner === CONTRACT_ADDRESS);
  
  // Check if contract has permissions
  const resolver = await ensRegistry.resolver(BASE_DOMAIN_NODE);
  console.log("Resolver for tales.eth:", resolver);
}

main().catch(console.error);