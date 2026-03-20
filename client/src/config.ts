// Update CONTRACT_ADDRESSES after: truffle migrate --network development
export const CONTRACT_ADDRESSES = {
    ProjectRegistry: "0x0E696947A06550DEf604e82C26fd9E493e576337",
    MilestoneManager: "0xDb56f2e9369E0D7bD191099125a3f6C370F8ed15",
    PaymentVault: "0xA94B7f0465E98609391C623d0560C5720a3f2D33",
};

export const NETWORKS = {
    local: {
        chainId: '0x539', // 1337
        chainName: 'Ganache Local',
        rpcUrls: ['http://127.0.0.1:7545'],
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    },
    amoy: {
        chainId: '0x13882', // 80002
        chainName: 'Polygon Amoy',
        rpcUrls: ['https://rpc-amoy.polygon.technology/'],
        blockExplorerUrls: ['https://amoy.polygonscan.com/'],
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    },
}
