const ProjectRegistry = artifacts.require("ProjectRegistry");
const MilestoneManager = artifacts.require("MilestoneManager");
const PaymentVault = artifacts.require("PaymentVault");

module.exports = async function (deployer, network, accounts) {
  console.log("\n========================================");
  console.log("  BlockProcure — Deploying Contracts");
  console.log("  Network:", network);
  console.log("  Deployer:", accounts[0]);
  console.log("========================================\n");

  // 1. Deploy ProjectRegistry — no dependencies
  await deployer.deploy(ProjectRegistry);
  const registry = await ProjectRegistry.deployed();
  console.log("✓ ProjectRegistry deployed at:", registry.address);

  // 2. Deploy MilestoneManager — needs ProjectRegistry address
  await deployer.deploy(MilestoneManager, registry.address);
  const milestoneManager = await MilestoneManager.deployed();
  console.log("✓ MilestoneManager deployed at:", milestoneManager.address);

  // 3. Deploy PaymentVault — needs both addresses
  await deployer.deploy(PaymentVault, registry.address, milestoneManager.address);
  const vault = await PaymentVault.deployed();
  console.log("✓ PaymentVault deployed at:", vault.address);

  console.log("\n========================================");
  console.log("  All contracts deployed successfully");
  console.log("========================================");
  console.log("  ProjectRegistry  :", registry.address);
  console.log("  MilestoneManager :", milestoneManager.address);
  console.log("  PaymentVault     :", vault.address);
  console.log("========================================\n");

  // Save addresses to console for easy copy into frontend config.js
  console.log("Paste these into client/src/config.js:");
  console.log(`
export const CONTRACT_ADDRESSES = {
  ProjectRegistry:  "${registry.address}",
  MilestoneManager: "${milestoneManager.address}",
  PaymentVault:     "${vault.address}",
};
  `);
};