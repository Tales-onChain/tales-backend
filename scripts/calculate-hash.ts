import { ethers } from "ethers";
import { writeFileSync } from "fs";

async function main() {
  console.log("🔢 Calculating namehash for talez.eth...");

  // Calculate namehash for the new domain
  const newNamehash = ethers.namehash("talez.eth");
  console.log("Namehash for 'talez.eth':", newNamehash);

  // Update .env file
  const envPath = '.env';
  let envContent = require('fs').existsSync(envPath) 
    ? require('fs').readFileSync(envPath, 'utf8') 
    : '';

  // Remove old BASE_DOMAIN_NODE if it exists
  envContent = envContent.replace(/BASE_DOMAIN_NODE=.*\n/g, '');
  
  // Add new BASE_DOMAIN_NODE
  envContent += `BASE_DOMAIN_NODE=${newNamehash}\n`;
  
  writeFileSync(envPath, envContent);
  console.log(`💾 Updated .env file with: BASE_DOMAIN_NODE=${newNamehash}`);
}

main().catch(console.error);