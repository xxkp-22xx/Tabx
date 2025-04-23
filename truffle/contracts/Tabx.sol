// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TabX {
    struct Group {
        uint256 id;
        string name;
        address owner;
        address[] members;
        mapping(address => bool) isMember;
        bool exists;
    }

    mapping(address => bool) public registered;
    mapping(address => string) public usernameOf;
    mapping(uint256 => Group) private groups;
    uint256 public groupCount;
    mapping(uint256 => mapping(address => mapping(address => bool))) public debtSettled;

    // Auto-settlement
    mapping(uint256 => uint256) public autoSettlementTime;
    mapping(uint256 => bool) public autoSettlementEnabled;

    // Escrow
    mapping(uint256 => mapping(address => uint256)) public groupEscrow;

    // Events
    event UserRegistered(address indexed user, string username);
    event GroupCreated(uint256 indexed groupId, address indexed owner, string name);
    event GroupDeleted(uint256 indexed groupId);
    event MemberAdded(uint256 indexed groupId, address member);
    event MemberRemoved(uint256 indexed groupId, address member);
    event DebtSettled(uint256 indexed groupId, address indexed debtor, address indexed creditor, uint256 amount);
    event AutoSettlementScheduled(uint256 indexed groupId, uint256 timestamp);
    event AutoSettlementExecuted(uint256 indexed groupId);
    event SecurityDeposited(uint256 indexed groupId, address indexed user, uint256 amount);
    event EscrowUsedForSettlement(uint256 indexed groupId, address indexed debtor, address indexed creditor, uint256 amount);

    modifier onlyRegistered() {
        require(registered[msg.sender], "Not registered");
        _;
    }

    modifier groupExists(uint256 groupId) {
        require(groups[groupId].exists, "Group does not exist");
        _;
    }

    modifier onlyGroupOwner(uint256 groupId) {
        require(groups[groupId].owner == msg.sender, "Not group owner");
        _;
    }

    function registerUser(string calldata username) external {
        require(!registered[msg.sender], "Already registered");
        require(bytes(username).length > 0, "Username cannot be empty");
        registered[msg.sender] = true;
        usernameOf[msg.sender] = username;
        emit UserRegistered(msg.sender, username);
    }

    function createGroup(string calldata name) external onlyRegistered {
        require(bytes(name).length > 0, "Group name cannot be empty");
        uint256 gid = ++groupCount;
        Group storage g = groups[gid];
        g.id = gid;
        g.name = name;
        g.owner = msg.sender;
        g.exists = true;
        g.isMember[msg.sender] = true;
        g.members.push(msg.sender);
        emit GroupCreated(gid, msg.sender, name);
    }

    function deleteGroup(uint256 groupId)
        external
        onlyRegistered
        groupExists(groupId)
        onlyGroupOwner(groupId)
    {
        groups[groupId].exists = false;
        emit GroupDeleted(groupId);
    }

    function addMember(uint256 groupId, address member)
        external
        onlyRegistered
        groupExists(groupId)
        onlyGroupOwner(groupId)
    {
        require(registered[member], "Member not registered");
        Group storage g = groups[groupId];
        require(!g.isMember[member], "Already a member");
        g.isMember[member] = true;
        g.members.push(member);
        emit MemberAdded(groupId, member);
    }

    function removeMember(uint256 groupId, address member)
        external
        onlyRegistered
        groupExists(groupId)
        onlyGroupOwner(groupId)
    {
        Group storage g = groups[groupId];
        require(g.isMember[member], "Not a member");
        require(member != g.owner, "Cannot remove owner");
        g.isMember[member] = false;
        for (uint256 i = 0; i < g.members.length; i++) {
            if (g.members[i] == member) {
                g.members[i] = g.members[g.members.length - 1];
                g.members.pop();
                break;
            }
        }
        emit MemberRemoved(groupId, member);
    }

    function depositSecurity(uint256 groupId) external payable groupExists(groupId) onlyRegistered {
        require(groups[groupId].isMember[msg.sender], "Not a group member");
        require(msg.value > 0, "Must deposit a positive amount");
        groupEscrow[groupId][msg.sender] += msg.value;
        emit SecurityDeposited(groupId, msg.sender, msg.value);
    }

    function settleDebtByName(
        uint256 groupId,
        string calldata debtorUsername,
        uint256 paymentAmount
    ) external payable groupExists(groupId) {
        address debtor = msg.sender;
        require(registered[debtor], "Debtor not registered");
        require(paymentAmount > 0, "Amount must be positive");
        require(msg.value == paymentAmount, "Incorrect payment amount");
        require(
            keccak256(bytes(usernameOf[debtor])) == keccak256(bytes(debtorUsername)),
            "Debtor username mismatch"
        );
        Group storage g = groups[groupId];
        require(g.isMember[debtor], "Debtor not in group");
        for (uint i = 0; i < g.members.length; i++) {
            address cred = g.members[i];
            if (cred != debtor) {
                debtSettled[groupId][debtor][cred] = true;
                emit DebtSettled(groupId, debtor, cred, paymentAmount);
            }
        }
        payable(g.owner).transfer(paymentAmount);
    }

    // ✅ NEW FUNCTION: Settle debt using escrow funds only
    function settleFromEscrow(
        uint256 groupId,
        address creditor,
        uint256 amount
    ) external onlyRegistered groupExists(groupId) {
        address debtor = msg.sender;
        require(groups[groupId].isMember[debtor], "Not a group member");
        require(groups[groupId].isMember[creditor], "Invalid creditor");
        require(!debtSettled[groupId][debtor][creditor], "Already settled");
        require(groupEscrow[groupId][debtor] >= amount, "Insufficient escrow");

        groupEscrow[groupId][debtor] -= amount;
        payable(creditor).transfer(amount);
        debtSettled[groupId][debtor][creditor] = true;

        emit DebtSettled(groupId, debtor, creditor, amount);
        emit EscrowUsedForSettlement(groupId, debtor, creditor, amount);
    }

    function scheduleAutoSettlement(uint256 groupId, uint256 delayInSeconds)
        external
        onlyRegistered
        groupExists(groupId)
        onlyGroupOwner(groupId)
    {
        autoSettlementTime[groupId] = block.timestamp + delayInSeconds;
        autoSettlementEnabled[groupId] = true;
        emit AutoSettlementScheduled(groupId, autoSettlementTime[groupId]);
    }

    function triggerAutoSettlement(uint256 groupId)
        external
        onlyRegistered
        groupExists(groupId)
    {
        require(autoSettlementEnabled[groupId], "Auto-settlement not enabled");
        require(block.timestamp >= autoSettlementTime[groupId], "Too early");

        Group storage g = groups[groupId];
        for (uint i = 0; i < g.members.length; i++) {
            address debtor = g.members[i];
            for (uint j = 0; j < g.members.length; j++) {
                address creditor = g.members[j];
                if (debtor == creditor) continue;
                if (!debtSettled[groupId][debtor][creditor]) {
                    uint256 amount = 0.01 ether; // Placeholder
                    if (groupEscrow[groupId][debtor] >= amount) {
                        groupEscrow[groupId][debtor] -= amount;
                        payable(creditor).transfer(amount);
                        debtSettled[groupId][debtor][creditor] = true;
                        emit DebtSettled(groupId, debtor, creditor, amount);
                        emit EscrowUsedForSettlement(groupId, debtor, creditor, amount);
                    }
                }
            }
        }
        autoSettlementEnabled[groupId] = false;
        emit AutoSettlementExecuted(groupId);
    }

    function getGroupMembers(uint256 groupId)
        external
        view
        groupExists(groupId)
        returns (address[] memory)
    {
        return groups[groupId].members;
    }

    function isSettled(uint256 groupId, address debtor, address creditor)
        external
        view
        returns (bool)
    {
        return debtSettled[groupId][debtor][creditor];
    }

    function getGroupInfo(uint256 groupId)
        external
        view
        groupExists(groupId)
        returns (uint256 id, string memory name, address owner, bool exists)
    {
        Group storage g = groups[groupId];
        return (g.id, g.name, g.owner, g.exists);
    }
}
