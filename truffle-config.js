require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,        // Ganache default
      network_id: "*",
    },
    amoy: {
      provider: () => new HDWalletProvider({
        mnemonic: { phrase: process.env.MNEMONIC },
        providerOrUrl: `wss://polygon-amoy.infura.io/ws/v3/${process.env.INFURA_KEY}`,
        pollingInterval: 30000,
      }),
      network_id: 80002,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      networkCheckTimeout: 60000,
      websocket: true,     // Enable WebSocket support
      gas: 6000000,
      gasPrice: 25000000000, // 25 gwei
    },
    polygon: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY}`
      ),
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gasPrice: 100000000000, // 100 gwei
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
