// Update CONTRACT_ADDRESSES after: truffle migrate --network development
export const CONTRACT_ADDRESSES = {
    ProjectRegistry: '0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab',
    MilestoneManager: '0x5b1869D9A4C187F2EAa108f3062412ecf0526b24',
    PaymentVault: '0xCfEB869F69431e42cdB54A4F4f105C19C080A601',
}

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
