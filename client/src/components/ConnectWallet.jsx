export default function ConnectWallet({ account, network, onConnect }) {
    const shortAddr = account
        ? `${account.slice(0, 6)}...${account.slice(-4)}`
        : null;

    const networkName = network
        ? (network.chainId === 80001 ? "Mumbai Testnet" : `Chain ${network.chainId}`)
        : null;

    return (
        <div className="connect-wallet">
            {account ? (
                <div className="wallet-info">
                    <div className="wallet-dot" />
                    <div>
                        <div className="wallet-address">{shortAddr}</div>
                        {networkName && <div className="wallet-network">{networkName}</div>}
                    </div>
                </div>
            ) : (
                <button className="btn-connect" onClick={onConnect}>
                    🦊 Connect MetaMask
                </button>
            )}
        </div>
    );
}
