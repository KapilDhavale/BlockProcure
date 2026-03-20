require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Contract artifacts
const registryArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, 'build/contracts/ProjectRegistry.json'), 'utf8'));
const milestoneArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, 'build/contracts/MilestoneManager.json'), 'utf8'));
const vaultArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, 'build/contracts/PaymentVault.json'), 'utf8'));

async function main() {
    const provider = new ethers.providers.JsonRpcProvider("https://80002.rpc.thirdweb.com");
    const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC).connect(provider);

    console.log("-----------------------------------------");
    console.log("Deploying from:", wallet.address);
    console.log("Network: Amoy (80002)");
    console.log("-----------------------------------------");

    // 1. Deploy ProjectRegistry
    console.log("Deploying ProjectRegistry...");
    const Registry = new ethers.ContractFactory(registryArtifact.abi, registryArtifact.bytecode, wallet);
    const registry = await Registry.deploy();
    await registry.deployed();
    console.log("ProjectRegistry deployed at:", registry.address);

    // 2. Deploy MilestoneManager
    console.log("Deploying MilestoneManager...");
    const Milestone = new ethers.ContractFactory(milestoneArtifact.abi, milestoneArtifact.bytecode, wallet);
    const milestone = await Milestone.deploy(registry.address);
    await milestone.deployed();
    console.log("MilestoneManager deployed at:", milestone.address);

    // 3. Deploy PaymentVault
    console.log("Deploying PaymentVault...");
    const Vault = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, wallet);
    const vault = await Vault.deploy(registry.address, milestone.address);
    await vault.deployed();
    console.log("PaymentVault deployed at:", vault.address);

    console.log("-----------------------------------------");
    console.log("Deployment Complete!");
    console.log("Update client/src/config.js with these addresses.");
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
});
