// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProjectRegistry.sol";

contract MilestoneManager {

    ProjectRegistry public registry;

    enum State { PENDING, UNDER_REVIEW, APPROVED, PAID }

    struct Milestone {
        uint id;
        uint projectId;
        string description;
        uint allocatedAmount;       // in wei
        State state;
        uint approvalCount;
        bytes32 claimEvidenceHash;  // SHA-256 of uploaded document
        bytes32[] inspectorEvidenceHashes;
        mapping(address => bool) hasApproved;
    }

    // projectId => milestoneId => Milestone
    mapping(uint => mapping(uint => Milestone)) public milestones;
    mapping(uint => uint) public milestoneCount;

    event MilestoneCreated(uint indexed projectId, uint indexed milestoneId, uint amount);
    event ClaimSubmitted(uint indexed projectId, uint indexed milestoneId, bytes32 evidenceHash);
    event InspectorApproved(uint indexed projectId, uint indexed milestoneId, address inspector, bytes32 reportHash);
    event MilestoneApproved(uint indexed projectId, uint indexed milestoneId);

    constructor(address _registryAddress) {
        registry = ProjectRegistry(_registryAddress);
    }

    function createMilestone(
        uint _projectId,
        string memory _description,
        uint _allocatedAmount
    ) external returns (uint) {
        require(
            registry.projectRoles(_projectId, msg.sender) == ProjectRegistry.Role.GOVERNMENT,
            "Only government can create milestones"
        );

        milestoneCount[_projectId]++;
        uint mid = milestoneCount[_projectId];

        Milestone storage m = milestones[_projectId][mid];
        m.id = mid;
        m.projectId = _projectId;
        m.description = _description;
        m.allocatedAmount = _allocatedAmount;
        m.state = State.PENDING;

        emit MilestoneCreated(_projectId, mid, _allocatedAmount);
        return mid;
    }

    function submitClaim(
        uint _projectId,
        uint _milestoneId,
        bytes32 _evidenceHash
    ) external {
        require(
            registry.projectRoles(_projectId, msg.sender) == ProjectRegistry.Role.CONTRACTOR,
            "Only contractor can submit claims"
        );
        Milestone storage m = milestones[_projectId][_milestoneId];
        require(m.state == State.PENDING, "Milestone not in PENDING state");

        m.state = State.UNDER_REVIEW;
        m.claimEvidenceHash = _evidenceHash;

        emit ClaimSubmitted(_projectId, _milestoneId, _evidenceHash);
    }

    function approve(
        uint _projectId,
        uint _milestoneId,
        bytes32 _reportHash
    ) external {
        require(
            registry.projectRoles(_projectId, msg.sender) == ProjectRegistry.Role.INSPECTOR,
            "Only inspectors can approve"
        );
        Milestone storage m = milestones[_projectId][_milestoneId];
        require(m.state == State.UNDER_REVIEW, "Milestone not under review");
        require(!m.hasApproved[msg.sender], "Inspector already approved");

        m.hasApproved[msg.sender] = true;
        m.approvalCount++;
        m.inspectorEvidenceHashes.push(_reportHash);

        emit InspectorApproved(_projectId, _milestoneId, msg.sender, _reportHash);

        ProjectRegistry.Project memory project = registry.getProject(_projectId);
        if (m.approvalCount >= project.requiredApprovals) {
            m.state = State.APPROVED;
            emit MilestoneApproved(_projectId, _milestoneId);
        }
    }

    function getMilestoneState(uint _projectId, uint _milestoneId)
        external view returns (State)
    {
        return milestones[_projectId][_milestoneId].state;
    }

    function getMilestoneAmount(uint _projectId, uint _milestoneId)
        external view returns (uint)
    {
        return milestones[_projectId][_milestoneId].allocatedAmount;
    }

    function markPaid(uint _projectId, uint _milestoneId) external {
        // Only PaymentVault can call this
        milestones[_projectId][_milestoneId].state = State.PAID;
    }
}
