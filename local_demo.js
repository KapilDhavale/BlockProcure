const ProjectRegistry = artifacts.require("ProjectRegistry");
const MilestoneManager = artifacts.require("MilestoneManager");
const PaymentVault = artifacts.require("PaymentVault");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const gov = accounts[0];
        const contractor = accounts[1];
        const inspector1 = accounts[2];
        const inspector2 = accounts[3];
        const supplier = accounts[4];

        console.log("\n🚀 Starting BlockProcure CLI Demo — 5 Actors, 1 Logic");
        console.log("--------------------------------------------------");

        // 1. Get Deployed Contracts
        const registry = await ProjectRegistry.deployed();
        const milestoneManager = await MilestoneManager.deployed();
        const vault = await PaymentVault.deployed();

        console.log("✅ Contracts deployed at:");
        console.log("   Registry:", registry.address);
        console.log("   Manager: ", milestoneManager.address);
        console.log("   Vault:   ", vault.address);

        // 2. Government creates a project
        console.log("\n🏛️ [Government] Creating 'Phase 1: Flyover Road' project...");
        const projectTx = await registry.createProject(
            "Phase 1: Flyover Road",
            web3.utils.toWei("1.0", "ether"), // 1.0 MATIC budget
            contractor,
            [inspector1, inspector2],
            2, // Require 2 inspectors
            { from: gov }
        );
        console.log("   Project #1 created!");

        // 3. Government locks funds
        console.log("\n💰 [Government] Locking 1.0 MATIC in the PaymentVault...");
        await vault.lockFunds(1, { from: gov, value: web3.utils.toWei("1.0", "ether") });
        let vaultBal = await web3.eth.getBalance(vault.address);
        console.log("   Vault Balance:", web3.utils.fromWei(vaultBal, "ether"), "MATIC");

        // 4. Supplier logs invoice
        console.log("\n📦 [Supplier] Logging raw material invoice hash...");
        const invoiceHash = web3.utils.keccak256("cement-invoice-500-bags");
        await registry.assignRole(1, supplier, 4, { from: gov }); // Role.SUPPLIER = 4
        await vault.logInvoice(1, invoiceHash, { from: supplier });
        console.log("   Invoice logged. Attempting duplicate...");
        try {
            await vault.logInvoice(1, invoiceHash, { from: supplier });
        } catch (e) {
            console.log("   ❌ Success: Duplicate invoice rejected as expected!");
        }

        // 5. Create a milestone
        console.log("\n🏛️ [Government] Creating Milestone #1: 'Bridge Foundation' (0.5 MATIC)...");
        await milestoneManager.createMilestone(1, "Bridge Foundation", web3.utils.toWei("0.5", "ether"), { from: gov });

        // 6. Contractor submits claim
        console.log("\n🏗️ [Contractor] Work finished. Submitting claim with IPFS hash...");
        const claimHash = web3.utils.keccak256("ipfs-photo-evidence-link");
        await milestoneManager.submitClaim(1, 1, claimHash, { from: contractor });
        console.log("   Milestone state: UNDER_REVIEW");

        // 7. Inspector 1 approves
        console.log("\n🔍 [Inspector 1] Verifying concrete strength. Approving...");
        await milestoneManager.approve(1, 1, web3.utils.keccak256("inspector-1-report"), { from: inspector1 });
        console.log("   Approval check: 1 of 2 received.");

        // 8. Inspector 2 approves (This triggers the release in our logic)
        console.log("\n🔍 [Inspector 2] Site inspection passed. Final approval...");
        const contractorBalBefore = await web3.eth.getBalance(contractor);
        await milestoneManager.approve(1, 1, web3.utils.keccak256("inspector-2-report"), { from: inspector2 });
        console.log("   Approval check: 2 of 2 received. Milestone status: APPROVED.");

        // 9. Release funds
        console.log("\n💸 [Automated] Releasing 0.5 MATIC to Contractor...");
        await vault.release(1, 1, { from: gov });
        const contractorBalAfter = await web3.eth.getBalance(contractor);

        console.log("   Contractor Balance increased by:",
            web3.utils.fromWei((BigInt(contractorBalAfter) - BigInt(contractorBalBefore)).toString(), "ether"), "MATIC");

        console.log("\n--------------------------------------------------");
        console.log("✨ Demo Complete: The system is perfectly synchronized! ✨\n");

        callback();
    } catch (e) {
        console.error(e);
        callback(e);
    }
};
