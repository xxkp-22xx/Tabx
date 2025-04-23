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

    struct Debt {
        address debtor;
        address creditor;
        uint256 amount;
        bool settled;
    }

    mapping(address => bool) public registered;
    mapping(address => string) public usernameOf;
    mapping(uint256 => Group) private groups;
    uint256 public groupCount;
    mapping(uint256 => Debt[]) public groupDebts;

    mapping(uint256 => uint256) public autoSettlementTime;
    mapping(uint256 => bool) public autoSettlementEnabled;
    mapping(uint256 => mapping(address => uint256)) public groupEscrow;

    event UserRegistered(address indexed user, string username);
    event GroupCreated(uint256 indexed groupId, address indexed owner, string name);
    event GroupDeleted(uint256 indexed groupId);
    event MemberAdded(uint256 indexed groupId, address member);
    event MemberRemoved(uint256 indexed groupId, address member);
    event DebtAdded(uint256 indexed groupId, address debtor, address creditor, uint256 amount);
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

    function addDebt(uint256 groupId, address creditor, uint256 amount)
        external
        onlyRegistered
        groupExists(groupId)
    {
        require(groups[groupId].isMember[msg.sender], "Debtor not in group");
        require(groups[groupId].isMember[creditor], "Creditor not in group");
        groupDebts[groupId].push(Debt({
            debtor: msg.sender,
            creditor: creditor,
            amount: amount,
            settled: false
        }));
        emit DebtAdded(groupId, msg.sender, creditor, amount);
    }

    function settleFromEscrow(uint256 groupId, uint256 index)
        external
        onlyRegistered
        groupExists(groupId)
    {
        Debt storage d = groupDebts[groupId][index];
        require(msg.sender == d.debtor, "Only debtor can settle");
        require(!d.settled, "Already settled");
        require(groupEscrow[groupId][msg.sender] >= d.amount, "Insufficient escrow");
        groupEscrow[groupId][msg.sender] -= d.amount;
        payable(d.creditor).transfer(d.amount);
        d.settled = true;
        emit DebtSettled(groupId, d.debtor, d.creditor, d.amount);
    }

    function triggerAutoSettlement(uint256 groupId)
        external
        onlyRegistered
        groupExists(groupId)
    {
        require(autoSettlementEnabled[groupId], "Auto-settlement not enabled");
        require(block.timestamp >= autoSettlementTime[groupId], "Too early");
        Debt[] storage debts = groupDebts[groupId];
        for (uint i = 0; i < debts.length; i++) {
            if (!debts[i].settled && groupEscrow[groupId][debts[i].debtor] >= debts[i].amount) {
                groupEscrow[groupId][debts[i].debtor] -= debts[i].amount;
                payable(debts[i].creditor).transfer(debts[i].amount);
                debts[i].settled = true;
                emit DebtSettled(groupId, debts[i].debtor, debts[i].creditor, debts[i].amount);
            }
        }
        autoSettlementEnabled[groupId] = false;
        emit AutoSettlementExecuted(groupId);
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

    function getGroupMembers(uint256 groupId)
        external
        view
        groupExists(groupId)
        returns (address[] memory)
    {
        return groups[groupId].members;
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

    function getDebt(uint256 groupId, uint256 index)
        external
        view
        returns (address debtor, address creditor, uint256 amount, bool settled)
    {
        Debt storage d = groupDebts[groupId][index];
        return (d.debtor, d.creditor, d.amount, d.settled);
    }

    function getDebtCount(uint256 groupId)
        external
        view
        returns (uint256)
    {
        return groupDebts[groupId].length;
    }
}
