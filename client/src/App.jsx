import { useState, useEffect } from "react";
import { ethers } from "ethers";
import ConnectWallet from "./components/ConnectWallet";
import GovPanel from "./components/GovPanel";
import ContractorPanel from "./components/ContractorPanel";
import InspectorPanel from "./components/InspectorPanel";
import AuditLog from "./components/AuditLog";
import { CONTRACT_ADDRESSES, NETWORK } from "./config";
import RegistryABI from "./abis/ProjectRegistry.json";
import MilestoneABI from "./abis/MilestoneManager.json";
import VaultABI from "./abis/PaymentVault.json";
import "./App.css";

function App() {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [account, setAccount] = useState(null);
    const [contracts, setContracts] = useState(null);
    const [activeTab, setActiveTab] = useState("gov");
    const [network, setNetwork] = useState(null);

    const connect = async () => {
        if (!window.ethereum) return alert("Please install MetaMask");
        await window.ethereum.request({ method: "eth_requestAccounts" });

        // Switch to Mumbai if needed
        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: NETWORK.chainId }],
            });
        } catch {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [NETWORK],
            });
        }

        const _provider = new ethers.providers.Web3Provider(window.ethereum);
        const _signer = _provider.getSigner();
        const _account = await _signer.getAddress();
        const _network = await _provider.getNetwork();

        const registry = new ethers.Contract(CONTRACT_ADDRESSES.ProjectRegistry, RegistryABI.abi, _signer);
        const milestone = new ethers.Contract(CONTRACT_ADDRESSES.MilestoneManager, MilestoneABI.abi, _signer);
        const vault = new ethers.Contract(CONTRACT_ADDRESSES.PaymentVault, VaultABI.abi, _signer);

        setProvider(_provider);
        setSigner(_signer);
        setAccount(_account);
        setNetwork(_network);
        setContracts({ registry, milestone, vault });
    };

    // Listen for account/network changes
    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", () => window.location.reload());
            window.ethereum.on("chainChanged", () => window.location.reload());
        }
    }, []);

    const tabs = [
        { id: "gov", label: "🏛️ Government" },
        { id: "contractor", label: "🏗️ Contractor" },
        { id: "inspector", label: "🔍 Inspector" },
        { id: "audit", label: "📋 Audit Log" },
    ];

    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="header-inner">
                    <div className="logo">
                        <span className="logo-icon">⛓️</span>
                        <div>
                            <h1 className="logo-title">BlockProcure</h1>
                            <p className="logo-sub">Transparent Infrastructure Payments on Polygon</p>
                        </div>
                    </div>
                    <ConnectWallet account={account} network={network} onConnect={connect} />
                </div>
            </header>

            {/* Main Content */}
            <main className="app-main">
                {!account ? (
                    <div className="hero">
                        <div className="hero-content">
                            <div className="hero-badge">🚀 Hackathon Build · Polygon Mumbai</div>
                            <h2 className="hero-title">
                                Replace <span className="highlight">corrupt middlemen</span> with
                                <br />47 lines of Solidity
                            </h2>
                            <p className="hero-desc">
                                Milestone payments are released automatically when M-of-N inspectors sign on-chain.
                                Every document hash is permanent. Duplicate invoices are rejected instantly.
                            </p>
                            <div className="hero-stats">
                                <div className="stat">
                                    <span className="stat-num">3</span>
                                    <span className="stat-label">Smart Contracts</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-num">M-of-N</span>
                                    <span className="stat-label">Multisig Approval</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-num">&lt;₹0.01</span>
                                    <span className="stat-label">Per Transaction</span>
                                </div>
                            </div>
                            <button className="btn-hero" onClick={connect}>
                                Connect MetaMask to Start
                            </button>
                        </div>
                        <div className="hero-flow">
                            {[
                                { icon: "🏛️", label: "Government", desc: "Creates project & locks funds" },
                                { icon: "↓", label: "", desc: "" },
                                { icon: "🏗️", label: "Contractor", desc: "Submits milestone claim" },
                                { icon: "↓", label: "", desc: "" },
                                { icon: "🔍", label: "Inspectors", desc: "M-of-N approve on-chain" },
                                { icon: "↓", label: "", desc: "" },
                                { icon: "💸", label: "Auto-Payment", desc: "MATIC releases to contractor" },
                            ].map((item, i) => (
                                item.icon === "↓"
                                    ? <div key={i} className="flow-arrow">↓</div>
                                    : <div key={i} className="flow-step">
                                        <span className="flow-icon">{item.icon}</span>
                                        <div>
                                            <strong>{item.label}</strong>
                                            <p>{item.desc}</p>
                                        </div>
                                    </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="dashboard">
                        {/* Tab Navigation */}
                        <nav className="tab-nav">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        {/* Panel Content */}
                        <div className="panel-container">
                            {activeTab === "gov" && <GovPanel contracts={contracts} account={account} />}
                            {activeTab === "contractor" && <ContractorPanel contracts={contracts} account={account} />}
                            {activeTab === "inspector" && <InspectorPanel contracts={contracts} account={account} />}
                            {activeTab === "audit" && <AuditLog contracts={contracts} provider={provider} />}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="app-footer">
                <p>BlockProcure — Built for Nexus 2026 Hackathon · Polygon Mumbai Testnet · Smart contracts open-source on Polygonscan</p>
            </footer>
        </div>
    );
}

export default App;
