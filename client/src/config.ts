// src/config.ts
//
// Contract addresses are loaded automatically from ./deployed-addresses.json
// which is written by migrations/2_deploy_contracts.js on every deploy.
//
// After every Ganache restart, just run:
//   truffle migrate --reset --network development
// Then refresh the browser. Never paste addresses manually again.

import deployed from './deployed_addresses.json'

export const CONTRACT_ADDRESSES = {
  ProjectRegistry:  deployed.ProjectRegistry,
  MilestoneManager: deployed.MilestoneManager,
  PaymentVault:     deployed.PaymentVault,
}

export const NETWORKS = {
  local: {
    chainId:        '0x539', // 1337
    chainName:      'Ganache Local',
    rpcUrls:        ['http://127.0.0.1:8545'],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  },
  amoy: {
    chainId:           '0x13882', // 80002
    chainName:         'Polygon Amoy',
    rpcUrls:           ['https://rpc-amoy.polygon.technology/'],
    blockExplorerUrls: ['https://amoy.polygonscan.com/'],
    nativeCurrency:    { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
}