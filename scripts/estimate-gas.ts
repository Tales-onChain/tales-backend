import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Estimating gas costs for various operations...\n");

  // Deploy contracts first
  const TalesRegistry = await ethers.getContractFactory("TalesRegistry");
  const TalesUserRegistry = await ethers.getContractFactory("TalesUserRegistry");

  console.log("📊 Deployment Gas Estimates:");
  console.log("----------------------------");

  const registryDeploy = await TalesRegistry.getDeployTransaction().then((tx: { data: string }) => 
    ethers.provider.estimateGas({
      data: tx.data,
      to: null
    })
  );
  console.log(`TalesRegistry Deployment: ${registryDeploy.toString()} gas`);

  const userRegistryDeploy = await TalesUserRegistry.getDeployTransaction().then((tx: { data: string }) =>
    ethers.provider.estimateGas({
      data: tx.data,
      to: null
    })
  );
  console.log(`TalesUserRegistry Deployment: ${userRegistryDeploy.toString()} gas\n`);

  // Deploy for operation estimates
  const registry = await TalesRegistry.deploy();
  const userRegistry = await TalesUserRegistry.deploy();

  console.log("📊 Operation Gas Estimates:");
  console.log("---------------------------");

  // Estimate tale creation
  const createTaleGas = await registry.createTale.estimateGas(
    "ipfs://QmTest12345"
  );
  console.log(`Create Tale: ${createTaleGas.toString()} gas`);

  // Estimate batch tale creation (3 tales)
  const batchCreateTaleGas = await registry.batchCreateTales.estimateGas(
    Array(3).fill("ipfs://QmTest12345")
  );
  console.log(`Batch Create 3 Tales: ${batchCreateTaleGas.toString()} gas`);

  // Estimate user registration
  const registerUserGas = await userRegistry.safeMint.estimateGas(
    ethers.ZeroAddress,
    "ipfs://QmTest12345"
  );
  console.log(`Register User: ${registerUserGas.toString()} gas`);

  // Estimate batch user registration (3 users)
  const batchRegisterGas = await userRegistry.batchMint.estimateGas(
    Array(3).fill(ethers.ZeroAddress),
    Array(3).fill("ipfs://QmTest12345")
  );
  console.log(`Batch Register 3 Users: ${batchRegisterGas.toString()} gas\n`);

  console.log("✨ Gas estimation complete!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
