require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,        // Ganache default
      network_id: "*",
    },
    mumbai: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_KEY}`
      ),
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gas: 6000000,
      gasPrice: 10000000000,  // 10 gwei
    }
  },
  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: {
    polygonscan: process.env.POLYGONSCAN_API_KEY
  }
};
