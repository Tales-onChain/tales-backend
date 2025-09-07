import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
dotenv.config();

interface DeploymentConfig {
  name: string;
  args?: any[];
  verify?: boolean;
  initialize?: boolean;
}

interface DeploymentResult {
  address: string;
  deploymentHash: string;
  timestamp: string;
}

class DeploymentManager {
  private deployments: Record<string, DeploymentResult> = {};
  private readonly networkName: string;
  private readonly deployer: string;

  constructor(networkName: string, deployer: string) {
    this.networkName = networkName;
    this.deployer = deployer;
  }

  async checkBalance(estimatedGas: bigint): Promise<boolean> {
    const [signer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(signer.address);
    const gasPrice = await ethers.provider.getFeeData();
    const estimatedCost = estimatedGas * (gasPrice.gasPrice || 0n);
    
    console.log(`\n💰 Account Balance: ${ethers.formatEther(balance)} ETH`);
    console.log(`💸 Estimated deployment cost: ${ethers.formatEther(estimatedCost)} ETH\n`);
    
    return balance > estimatedCost;
  }

  async deployContract(config: DeploymentConfig): Promise<DeploymentResult> {
    console.log(`🚀 Preparing to deploy ${config.name}...`);

    try {
      const factory = await ethers.getContractFactory(config.name);
      
      // Estimate gas before deploying
      const deploymentGas = await factory.getDeployTransaction(...(config.args || [])).then(tx => 
        ethers.provider.estimateGas(tx)
      );

      // Check if we have enough balance
      const hasEnoughBalance = await this.checkBalance(deploymentGas);
      if (!hasEnoughBalance) {
        throw new Error(
          `Insufficient funds for deployment. Please fund your account with Base Sepolia ETH.\n` +
          `You can get Base Sepolia ETH from:\n` +
          `1. Base Sepolia Faucet: https://www.coinbase.com/faucets/base-sepolia-faucet\n` +
          `2. Sepolia Faucet: https://sepoliafaucet.com/\n` +
          `   Then bridge to Base: https://bridge.base.org/deposit`
        );
      }

      console.log(`✨ Deploying ${config.name}...`);
      const contract = await factory.deploy(...(config.args || []));
      await contract.waitForDeployment();

      const address = await contract.getAddress();
      const result: DeploymentResult = {
        address,
        deploymentHash: contract.deploymentTransaction()?.hash || "",
        timestamp: new Date().toISOString()
      };

      this.deployments[config.name] = result;
      console.log(`✅ ${config.name} deployed to:`, address);

      // Save deployment info after each successful deployment
      this.saveDeployments();

      return result;
    } catch (error) {
      console.error(`❌ Failed to deploy ${config.name}:`, error);
      throw error;
    }
  }

  private saveDeployments() {
    const deploymentInfo = {
      network: this.networkName,
      deployer: this.deployer,
      timestamp: new Date().toISOString(),
      contracts: this.deployments
    };

    writeFileSync(
      `deployment-${this.networkName}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`💾 Deployment info saved to deployment-${this.networkName}.json`);
  }

  async verifyContracts() {
    console.log("🔍 Verifying contracts...");
    for (const [name, deployment] of Object.entries(this.deployments)) {
      try {
        await this.verifyContract(name, deployment.address);
      } catch (error) {
        console.warn(`⚠️ Failed to verify ${name}:`, error);
      }
    }
  }

  private async verifyContract(name: string, address: string) {
    try {
      const hre = require("hardhat");
      await hre.run("verify:verify", {
        address,
        constructorArguments: [],
      });
      console.log(`✅ ${name} verified successfully`);
    } catch (error: any) {
      if (error?.message?.includes("Already Verified")) {
        console.log(`✅ ${name} already verified`);
      } else {
        console.warn(`⚠️ Verification failed for ${name}:`, error?.message || error);
      }
    }
  }

  async suggestNextSteps() {
    console.log("\n🎯 Next steps:");
    console.log("1. Check your contract on Base Sepolia Explorer");
    console.log("2. Test the deployment with scripts/check-deployment.ts");
    console.log("3. Set up any additional contract configurations");
    console.log("\n💡 Need Base Sepolia ETH?");
    console.log("• Base Sepolia Faucet: https://www.coinbase.com/faucets/base-sepolia-faucet");
    console.log("• Bridge from Sepolia: https://bridge.base.org/deposit");
  }
}

export async function deployAll() {
  console.log("📦 Starting deployment process...");

  const [deployer] = await ethers.getSigners();
  console.log("🔑 Deploying with account:", deployer.address);
  console.log(
    "💼 Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const manager = new DeploymentManager("baseSepolia", deployer.address);

  // Deploy contracts in sequence
  const talesRegistry = await manager.deployContract({ name: "TalesRegistry" });
  const talesUserRegistry = await manager.deployContract({ name: "TalesUserRegistry" });

  // Initialize contracts if needed
  const registry = await ethers.getContractAt("TalesRegistry", talesRegistry.address);
  await registry.setUserRegistry(talesUserRegistry.address);

  // Verify contracts if on a supported network
  await manager.verifyContracts();

  console.log("🎉 All deployments completed successfully!");
}

if (require.main === module) {
  deployAll().catch(console.error);
}
