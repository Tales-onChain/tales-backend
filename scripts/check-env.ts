import { config } from 'dotenv';
import { ethers } from 'ethers';
config();

interface EnvCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  validate?: (value: string) => boolean;
  message?: string;
}

const envChecks: EnvCheck[] = [
  {
    name: 'PRIVATE_KEY',
    value: process.env.PRIVATE_KEY,
    required: true,
    validate: (value) => /^[0-9a-fA-F]{64}$/.test(value),
    message: 'Must be a valid 64-character hexadecimal string'
  },
  {
    name: 'BASE_SEPOLIA_RPC_URL',
    value: process.env.BASE_SEPOLIA_RPC_URL,
    required: true,
    validate: (value) => value.startsWith('https://') && value.includes('alchemy.com'),
    message: 'Must be a valid Alchemy URL'
  },
  {
    name: 'ETHERSCAN_API_KEY',
    value: process.env.ETHERSCAN_API_KEY,
    required: true,
    validate: (value) => value.length === 34,
    message: 'Must be a valid 34-character Etherscan API key'
  },
  {
    name: 'PINATA_API_KEY',
    value: process.env.PINATA_API_KEY,
    required: true,
    validate: (value) => value.length >= 20,
    message: 'Must be a valid Pinata API key'
  },
  {
    name: 'PINATA_SECRET_API_KEY',
    value: process.env.PINATA_SECRET_API_KEY,
    required: true,
    validate: (value) => value.length >= 64,
    message: 'Must be a valid Pinata Secret API key'
  },
  {
    name: 'NFT_STORAGE_KEY',
    value: process.env.NFT_STORAGE_KEY,
    required: true,
    validate: (value) => value.startsWith('eyJ'),
    message: 'Must be a valid NFT.Storage API key'
  },

];

async function checkEnvironment() {
  console.log('🔍 Checking environment configuration...\n');
  
  let hasErrors = false;
  let missingRequired = false;

  for (const check of envChecks) {
    process.stdout.write(`Checking ${check.name}... `);
    
    if (!check.value) {
      if (check.required) {
        console.log('❌ Missing required value');
        missingRequired = true;
      } else {
        console.log('⚠️  Not set (optional)');
      }
      continue;
    }

    if (check.validate && !check.validate(check.value)) {
      console.log('❌ Invalid value');
      if (check.message) {
        console.log(`   ${check.message}`);
      }
      hasErrors = true;
    } else {
      const maskedValue = check.name.includes('KEY') || check.name === 'PRIVATE_KEY'
        ? `${check.value.slice(0, 4)}...${check.value.slice(-4)}`
        : check.value;
      console.log(`✅ ${maskedValue}`);
    }
  }

  if (missingRequired || hasErrors) {
    console.log('\n❌ Environment configuration is incomplete or invalid');
    console.log('Please check your .env file and ensure all required values are set correctly');
    process.exit(1);
  }

  console.log('\n✅ Environment configuration is valid');
}

// Check for duplicate entries
function checkDuplicates() {
  const content = require('fs').readFileSync('.env', 'utf8');
  const lines = content.split('\n');
  const vars = new Map();
  
  lines.forEach((line, index) => {
    if (line.trim() && !line.startsWith('#')) {
      const [key] = line.split('=');
      if (vars.has(key)) {
        console.log(`⚠️  Warning: Duplicate entry for ${key} at line ${index + 1}`);
        console.log(`   Previous definition at line ${vars.get(key)}`);
      }
      vars.set(key, index + 1);
    }
  });
}

async function main() {
  await checkEnvironment();
  checkDuplicates();
}

main().catch(console.error);
