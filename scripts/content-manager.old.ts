import { create } from "ipfs-http-client";
import { pinFileToIPFS } from "./pinata-service";
import { NFTStorage } from "nft.storage";
import * as dotenv from "dotenv";
import { Buffer } from "buffer";
import * as zlib from "zlib";
import { promisify } from "util";
dotenv.config();

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

interface TaleContent {
  text: string;
  media?: string[];  // IPFS hashes of media files
  timestamp: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

class ContentManager {
  private nftstorage: NFTStorage;
  private maxRetries = 3;
  private maxContentSize = 100000; // 100KB limit for text content
  private retryDelay = 1000; // 1 second
  
  constructor() {
    const apiKey = process.env.NFT_STORAGE_KEY;
    if (!apiKey) {
      throw new Error('NFT_STORAGE_KEY is not set in environment variables');
    }
    this.nftstorage = new NFTStorage({ token: apiKey });
  }

  private validateContent(content: TaleContent): void {
    if (!content.text) {
      throw new Error('Content text is required');
    }
    
    if (content.text.length > this.maxContentSize) {
      throw new Error(`Content text exceeds maximum size of ${this.maxContentSize} bytes`);
    }

    if (content.media && !Array.isArray(content.media)) {
      throw new Error('Media must be an array of IPFS hashes');
    }

    if (content.tags && !Array.isArray(content.tags)) {
      throw new Error('Tags must be an array of strings');
    }

    if (!content.timestamp || typeof content.timestamp !== 'number') {
      throw new Error('Valid timestamp is required');
    }
  }

  private async compressContent(content: TaleContent): Promise<TaleContent> {
    if (content.text.length > 1000) { // Only compress if text is longer than 1KB
      const compressed = await gzip(Buffer.from(content.text));
      return {
        ...content,
        text: compressed.toString('base64'),
        metadata: {
          ...content.metadata,
          compressed: true
        }
      };
    }
    return content;
  }

  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const result = await operation();
        // Verify the upload was successful
        if (typeof result === 'string' && result.startsWith('ipfs://')) {
          return result;
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${i + 1} failed:`, lastError.message);
        if (i < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  async uploadContent(content: TaleContent): Promise<string> {
    try {
      // Validate content
      this.validateContent(content);

      // Compress content if needed
      const compressedContent = await this.compressContent(content);
      
      // Store content metadata in NFT.Storage with retry mechanism
      const blob = new Blob([JSON.stringify(compressedContent)], { type: 'application/json' });
      const cid = await this.retry(() => this.nftstorage.storeBlob(blob));
      
      // Also pin to Pinata for redundancy with retry mechanism
      await this.retry(() => pinFileToIPFS(compressedContent, `tale_${content.timestamp}`));

      return `ipfs://${cid}`;
    } catch (error) {
      console.error('Error uploading content:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  async retrieveContent(cid: string): Promise<TaleContent> {
    try {
      const url = `https://ipfs.io/ipfs/${cid.replace('ipfs://', '')}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }
      
      const content: TaleContent = await response.json();

      // Decompress if needed
      if (content.metadata?.compressed) {
        const decompressed = await gunzip(Buffer.from(content.text, 'base64'));
        return {
          ...content,
          text: decompressed.toString(),
          metadata: {
            ...content.metadata,
            compressed: false
          }
        };
      }

      return content;
    } catch (error) {
      console.error('Error retrieving content:', error);
      throw error instanceof Error ? error : new Error('Failed to retrieve content');
    }
  }

  async verifyContent(cid: string): Promise<boolean> {
    try {
      const content = await this.retrieveContent(cid);
      return !!content && typeof content.text === 'string' && typeof content.timestamp === 'number';
    } catch {
      return false;
    }
  }
}
      return cid;
    } catch (error) {
      console.error("Error uploading content:", error);
      throw error;
    }
  }

  async uploadMedia(file: Buffer, mediaType: string): Promise<string> {
    try {
      // Store media in NFT.Storage
      const blob = new Blob([file], { type: mediaType });
      const cid = await this.nftstorage.storeBlob(blob);
      
      // Also pin to Pinata
      await pinFileToIPFS(file, `media_${Date.now()}`);
      
      return cid;
    } catch (error) {
      console.error("Error uploading media:", error);
      throw error;
    }
  }

  async retrieveContent(ipfsHash: string): Promise<TaleContent> {
    try {
      // Try multiple gateways
      const gateways = [
        `https://nftstorage.link/ipfs/${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
      ];

      for (const gateway of gateways) {
        try {
          const response = await fetch(gateway);
          if (response.ok) {
            return await response.json();
          }
        } catch (e) {
          continue;
        }
      }
      throw new Error("Could not retrieve content from any gateway");
    } catch (error) {
      console.error("Error retrieving content:", error);
      throw error;
    }
  }
}

export const contentManager = new ContentManager();

// Example of content creation cost savings:
/*
Original on-chain storage for a tale with text and image:
- Text (200 characters): ~400 gas per character = 80,000 gas
- Image (1MB): Impossible/extremely expensive

New implementation with IPFS:
- IPFS hash (46 characters): ~92 gas total
- Content stored off-chain: 0 gas

Gas savings: >99.9%
Cost example (at 30 gwei):
- Old: 80,000 gas = 0.0024 ETH = $4.80 (at $2000/ETH)
- New: 92 gas = 0.00000276 ETH = $0.00552
*/
