import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

interface GasEstimate {
  operation: string;
  gasUsed: string;
  costInEth: string;
  costInUSD: string;
  timestamp: string;
}

class GasEstimator {
  private async getGasPrice() {
    const provider = ethers.provider;
    return await provider.getGasPrice();
  }

  private async getEthPrice(): Promise<number> {
    // You can implement your own price feed here
    // For now, returning a fixed price
    return 2000; // USD
  }

  private formatGasEstimate(
    operation: string,
    gasUsed: BigNumber,
    gasPrice: BigNumber,
    ethPrice: number
  ): GasEstimate {
    const gasCostInEth = gasUsed.mul(gasPrice);
    const gasCostInUSD = Number(ethers.formatEther(gasCostInEth)) * ethPrice;

    return {
      operation,
      gasUsed: gasUsed.toString(),
      costInEth: ethers.formatEther(gasCostInEth),
      costInUSD: gasCostInUSD.toFixed(2),
      timestamp: new Date().toISOString()
    };
  }

  async estimateCreateTale(
    talesRegistryAddress: string,
    contentHash: string
  ): Promise<GasEstimate> {
    const talesRegistry = await ethers.getContractAt(
      "TalesRegistry",
      talesRegistryAddress
    );

    const gasEstimate = await talesRegistry.createTale.estimateGas(contentHash);
    const gasPrice = await this.getGasPrice();
    const ethPrice = await this.getEthPrice();

    return this.formatGasEstimate(
      "createTale",
      BigNumber.from(gasEstimate),
      gasPrice,
      ethPrice
    );
  }

  async estimateBatchCreateTales(
    talesRegistryAddress: string,
    contentHashes: string[]
  ): Promise<GasEstimate> {
    const talesRegistry = await ethers.getContractAt(
      "TalesRegistry",
      talesRegistryAddress
    );

    const gasEstimate = await talesRegistry.batchCreateTales.estimateGas(contentHashes);
    const gasPrice = await this.getGasPrice();
    const ethPrice = await this.getEthPrice();

    return this.formatGasEstimate(
      "batchCreateTales",
      BigNumber.from(gasEstimate),
      gasPrice,
      ethPrice
    );
  }

  async estimateAppreciateTale(
    talesRegistryAddress: string,
    taleId: number
  ): Promise<GasEstimate> {
    const talesRegistry = await ethers.getContractAt(
      "TalesRegistry",
      talesRegistryAddress
    );

    const gasEstimate = await talesRegistry.appreciateTale.estimateGas(taleId);
    const gasPrice = await this.getGasPrice();
    const ethPrice = await this.getEthPrice();

    return this.formatGasEstimate(
      "appreciateTale",
      BigNumber.from(gasEstimate),
      gasPrice,
      ethPrice
    );
  }

  async estimateBatchAppreciateTales(
    talesRegistryAddress: string,
    taleIds: number[]
  ): Promise<GasEstimate> {
    const talesRegistry = await ethers.getContractAt(
      "TalesRegistry",
      talesRegistryAddress
    );

    const gasEstimate = await talesRegistry.batchAppreciateTales.estimateGas(taleIds);
    const gasPrice = await this.getGasPrice();
    const ethPrice = await this.getEthPrice();

    return this.formatGasEstimate(
      "batchAppreciateTales",
      BigNumber.from(gasEstimate),
      gasPrice,
      ethPrice
    );
  }

  async compareOperations() {
    const [deployer] = await ethers.getSigners();
    let talesRegistry: string;

    try {
      // Try to read from deployment file
      const deployments = JSON.parse(
        require("fs").readFileSync("deployment-baseSepolia.json", "utf8")
      );
      talesRegistry = deployments.contracts.TalesRegistry.address;
    } catch (error) {
      console.log("⚠️ No deployment file found, deploying temporary contract for estimation...");
      
      // Deploy a temporary contract for estimation
      const TalesRegistry = await ethers.getContractFactory("TalesRegistry");
      const registry = await TalesRegistry.deploy();
      await registry.waitForDeployment();
      talesRegistry = await registry.getAddress();
      console.log("📝 Temporary TalesRegistry deployed at:", talesRegistry);
    
    // Compare single vs batch operations
    const singleCreate = await this.estimateCreateTale(talesRegistry, "QmTest");
    const batchCreate = await this.estimateBatchCreateTales(talesRegistry, Array(10).fill("QmTest"));
    
    const singleAppreciate = await this.estimateAppreciateTale(talesRegistry, 1);
    const batchAppreciate = await this.estimateBatchAppreciateTales(talesRegistry, [1,2,3,4,5]);
    
    console.log("\nGas Comparison Report");
    console.log("====================");
    console.log("\nCreate Tale:");
    console.log(`Single: ${singleCreate.costInUSD} USD`);
    console.log(`Batch (per tale): ${(Number(batchCreate.costInUSD) / 10).toFixed(2)} USD`);
    
    console.log("\nAppreciate Tale:");
    console.log(`Single: ${singleAppreciate.costInUSD} USD`);
    console.log(`Batch (per tale): ${(Number(batchAppreciate.costInUSD) / 5).toFixed(2)} USD`);
  }
}

  // Helper method to format savings
  private formatSavings(single: number, batch: number, batchSize: number): string {
    const singleTotal = single * batchSize;
    const savings = ((singleTotal - batch) / singleTotal * 100).toFixed(2);
    return `${savings}% savings compared to individual transactions`;
  }
}

// Create instance and export
const gasEstimator = new GasEstimator();

async function main() {
  console.log("🔍 Running gas estimations...");
  try {
    await gasEstimator.compareOperations();
  } catch (error: any) {
    console.error("❌ Error during gas estimation:", error?.message || "Unknown error");
    
    if (error?.code === "UNPREDICTABLE_GAS_LIMIT") {
      console.log("💡 Tip: This might be due to uninitialized contracts or missing dependencies");
    } else if (error?.code === "ENOENT") {
      console.log("💡 Tip: No deployment file found. Running estimation with temporary deployment.");
    } else {
      console.log("💡 Tip: Make sure you're connected to the Base Sepolia network and have sufficient funds.");
    }
  }
}

// Add command line arguments support
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(`
Gas Estimator Usage:
------------------
npx hardhat run scripts/gas-estimator.ts --network baseSepolia

Options:
  --help     Show this help message
  --verbose  Show detailed gas calculations
    `);
  } else {
    main().catch((error) => {
      console.error(error);
      process.exit(1);
    });
  }
}
