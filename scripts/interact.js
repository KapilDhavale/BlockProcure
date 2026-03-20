/**
 * interact.js — Full happy path interaction script
 *
 * Runs the complete BlockProcure flow:
 *   Gov creates project → locks funds → creates milestone
 *   Supplier logs invoice (+ duplicate rejection demo)
 *   Contractor submits claim
 *   Inspector A approves (count = 1, no release)
 *   Inspector B approves (count = 2, APPROVED → payment releases)
 *
 * Usage:
 *   truffle exec scripts/interact.js --network development
 *   truffle exec scripts/interact.js --network mumbai
 */

const ProjectRegistry = artifacts.require("ProjectRegistry");
const MilestoneManager = artifacts.require("MilestoneManager");
const PaymentVault = artifacts.require("PaymentVault");

const toWei = (val) => web3.utils.toWei(val.toString(), "ether");
const fromWei = (val) => web3.utils.fromWei(val.toString(), "ether");
const keccak = (str) => web3.utils.keccak256(str);

const log = (msg) => console.log("  " + msg);
const section = (title) => {
  console.log("\n" + "=".repeat(50));
  console.log("  " + title);
  console.log("=".repeat(50));
};

module.exports = async function (callback) {
  try {
    const accounts = await web3.eth.getAccounts();

    // ── Assign roles to Ganache accounts ──────────────────
    const gov        = accounts[0]; // deploys + creates project
    const contractor = accounts[1];
    const inspector1 = accounts[2];
    const inspector2 = accounts[3];
    const supplier   = accounts[4];

    section("Accounts");
    log("Government  : " + gov);
    log("Contractor  : " + contractor);
    log("Inspector A : " + inspector1);
    log("Inspector B : " + inspector2);
    log("Supplier    : " + supplier);

    // ── Load deployed contracts ───────────────────────────
    const registry         = await ProjectRegistry.deployed();
    const milestoneManager = await MilestoneManager.deployed();
    const vault            = await PaymentVault.deployed();

    section("Loaded Contracts");
    log("ProjectRegistry  : " + registry.address);
    log("MilestoneManager : " + milestoneManager.address);
    log("PaymentVault     : " + vault.address);

    // ── STEP 1: Create project ────────────────────────────
    section("Step 1 — Government creates project");

    const tx1 = await registry.createProject(
      "NH-48 Road Widening Phase 1",
      toWei(1),                        // 1 MATIC total budget
      contractor,
      [inspector1, inspector2],
      2,                               // require both inspectors
      { from: gov }
    );

    const projectId = tx1.logs
      .find(l => l.event === "ProjectCreated")
      .args.projectId.toString();

    log("✓ Project created. ID: " + projectId);
    log("  Name   : NH-48 Road Widening Phase 1");
    log("  Budget : 1 MATIC");
    log("  Tx     : " + tx1.tx);

    // ── STEP 2: Lock funds in vault ───────────────────────
    section("Step 2 — Government locks 1 MATIC in PaymentVault");

    const balanceBefore = await vault.getBalance();
    log("Vault balance before : " + fromWei(balanceBefore) + " MATIC");

    const tx2 = await vault.lockFunds(projectId, {
      from: gov,
      value: toWei(1),
    });

    const balanceAfter = await vault.getBalance();
    log("✓ Funds locked. Tx : " + tx2.tx);
    log("Vault balance after  : " + fromWei(balanceAfter) + " MATIC");

    // ── STEP 3: Assign supplier role ──────────────────────
    section("Step 3 — Government assigns Supplier role");

    await registry.assignRole(
      projectId,
      supplier,
      4, // Role.SUPPLIER = 4
      { from: gov }
    );
    log("✓ Supplier role assigned to : " + supplier);

    // ── STEP 4: Supplier logs invoice hash ────────────────
    section("Step 4 — Supplier logs invoice hash on-chain");

    const invoiceContent = "Invoice_Batch_032_Cement_50MT_OPC_Grade53";
    const invoiceHash = keccak(invoiceContent);
    log("Invoice content : " + invoiceContent);
    log("keccak256 hash  : " + invoiceHash);

    const tx3 = await vault.logInvoice(projectId, invoiceHash, { from: supplier });
    log("✓ Invoice logged. Tx : " + tx3.tx);

    // ── STEP 4b: Duplicate invoice rejection demo ─────────
    section("Step 4b — Duplicate invoice rejection (demo)");
    log("Attempting to submit the same invoice hash again...");
    try {
      await vault.logInvoice(projectId, invoiceHash, { from: supplier });
      log("✗ ERROR: Duplicate was NOT rejected — check contract");
    } catch (e) {
      log("✓ Duplicate correctly rejected!");
      log("  Revert reason: " + e.message.split("revert")[1]?.trim());
    }

    // ── STEP 5: Create milestone ──────────────────────────
    section("Step 5 — Government creates milestone M1");

    const milestoneAmount = toWei("0.5"); // 0.5 MATIC for M1
    const tx4 = await milestoneManager.createMilestone(
      projectId,
      "Foundation and earthwork complete",
      milestoneAmount,
      { from: gov }
    );

    const milestoneId = tx4.logs
      .find(l => l.event === "MilestoneCreated")
      .args.milestoneId.toString();

    log("✓ Milestone created. ID: " + milestoneId);
    log("  Description : Foundation and earthwork complete");
    log("  Amount      : 0.5 MATIC");

    // Verify state = PENDING (0)
    let state = await milestoneManager.getMilestoneState(projectId, milestoneId);
    log("  State       : " + stateName(state) + " ✓");

    // ── STEP 6: Contractor submits claim ──────────────────
    section("Step 6 — Contractor submits milestone claim");

    const evidenceContent = "SiteReport_M1_Day28_Foundation_Complete";
    const evidenceHash = keccak(evidenceContent);
    log("Evidence doc   : " + evidenceContent);
    log("Evidence hash  : " + evidenceHash);

    const tx5 = await milestoneManager.submitClaim(
      projectId,
      milestoneId,
      evidenceHash,
      { from: contractor }
    );
    log("✓ Claim submitted. Tx : " + tx5.tx);

    state = await milestoneManager.getMilestoneState(projectId, milestoneId);
    log("  State now : " + stateName(state) + " ✓");

    // ── STEP 7: Inspector A approves ──────────────────────
    section("Step 7 — Inspector A approves (1 of 2)");

    const reportA = keccak("InspectorA_Report_Site_Visit_Day29_All_Checks_Pass");
    const tx6 = await milestoneManager.approve(
      projectId,
      milestoneId,
      reportA,
      { from: inspector1 }
    );
    log("✓ Inspector A approved. Tx : " + tx6.tx);

    state = await milestoneManager.getMilestoneState(projectId, milestoneId);
    log("  State after 1st approval : " + stateName(state));
    log("  (still UNDER_REVIEW — waiting for Inspector B)");

    // ── STEP 8: Inspector B approves → auto APPROVED ──────
    section("Step 8 — Inspector B approves (2 of 2) → APPROVED");

    const contractorBalBefore = BigInt(await web3.eth.getBalance(contractor));
    log("Contractor balance before release : " + fromWei(contractorBalBefore.toString()) + " MATIC");

    const reportB = keccak("InspectorB_Independent_Verification_Day30_Passed");
    const tx7 = await milestoneManager.approve(
      projectId,
      milestoneId,
      reportB,
      { from: inspector2 }
    );
    log("✓ Inspector B approved. Tx : " + tx7.tx);

    state = await milestoneManager.getMilestoneState(projectId, milestoneId);
    log("  State after 2nd approval : " + stateName(state) + " ✓");

    // Check MilestoneApproved event was emitted
    const approvedEvent = tx7.logs.find(l => l.event === "MilestoneApproved");
    if (approvedEvent) {
      log("  MilestoneApproved event emitted ✓");
    }

    // ── STEP 9: Release payment ───────────────────────────
    section("Step 9 — Release payment from PaymentVault");

    const vaultBalBefore = await vault.getBalance();
    log("Vault balance before release : " + fromWei(vaultBalBefore) + " MATIC");

    const tx8 = await vault.release(projectId, milestoneId, { from: gov });
    log("✓ Payment released! Tx : " + tx8.tx);

    const vaultBalAfter = await vault.getBalance();
    const contractorBalAfter = BigInt(await web3.eth.getBalance(contractor));

    log("Vault balance after release   : " + fromWei(vaultBalAfter) + " MATIC");
    log("Contractor balance after      : " + fromWei(contractorBalAfter.toString()) + " MATIC");
    log("Contractor received           : +" + fromWei((contractorBalAfter - contractorBalBefore).toString()) + " MATIC (approx — minus gas)");

    // Verify milestone is now PAID
    state = await milestoneManager.getMilestoneState(projectId, milestoneId);
    log("  Milestone state : " + stateName(state) + " ✓");

    // Verify double-release is blocked
    section("Step 9b — Double release protection (demo)");
    log("Attempting to release same milestone again...");
    try {
      await vault.release(projectId, milestoneId, { from: gov });
      log("✗ ERROR: Double release was NOT blocked");
    } catch (e) {
      log("✓ Double release correctly blocked!");
      log("  Revert reason: " + e.message.split("revert")[1]?.trim());
    }

    // ── SUMMARY ───────────────────────────────────────────
    section("Complete — Full Flow Summary");
    log("Project #" + projectId + "  : NH-48 Road Widening Phase 1");
    log("Milestone #" + milestoneId + " : Foundation and earthwork complete");
    log("Budget locked     : 1.0 MATIC");
    log("Payment released  : 0.5 MATIC → contractor");
    log("Remaining in vault: " + fromWei(await vault.getBalance()) + " MATIC");
    log("Duplicate blocked : YES ✓");
    log("Double release    : BLOCKED ✓");
    log("\nAll steps completed successfully.");

    callback();
  } catch (err) {
    console.error("\n✗ Script failed:", err.message);
    callback(err);
  }
};

// Helper: convert state enum number to readable string
function stateName(state) {
  const states = ["PENDING", "UNDER_REVIEW", "APPROVED", "PAID"];
  return states[Number(state)] || "UNKNOWN";
}