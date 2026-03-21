// Update CONTRACT_ADDRESSES after: truffle migrate --network development
export const CONTRACT_ADDRESSES = {
    ProjectRegistry: "0xf16165f1046f1b3cdb37da25e835b986e696313a",
    MilestoneManager: "0xd13ebb5c39fb00c06122827e1cbd389930c9e0e3",
    PaymentVault: "0x8914a9e5c5e234fdc3ce9dc155ec19f43947ab59",
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
