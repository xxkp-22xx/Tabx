const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config(); // Optional if using .env

const PRIVATE_KEY = "2c31c263f0756512c9fb0b9b2cd743471eb5f27a61aec52fa787b3be37d55f77";
const ALCHEMY_API_KEY = "z6NNqSmkLhhrkX20SErRPXmm-odCqNyN"; // e.g. 'xyz123'

module.exports = {
  networks: {
    sepolia: {
      provider: () =>
        new HDWalletProvider(
          PRIVATE_KEY,
          `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
        ),
      network_id: 11155111,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    development: {
      host: "127.0.0.1",
      port: 7545, // Ganache GUI
      network_id: "*"
    }
  },

  compilers: {
    solc: {
      version: "0.8.0"
    }
  }
};