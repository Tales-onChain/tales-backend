import { NFTStorage } from "nft.storage";
import { pinFileToIPFS } from "./pinata-service";
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
          const isValid = await this.verifyIPFS(result);
          if (!isValid) {
            throw new Error('Content verification failed');
          }
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

  private async verifyIPFS(ipfsUrl: string): Promise<boolean> {
    try {
      const cid = ipfsUrl.replace('ipfs://', '');
      const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
      return response.ok;
    } catch {
      return false;
    }
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

  async uploadMedia(file: Buffer, mediaType: string): Promise<string> {
    try {
      // Create a blob from the buffer
      const blob = new Blob([new Uint8Array(file).buffer], { type: mediaType });
      
      // Upload to NFT.Storage
      const cid = await this.retry(() => this.nftstorage.storeBlob(blob));
      
      // Pin to Pinata as well
      await this.retry(() => pinFileToIPFS(file, `media_${Date.now()}`));
      
      return `ipfs://${cid}`;
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error instanceof Error ? error : new Error('Failed to upload media');
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

  getContentGateways(ipfsHash: string): string[] {
    return [
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://nftstorage.link/ipfs/${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    ];
  }
}

export { ContentManager, TaleContent };
