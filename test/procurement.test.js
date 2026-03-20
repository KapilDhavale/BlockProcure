/**
 * procurement.test.js — Full test suite for BlockProcure contracts
 *
 * Covers:
 *   - Project creation and role assignment
 *   - Fund locking in PaymentVault
 *   - Supplier invoice logging + duplicate rejection
 *   - Milestone creation
 *   - Contractor claim submission
 *   - M-of-N inspector approval flow
 *   - Auto payment release after threshold
 *   - All access control checks (wrong role rejections)
 *   - Double release protection
 *   - State machine transitions
 *
 * Usage:
 *   truffle test                          (uses development network)
 *   truffle test --network development
 */

const ProjectRegistry = artifacts.require("ProjectRegistry");
const MilestoneManager = artifacts.require("MilestoneManager");
const PaymentVault = artifacts.require("PaymentVault");

const { assert } = require("chai");

// Helpers
const toWei = (n) => web3.utils.toWei(n.toString(), "ether");
const keccak = (s) => web3.utils.keccak256(s);
const expectRevert = async (promise, msg) => {
    try {
        await promise;
        assert.fail("Expected revert but did not revert");
    } catch (e) {
        if (msg) {
            assert(
                e.message.toLowerCase().includes(msg.toLowerCase()),
                `Expected revert with "${msg}" but got: ${e.message}`
            );
        }
    }
};

