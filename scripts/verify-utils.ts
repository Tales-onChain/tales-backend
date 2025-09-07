import { run } from "hardhat";

export async function verifyContract(address: string, constructorArguments: any[] = []) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments
    });
    console.log(`✅ Contract at ${address} verified successfully`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already verified")) {
      console.log(`ℹ️ Contract at ${address} is already verified`);
    } else {
      throw error;
    }
  }
}
