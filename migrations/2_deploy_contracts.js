const ProjectRegistry = artifacts.require("ProjectRegistry");
const MilestoneManager = artifacts.require("MilestoneManager");
const PaymentVault = artifacts.require("PaymentVault");

module.exports = async function (deployer) {
    // 1. Deploy ProjectRegistry first — no dependencies
    await deployer.deploy(ProjectRegistry);
    const registry = await ProjectRegistry.deployed();
    console.log("ProjectRegistry deployed at:", registry.address);

    // 2. Deploy MilestoneManager — needs registry address
    await deployer.deploy(MilestoneManager, registry.address);
    const milestoneManager = await MilestoneManager.deployed();
    console.log("MilestoneManager deployed at:", milestoneManager.address);

    // 3. Deploy PaymentVault — needs both addresses
    await deployer.deploy(PaymentVault, registry.address, milestoneManager.address);
    const vault = await PaymentVault.deployed();
    console.log("PaymentVault deployed at:", vault.address);
};
