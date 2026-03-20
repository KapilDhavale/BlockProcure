// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProjectRegistry.sol";
import "./MilestoneManager.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PaymentVault is ReentrancyGuard {

    ProjectRegistry public registry;
    MilestoneManager public milestoneManager;

    // projectId => invoiceHash => logged
    mapping(uint => mapping(bytes32 => bool)) public invoiceLog;

    // projectId => milestoneId => paid
    mapping(uint => mapping(uint => bool)) public released;

    event FundsLocked(uint indexed projectId, uint amount);
    event InvoiceLogged(uint indexed projectId, bytes32 invoiceHash, address supplier);
    event PaymentReleased(uint indexed projectId, uint indexed milestoneId, address contractor, uint amount);

    constructor(address _registryAddress, address _milestoneManagerAddress) {
        registry = ProjectRegistry(_registryAddress);
        milestoneManager = MilestoneManager(_milestoneManagerAddress);
    }

    // Government calls this to lock funds for a project
    function lockFunds(uint _projectId) external payable {
        require(
            registry.projectRoles(_projectId, msg.sender) == ProjectRegistry.Role.GOVERNMENT,
            "Only government can lock funds"
        );
        require(msg.value > 0, "Must send MATIC");
        emit FundsLocked(_projectId, msg.value);
    }

    // Supplier logs invoice hash — prevents duplicate invoicing
    function logInvoice(uint _projectId, bytes32 _invoiceHash) external {
        require(
            registry.projectRoles(_projectId, msg.sender) == ProjectRegistry.Role.SUPPLIER,
            "Only supplier can log invoices"
        );
        require(!invoiceLog[_projectId][_invoiceHash], "Invoice already submitted — duplicate detected");
        invoiceLog[_projectId][_invoiceHash] = true;
        emit InvoiceLogged(_projectId, _invoiceHash, msg.sender);
    }

    // Anyone can trigger release — contract enforces conditions
    function release(uint _projectId, uint _milestoneId) external nonReentrant {
        require(
            milestoneManager.getMilestoneState(_projectId, _milestoneId)
                == MilestoneManager.State.APPROVED,
            "Milestone not approved yet"
        );
        require(!released[_projectId][_milestoneId], "Payment already released");

        released[_projectId][_milestoneId] = true;

        uint amount = milestoneManager.getMilestoneAmount(_projectId, _milestoneId);
        address contractor = registry.getProject(_projectId).contractor;

        milestoneManager.markPaid(_projectId, _milestoneId);

        (bool success, ) = payable(contractor).call{value: amount}("");
        require(success, "Transfer failed");

        emit PaymentReleased(_projectId, _milestoneId, contractor, amount);
    }

    function getBalance() external view returns (uint) {
        return address(this).balance;
    }
}
