// Update these after running: truffle migrate --network mumbai
export const CONTRACT_ADDRESSES = {
    ProjectRegistry: "0x0000000000000000000000000000000000000000",
    MilestoneManager: "0x0000000000000000000000000000000000000000",
    PaymentVault: "0x0000000000000000000000000000000000000000",
};

export const NETWORK = {
    chainId: "0x13881",   // Mumbai = 80001 in hex
    chainName: "Polygon Mumbai Testnet",
    rpcUrls: ["https://rpc-mumbai.maticvigil.com/"],
    blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 }
};
