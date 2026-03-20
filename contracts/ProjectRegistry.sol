// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ProjectRegistry is Ownable {

    enum Role { NONE, GOVERNMENT, CONTRACTOR, INSPECTOR, SUPPLIER }

    struct Project {
        uint id;
        string name;
        uint totalBudget;
        address contractor;
        address[] inspectors;
        uint requiredApprovals;   // M in M-of-N
        bool active;
    }

    uint public projectCount;

    mapping(uint => Project) public projects;
    mapping(uint => mapping(address => Role)) public projectRoles;

    event ProjectCreated(uint indexed projectId, string name, uint budget, address contractor);
    event RoleAssigned(uint indexed projectId, address account, Role role);

    constructor() Ownable(msg.sender) {}

    function createProject(
        string memory _name,
        uint _totalBudget,
        address _contractor,
        address[] memory _inspectors,
        uint _requiredApprovals
    ) external returns (uint) {
        require(_requiredApprovals <= _inspectors.length, "Required approvals exceeds inspector count");
        require(_requiredApprovals > 0, "Need at least 1 approval");

        projectCount++;
        uint id = projectCount;

        projects[id] = Project({
            id: id,
            name: _name,
            totalBudget: _totalBudget,
            contractor: _contractor,
            inspectors: _inspectors,
            requiredApprovals: _requiredApprovals,
            active: true
        });

        projectRoles[id][msg.sender] = Role.GOVERNMENT;
        projectRoles[id][_contractor] = Role.CONTRACTOR;

        for (uint i = 0; i < _inspectors.length; i++) {
            projectRoles[id][_inspectors[i]] = Role.INSPECTOR;
        }

        emit ProjectCreated(id, _name, _totalBudget, _contractor);
        return id;
    }

    function assignRole(uint _projectId, address _account, Role _role) external {
        require(projectRoles[_projectId][msg.sender] == Role.GOVERNMENT, "Only government");
        projectRoles[_projectId][_account] = _role;
        emit RoleAssigned(_projectId, _account, _role);
    }

    function getProject(uint _projectId) external view returns (Project memory) {
        return projects[_projectId];
    }

    function getInspectors(uint _projectId) external view returns (address[] memory) {
        return projects[_projectId].inspectors;
    }
}
