import pinataSDK from '@pinata/sdk';
import * as dotenv from 'dotenv';
dotenv.config();

const pinata = new pinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_SECRET_API_KEY
);

export async function pinFileToIPFS(content: any, name: string) {
    try {
        const options = {
            pinataMetadata: {
                name,
                keyvalues: {
                    timestamp: Date.now().toString()
                }
            }
        };

        const result = await pinata.pinJSONToIPFS(content, options);
        return result.IpfsHash;
    } catch (error) {
        console.error('Error pinning to Pinata:', error);
        throw error;
    }
}

export async function pinMediaToIPFS(file: Buffer, name: string) {
    try {
        const options = {
            pinataMetadata: {
                name,
                keyvalues: {
                    timestamp: Date.now().toString()
                }
            }
        };

        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(file);
                controller.close();
            }
        });

        const result = await pinata.pinFileToIPFS(stream, options);
        return result.IpfsHash;
    } catch (error) {
        console.error('Error pinning media to Pinata:', error);
        throw error;
    }
}