contract("BlockProcure — Full Test Suite", (accounts) => {
    const gov = accounts[0];
    const contractor = accounts[1];
    const inspector1 = accounts[2];
    const inspector2 = accounts[3];
    const supplier = accounts[4];
    const stranger = accounts[5]; // unauthorized account

    let registry, milestoneManager, vault;
    let projectId, milestoneId;

    // ── Deploy fresh contracts before all tests ────────────
    before(async () => {
        registry = await ProjectRegistry.new({ from: gov });
        milestoneManager = await MilestoneManager.new(registry.address, { from: gov });
        vault = await PaymentVault.new(
            registry.address,
            milestoneManager.address,
            { from: gov }
        );
    });

    // ════════════════════════════════════════════════════════
    //  SECTION 1 — ProjectRegistry
    // ════════════════════════════════════════════════════════
    describe("ProjectRegistry", () => {

        it("should create a project and emit ProjectCreated event", async () => {
            const tx = await registry.createProject(
                "NH-48 Road Widening",
                toWei(1),
                contractor,
                [inspector1, inspector2],
                2,
                { from: gov }
            );

            const event = tx.logs.find(l => l.event === "ProjectCreated");
            assert.ok(event, "ProjectCreated event not emitted");

            projectId = event.args.projectId.toString();
            assert.equal(event.args.name, "NH-48 Road Widening");
            assert.equal(event.args.contractor, contractor);
        });

        it("should store project data correctly", async () => {
            const project = await registry.getProject(projectId);
            assert.equal(project.name, "NH-48 Road Widening");
            assert.equal(project.contractor, contractor);
            assert.equal(project.requiredApprovals.toString(), "2");
            assert.equal(project.active, true);
        });

        it("should assign GOVERNMENT role to creator", async () => {
            const role = await registry.projectRoles(projectId, gov);
            assert.equal(role.toString(), "1"); // Role.GOVERNMENT = 1
        });

        it("should assign CONTRACTOR role to contractor", async () => {
            const role = await registry.projectRoles(projectId, contractor);
            assert.equal(role.toString(), "2"); // Role.CONTRACTOR = 2
        });

        it("should assign INSPECTOR role to both inspectors", async () => {
            const role1 = await registry.projectRoles(projectId, inspector1);
            const role2 = await registry.projectRoles(projectId, inspector2);
            assert.equal(role1.toString(), "3"); // Role.INSPECTOR = 3
            assert.equal(role2.toString(), "3");
        });

        it("should return correct inspector list", async () => {
            const inspectors = await registry.getInspectors(projectId);
            assert.equal(inspectors[0], inspector1);
            assert.equal(inspectors[1], inspector2);
        });

        it("should reject project creation with 0 required approvals", async () => {
            await expectRevert(
                registry.createProject("Bad Project", toWei(1), contractor,
                    [inspector1], 0, { from: gov }),
                "Need at least 1 approval"
            );
        });

        it("should reject if required approvals exceed inspector count", async () => {
            await expectRevert(
                registry.createProject("Bad Project", toWei(1), contractor,
                    [inspector1], 3, { from: gov }),
                "Required approvals exceeds inspector count"
            );
        });

        it("should allow government to assign supplier role", async () => {
            await registry.assignRole(projectId, supplier, 4, { from: gov }); // 4 = SUPPLIER
            const role = await registry.projectRoles(projectId, supplier);
            assert.equal(role.toString(), "4");
        });

        it("should reject role assignment from non-government account", async () => {
            await expectRevert(
                registry.assignRole(projectId, stranger, 4, { from: stranger }),
                "Only government"
            );
        });

    });

    // ════════════════════════════════════════════════════════
    //  SECTION 2 — PaymentVault — lockFunds + logInvoice
    // ════════════════════════════════════════════════════════
    describe("PaymentVault — fund locking", () => {

        it("should lock funds when called by government with MATIC", async () => {
            const tx = await vault.lockFunds(projectId, {
                from: gov,
                value: toWei(1),
            });
            const event = tx.logs.find(l => l.event === "FundsLocked");
            assert.ok(event, "FundsLocked event not emitted");
            assert.equal(event.args.projectId.toString(), projectId);
        });

        it("should reflect correct vault balance after locking", async () => {
            const balance = await vault.getBalance();
            assert.equal(balance.toString(), toWei(1));
        });

        it("should reject lockFunds from non-government account", async () => {
            await expectRevert(
                vault.lockFunds(projectId, { from: stranger, value: toWei(1) }),
                "Only government can lock funds"
            );
        });

        it("should reject lockFunds with 0 value", async () => {
            await expectRevert(
                vault.lockFunds(projectId, { from: gov, value: 0 }),
                "Must send MATIC"
            );
        });

    });

    describe("PaymentVault — invoice logging", () => {
        const invoiceHash = keccak("Invoice_Cement_50MT_Batch032");

        it("should log an invoice hash from supplier", async () => {
            const tx = await vault.logInvoice(projectId, invoiceHash, { from: supplier });
            const event = tx.logs.find(l => l.event === "InvoiceLogged");
            assert.ok(event, "InvoiceLogged event not emitted");
            assert.equal(event.args.invoiceHash, invoiceHash);
            assert.equal(event.args.supplier, supplier);
        });

        it("should reject duplicate invoice hash submission", async () => {
            await expectRevert(
                vault.logInvoice(projectId, invoiceHash, { from: supplier }),
                "duplicate detected"
            );
        });

        it("should accept a different invoice hash from same supplier", async () => {
            const newHash = keccak("Invoice_Steel_Rebar_20MT_Batch033");
            const tx = await vault.logInvoice(projectId, newHash, { from: supplier });
            const event = tx.logs.find(l => l.event === "InvoiceLogged");
            assert.ok(event, "Second invoice should be accepted");
        });

        it("should reject invoice log from non-supplier account", async () => {
            await expectRevert(
                vault.logInvoice(projectId, keccak("SomeOtherInvoice"), { from: stranger }),
                "Only supplier can log invoices"
            );
        });

    });

    // ════════════════════════════════════════════════════════
    //  SECTION 3 — MilestoneManager — creation
    // ════════════════════════════════════════════════════════
    describe("MilestoneManager — milestone creation", () => {

        it("should create a milestone and emit MilestoneCreated event", async () => {
            const tx = await milestoneManager.createMilestone(
                projectId,
                "Foundation and earthwork complete",
                toWei("0.5"),
                { from: gov }
            );

            const event = tx.logs.find(l => l.event === "MilestoneCreated");
            assert.ok(event, "MilestoneCreated event not emitted");

            milestoneId = event.args.milestoneId.toString();
            assert.equal(event.args.amount.toString(), toWei("0.5"));
        });

        it("should set initial state to PENDING", async () => {
            const state = await milestoneManager.getMilestoneState(projectId, milestoneId);
            assert.equal(state.toString(), "0"); // State.PENDING = 0
        });

        it("should store correct allocated amount", async () => {
            const amount = await milestoneManager.getMilestoneAmount(projectId, milestoneId);
            assert.equal(amount.toString(), toWei("0.5"));
        });

        it("should reject milestone creation from non-government account", async () => {
            await expectRevert(
                milestoneManager.createMilestone(projectId, "Bad milestone", toWei(1),
                    { from: stranger }),
                "Only government can create milestones"
            );
        });

    });

    // ════════════════════════════════════════════════════════
    //  SECTION 4 — MilestoneManager — claim submission
    // ════════════════════════════════════════════════════════
    describe("MilestoneManager — claim submission", () => {
        const evidenceHash = keccak("SiteReport_M1_Foundation_Complete_Day28");

        it("should allow contractor to submit claim and emit ClaimSubmitted", async () => {
            const tx = await milestoneManager.submitClaim(
                projectId, milestoneId, evidenceHash, { from: contractor }
            );
            const event = tx.logs.find(l => l.event === "ClaimSubmitted");
            assert.ok(event, "ClaimSubmitted event not emitted");
            assert.equal(event.args.evidenceHash, evidenceHash);
        });

        it("should transition state to UNDER_REVIEW after claim", async () => {
            const state = await milestoneManager.getMilestoneState(projectId, milestoneId);
            assert.equal(state.toString(), "1"); // State.UNDER_REVIEW = 1
        });

        it("should reject claim from non-contractor account", async () => {
            await expectRevert(
                milestoneManager.submitClaim(projectId, milestoneId,
                    keccak("bad"), { from: stranger }),
                "Only contractor can submit claims"
            );
        });

        it("should reject a second claim on already UNDER_REVIEW milestone", async () => {
            await expectRevert(
                milestoneManager.submitClaim(projectId, milestoneId,
                    keccak("another"), { from: contractor }),
                "Milestone not in PENDING state"
            );
        });

    });

    // ════════════════════════════════════════════════════════
    //  SECTION 5 — MilestoneManager — inspector approvals
    // ════════════════════════════════════════════════════════
    describe("MilestoneManager — inspector approvals (M-of-N)", () => {
        const reportHashA = keccak("InspectorA_Report_All_Checks_Pass_Day29");
        const reportHashB = keccak("InspectorB_Independent_Verification_Day30");

        it("should allow Inspector A to approve and emit InspectorApproved", async () => {
            const tx = await milestoneManager.approve(
                projectId, milestoneId, reportHashA, { from: inspector1 }
            );
            const event = tx.logs.find(l => l.event === "InspectorApproved");
            assert.ok(event, "InspectorApproved event not emitted");
            assert.equal(event.args.inspector, inspector1);
        });

        it("should keep state UNDER_REVIEW after only 1 approval (needs 2)", async () => {
            const state = await milestoneManager.getMilestoneState(projectId, milestoneId);
            assert.equal(state.toString(), "1"); // still UNDER_REVIEW
        });

        it("should reject double approval from same inspector", async () => {
            await expectRevert(
                milestoneManager.approve(projectId, milestoneId,
                    reportHashA, { from: inspector1 }),
                "Inspector already approved"
            );
        });

        it("should reject approval from non-inspector account", async () => {
            await expectRevert(
                milestoneManager.approve(projectId, milestoneId,
                    keccak("bad"), { from: stranger }),
                "Only inspectors can approve"
            );
        });

        it("should approve and emit MilestoneApproved when Inspector B signs (threshold met)", async () => {
            const tx = await milestoneManager.approve(
                projectId, milestoneId, reportHashB, { from: inspector2 }
            );

            const approvedEvent = tx.logs.find(l => l.event === "MilestoneApproved");
            assert.ok(approvedEvent, "MilestoneApproved event not emitted");
            assert.equal(approvedEvent.args.projectId.toString(), projectId);
            assert.equal(approvedEvent.args.milestoneId.toString(), milestoneId);
        });

        it("should set state to APPROVED after threshold is met", async () => {
            const state = await milestoneManager.getMilestoneState(projectId, milestoneId);
            assert.equal(state.toString(), "2"); // State.APPROVED = 2
        });

    });

    // ════════════════════════════════════════════════════════
    //  SECTION 6 — PaymentVault — payment release
    // ════════════════════════════════════════════════════════
    describe("PaymentVault — payment release", () => {

        it("should release payment to contractor after APPROVED milestone", async () => {
            const contractorBalBefore = BigInt(await web3.eth.getBalance(contractor));
            const vaultBalBefore = await vault.getBalance();

            const tx = await vault.release(projectId, milestoneId, { from: gov });

            const event = tx.logs.find(l => l.event === "PaymentReleased");
            assert.ok(event, "PaymentReleased event not emitted");
            assert.equal(event.args.contractor, contractor);
            assert.equal(event.args.amount.toString(), toWei("0.5"));

            // Vault balance should decrease by milestone amount
            const vaultBalAfter = await vault.getBalance();
            const diff = BigInt(vaultBalBefore) - BigInt(vaultBalAfter);
            assert.equal(diff.toString(), BigInt(toWei("0.5")).toString());

            // Contractor should receive funds (account for gas: allow ±0.01 MATIC)
            const contractorBalAfter = BigInt(await web3.eth.getBalance(contractor));
            assert(
                contractorBalAfter > contractorBalBefore,
                "Contractor balance did not increase after release"
            );
        });

        it("should set milestone state to PAID after release", async () => {
            const state = await milestoneManager.getMilestoneState(projectId, milestoneId);
            assert.equal(state.toString(), "3"); // State.PAID = 3
        });

        it("should reject double release of the same milestone", async () => {
            await expectRevert(
                vault.release(projectId, milestoneId, { from: gov }),
                "Milestone not approved yet"
            );
        });

        it("should reject release of a non-APPROVED milestone", async () => {
            // Create a new milestone but don't approve it
            const tx = await milestoneManager.createMilestone(
                projectId, "Tarmac laying", toWei("0.3"), { from: gov }
            );
            const newMilestoneId = tx.logs.find(l => l.event === "MilestoneCreated")
                .args.milestoneId.toString();

            await expectRevert(
                vault.release(projectId, newMilestoneId, { from: gov }),
                "Milestone not approved yet"
            );
        });

    });

    // ════════════════════════════════════════════════════════
    //  SECTION 7 — State machine sanity checks
    // ════════════════════════════════════════════════════════
    describe("State machine — edge cases", () => {

        it("should not allow approve() on a PENDING milestone (not yet claimed)", async () => {
            // M2 is in PENDING state (created above, no claim submitted)
            const count = await milestoneManager.milestoneCount(projectId);
            const pendingMilestoneId = count.toString();

            await expectRevert(
                milestoneManager.approve(projectId, pendingMilestoneId,
                    keccak("early"), { from: inspector1 }),
                "Milestone not under review"
            );
        });

        it("project count should be 1 after all tests", async () => {
            const count = await registry.projectCount();
            assert.equal(count.toString(), "1");
        });

    });

});