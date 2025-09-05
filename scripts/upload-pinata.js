const { ethers } = require("hardhat");
const { readFileSync, existsSync } = require("fs");
const pinataSDK = require('@pinata/sdk');
const { Readable } = require('stream'); // Import Stream
const path = require("path");
require("dotenv").config();

// Helper function to convert Buffer to Stream
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

async function main() {
  console.log("Uploading image and metadata to Pinata...");

  // 1. Check if API keys are set
  if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_API_KEY) {
    throw new Error("Pinata API keys are missing from .env file");
  }

  // 2. Load your image file
  const imagePath = path.join(__dirname, "..", "images", "404-page_not_found.png");
  
  if (!existsSync(imagePath)) {
    throw new Error(`Image file not found at: ${imagePath}`);
  }

  const imageData = readFileSync(imagePath);
  console.log(`Image size: ${(imageData.length / 1024 / 1024).toFixed(2)} MB`);

  try {
    // 3. Upload image to Pinata - Convert Buffer to Stream
    console.log("Uploading image to Pinata...");
    const imageStream = bufferToStream(imageData);
    const imageResult = await pinata.pinFileToIPFS(imageStream, {
      pinataMetadata: { 
        name: "404-page_not_found.png",
        keyvalues: {
          project: "tales-social",
          type: "nft-image"
        }
      }
    });
    const imageUrl = `https://ipfs.io/ipfs/${imageResult.IpfsHash}`;
    console.log("✅ Image uploaded! CID:", imageResult.IpfsHash);
    console.log("Image URL:", imageUrl);

    // 4. Create and upload metadata
    const metadata = {
      name: "My Awesome NFT",
      description: "An NFT stored on IPFS using Pinata!",
      image: imageUrl,
      attributes: [
        { trait_type: "Coolness", value: "100" },
        { trait_type: "Developer", value: "Awesome" },
      ],
    };

    console.log("Uploading metadata to Pinata...");
    const metadataResult = await pinata.pinJSONToIPFS(metadata, {
      pinataMetadata: { 
        name: "metadata.json",
        keyvalues: {
          project: "tales-social",
          type: "nft-metadata"
        }
      }
    });
    
    const metadataUri = `ipfs://${metadataResult.IpfsHash}`;
    console.log("✅ Metadata uploaded! CID:", metadataResult.IpfsHash);
    console.log("Metadata URI:", metadataUri);

    // 5. Deploy and mint NFT
    console.log("Deploying NFT contract...");
    const MyNFT = await ethers.getContractFactory("MyNFT");
    const myNft = await MyNFT.deploy();
    await myNft.deployed();
    console.log("NFT contract deployed to:", myNft.address);

    console.log("Minting NFT...");
    const mintTx = await myNft.safeMint(await ethers.provider.getSigner().getAddress(), metadataUri);
    await mintTx.wait();
    console.log("✅ NFT minted successfully!");

    console.log("\n🎉 All done! Your NFT is now live!");
    console.log("View your NFT on OpenSea:");
    console.log(`https://testnets.opensea.io/assets/base-sepolia/${myNft.address}/0`);

  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Error details:", error.response.data);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });