const MilestoneManager = artifacts.require("MilestoneManager");
const ProjectRegistry = artifacts.require("ProjectRegistry");

module.exports = async function (callback) {
    try {
        const mm = await MilestoneManager.deployed();
        const reg = await ProjectRegistry.deployed();

        const projectId = 1;
        const milestoneId = 1;
        const inspector2 = "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d";

        console.log("Checking Inspector 2 Role for Project 1...");
        const role = await reg.projectRoles(projectId, inspector2);
        console.log("Role ID (3 is INSPECTOR):", role.toString());

        console.log("\nChecking Milestone 1 State...");
        const state = await mm.getMilestoneState(projectId, milestoneId);
        console.log("State (1 is UNDER_REVIEW):", state.toString());

        console.log("\nTrying approval as Inspector 2...");
        const tx = await mm.approve(projectId, milestoneId, web3.utils.keccak256("debug-report"), { from: inspector2 });
        console.log("\n✓ SUCCESS: Application was NOT bugged, likely a MetaMask gas limit issue.");
        console.log("Transaction Hash:", tx.tx);

        callback();
    } catch (err) {
        console.error("\n✗ FAILURE REASON found:");
        console.error(err.message);
        callback(err);
    }
};
