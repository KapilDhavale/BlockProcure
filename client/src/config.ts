// Update CONTRACT_ADDRESSES after: truffle migrate --network development
export const CONTRACT_ADDRESSES = {
    ProjectRegistry: "0x0290FB167208Af455bB137780163b7B7a9a10C16",
    MilestoneManager: "0x9b1f7F645351AF3631a656421eD2e40f2802E6c0",
    PaymentVault: "0x67B5656d60a809915323Bf2C40A8bEF15A152e3e",
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
