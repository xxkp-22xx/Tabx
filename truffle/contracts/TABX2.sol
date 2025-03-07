// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TabX {
    struct User {
        string username;
        address userAddress;
    }

    struct Expense {
        uint256 id;
        uint256 totalAmount;
        uint256 remainingAmount;
        address payer;
        address[] participants;
        mapping(address => uint256) shares;
        bool settled;
    }

    struct Group {
        uint256 id;
        string name;
        address owner;
        uint256 totalExpenses;
        uint256 memberCount;
        mapping(address => bool) isMember;
        address[] members;
        uint256[] expenseIds;
    }

    // Global mappings
    mapping(address => User) public users;
    mapping(string => address) private usernameToAddress;
    mapping(uint256 => Group) public groups;
    mapping(uint256 => Expense) public expenses;
    
    // Balance tracking: user => groupID => balance
    mapping(address => mapping(uint256 => int256)) public balances;

    // Counters
    uint256 public groupIdCounter;
    uint256 public expenseIdCounter;

    // Events
    event UserRegistered(address indexed user, string username);
    event GroupCreated(uint256 indexed groupId, address indexed owner, string name);
    event MemberAdded(uint256 indexed groupId, address member);
    event ExpenseAdded(uint256 indexed groupId, uint256 expenseId, uint256 amount);
    event PaymentMade(uint256 indexed groupId, address indexed payer, uint256 amount);
    event ExpenseSettled(uint256 indexed groupId, uint256 expenseId);

    modifier onlyGroupOwner(uint256 groupId) {
        require(groups[groupId].owner == msg.sender, "Not group owner");
        _;
    }

    modifier onlyGroupMember(uint256 groupId) {
        require(groups[groupId].isMember[msg.sender], "Not group member");
        _;
    }

    function registerUser(string memory username) external {
        require(bytes(username).length > 0, "Empty username");
        require(users[msg.sender].userAddress == address(0), "Already registered");
        require(usernameToAddress[username] == address(0), "Username taken");

        users[msg.sender] = User(username, msg.sender);
        usernameToAddress[username] = msg.sender;
        emit UserRegistered(msg.sender, username);
    }

    function createGroup(string memory name) external {
        uint256 groupId = ++groupIdCounter;
        
        // Initialize the Group struct without the mapping
        Group storage newGroup = groups[groupId];
        newGroup.id = groupId;
        newGroup.name = name;
        newGroup.owner = msg.sender;
        newGroup.totalExpenses = 0;
        newGroup.memberCount = 1;
        newGroup.members = new address[](0);
        newGroup.expenseIds = new uint256[](0);
        
        // Initialize the mapping separately
        newGroup.isMember[msg.sender] = true;
        newGroup.members.push(msg.sender);
        
        emit GroupCreated(groupId, msg.sender, name);
    }

    function addGroupMember(uint256 groupId, address member) external onlyGroupOwner(groupId) {
        require(!groups[groupId].isMember[member], "Already member");
        require(users[member].userAddress != address(0), "User not registered");

        groups[groupId].isMember[member] = true;
        groups[groupId].members.push(member);
        groups[groupId].memberCount++;
        emit MemberAdded(groupId, member);
    }

    function addExpense(
        uint256 groupId,
        uint256 totalAmount,
        string[] memory participantUsernames // Changed to usernames
    ) external onlyGroupMember(groupId) {
        require(totalAmount > 0, "Invalid amount");
        require(participantUsernames.length > 0, "No participants");

        uint256 expenseId = ++expenseIdCounter;
        uint256 share = totalAmount / participantUsernames.length;
        uint256 remainder = totalAmount % participantUsernames.length;

        Expense storage newExpense = expenses[expenseId];
        newExpense.id = expenseId;
        newExpense.totalAmount = totalAmount;
        newExpense.remainingAmount = totalAmount;
        newExpense.payer = msg.sender;
        newExpense.settled = false;

        // Convert usernames to addresses and validate
        address[] memory participantAddresses = new address[](participantUsernames.length);
        for (uint256 i = 0; i < participantUsernames.length; i++) {
            address participantAddress = usernameToAddress[participantUsernames[i]];
            require(participantAddress != address(0), "Username not registered");
            require(groups[groupId].isMember[participantAddress], "Not group member");
            
            participantAddresses[i] = participantAddress;
        }
        newExpense.participants = participantAddresses;

        // Distribute shares and update balances
        for (uint256 i = 0; i < participantAddresses.length; i++) {
            address participant = participantAddresses[i];
            uint256 adjustedShare = share;
            if (i == 0) adjustedShare += remainder;
            
            newExpense.shares[participant] = adjustedShare;
            balances[participant][groupId] -= int256(adjustedShare);
            balances[msg.sender][groupId] += int256(adjustedShare);
        }

        groups[groupId].expenseIds.push(expenseId);
        groups[groupId].totalExpenses += totalAmount;
        emit ExpenseAdded(groupId, expenseId, totalAmount);
    }

    function payShare(uint256 groupId, uint256 expenseId) external payable onlyGroupMember(groupId) {
        Expense storage expense = expenses[expenseId];
        uint256 share = expense.shares[msg.sender];
        
        require(share > 0, "No share in this expense");
        require(msg.value >= share, "Insufficient payment");
        require(!expense.settled, "Expense already settled");

        // Update balances
        balances[msg.sender][groupId] += int256(msg.value);
        balances[expense.payer][groupId] -= int256(msg.value);
        expense.remainingAmount -= msg.value;

        // Handle overpayment
        if (msg.value > share) {
            payable(msg.sender).transfer(msg.value - share);
        }

        // Check if expense is fully settled
        if (expense.remainingAmount == 0) {
            expense.settled = true;
            emit ExpenseSettled(groupId, expenseId);
        }

        emit PaymentMade(groupId, msg.sender, msg.value);
    }

    // Getter functions
    function getGroupMembers(uint256 groupId) public view returns (address[] memory) {
        return groups[groupId].members;
    }

    function getGroupExpenses(uint256 groupId) public view returns (uint256) {
        return groups[groupId].totalExpenses;
    }

    function getUserShareInExpense(uint256 expenseId, address user) public view returns (uint256) {
        return expenses[expenseId].shares[user];
    }

    function getBalance(uint256 groupId, address user) public view returns (int256) {
        return balances[user][groupId];
    }

    function getGroupExpenseIds(uint256 groupId) public view returns (uint256[] memory) {
        return groups[groupId].expenseIds;
    }

    function getUsername(address user) public view returns (string memory) {
        return users[user].username;
    }
}