const ProjectRegistry = artifacts.require("ProjectRegistry");
const MilestoneManager = artifacts.require("MilestoneManager");
const PaymentVault = artifacts.require("PaymentVault");

contract("BlockProcure", (accounts) => {
    const gov = accounts[0];
    const contractor = accounts[1];
    const inspector1 = accounts[2];
    const inspector2 = accounts[3];
    const supplier = accounts[4];

    let registry, milestoneManager, vault;

    before(async () => {
        registry = await ProjectRegistry.deployed();
        milestoneManager = await MilestoneManager.deployed();
        vault = await PaymentVault.deployed();
    });

    it("should create a project", async () => {
        await registry.createProject(
            "Road Construction Phase 1",
            web3.utils.toWei("1", "ether"),
            contractor,
            [inspector1, inspector2],
            2,    // require both inspectors
            { from: gov }
        );
        const project = await registry.getProject(1);
        assert.equal(project.name, "Road Construction Phase 1");
        assert.equal(project.contractor, contractor);
    });

    it("should lock funds in vault", async () => {
        await vault.lockFunds(1, {
            from: gov,
            value: web3.utils.toWei("1", "ether")
        });
        const balance = await vault.getBalance();
        assert.equal(balance.toString(), web3.utils.toWei("1", "ether"));
    });

    it("should create a milestone", async () => {
        await milestoneManager.createMilestone(
            1, "Foundation complete", web3.utils.toWei("0.5", "ether"),
            { from: gov }
        );
        const state = await milestoneManager.getMilestoneState(1, 1);
        assert.equal(state.toString(), "0"); // PENDING
    });

    it("should let contractor submit claim", async () => {
        const evidenceHash = web3.utils.keccak256("evidence-document-cid-hash");
        await milestoneManager.submitClaim(1, 1, evidenceHash, { from: contractor });
        const state = await milestoneManager.getMilestoneState(1, 1);
        assert.equal(state.toString(), "1"); // UNDER_REVIEW
    });

    it("should not release payment with only 1 approval (requires 2)", async () => {
        const reportHash = web3.utils.keccak256("inspector1-report");
        await milestoneManager.approve(1, 1, reportHash, { from: inspector1 });
        const state = await milestoneManager.getMilestoneState(1, 1);
        assert.equal(state.toString(), "1"); // Still UNDER_REVIEW
    });

    it("should reach APPROVED state after 2nd inspector approves", async () => {
        const reportHash = web3.utils.keccak256("inspector2-report");
        await milestoneManager.approve(1, 1, reportHash, { from: inspector2 });
        const state = await milestoneManager.getMilestoneState(1, 1);
        assert.equal(state.toString(), "2"); // APPROVED
    });

    it("should auto-release payment to contractor", async () => {
        const balanceBefore = BigInt(await web3.eth.getBalance(contractor));
        await vault.release(1, 1, { from: gov });
        const balanceAfter = BigInt(await web3.eth.getBalance(contractor));
        assert(balanceAfter > balanceBefore, "Contractor should have received payment");
    });

    it("should reject duplicate invoice hash", async () => {
        await registry.assignRole(1, supplier, 4, { from: gov }); // Role.SUPPLIER = 4
        const invoiceHash = web3.utils.keccak256("invoice-pdf-content-hash");
        await vault.logInvoice(1, invoiceHash, { from: supplier });
        try {
            await vault.logInvoice(1, invoiceHash, { from: supplier });
            assert.fail("Should have reverted on duplicate");
        } catch (e) {
            assert(e.message.includes("duplicate"), "Expected duplicate error");
        }
    });
});
