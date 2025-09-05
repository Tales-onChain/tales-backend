const pinataSDK = require('@pinata/sdk');
const { Readable } = require('stream'); // Import Stream
require('dotenv').config();

// Helper function to convert Buffer to Stream
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

async function testPinata() {
  try {
    console.log('Testing Pinata connection...');
    
    const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);
    
    // Test authentication
    const auth = await pinata.testAuthentication();
    console.log('✅ Authentication successful!');
    console.log('User:', auth.authenticated);
    
    // Test with a small file - convert Buffer to Stream
    const testFile = Buffer.from('Hello from Hardhat!');
    const readableStream = bufferToStream(testFile);
    
    const result = await pinata.pinFileToIPFS(readableStream, {
      pinataMetadata: { name: 'test.txt' }
    });
    
    console.log('✅ File uploaded successfully!');
    console.log('CID:', result.IpfsHash);
    console.log('URL: https://ipfs.io/ipfs/' + result.IpfsHash);
    
  } catch (error) {
    console.error('❌ Pinata test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    }
  }
}

testPinata();