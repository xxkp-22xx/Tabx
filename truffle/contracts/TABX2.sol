// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract TabX {
    struct User {
        string name;
        string username;
        address userAddress;
        uint256 balance;
    }

    struct Expense {
        uint256 id;
        uint256 totalAmount;
        uint256 sharePerUser;
        bool settled;
        uint256 createdAt;
        mapping(address => bool) hasPaid;
        address[] payers;
    }

    struct Group {
        string groupName;
        address owner;
        address[] members;
        uint256[] expenseIds;
    }

    mapping(address => User) public users;
    mapping(string => address) public usernameToAddress;
    mapping(uint256 => Expense) public expenses;
    mapping(address => Group) public groups;
    uint256 public expenseCounter;

    event UserRegistered(address indexed user, string username);
    event GroupCreated(address indexed owner, string groupName);
    event MemberAdded(address indexed owner, address member);
    event ExpenseAdded(uint256 indexed expenseId, uint256 totalAmount);
    event PaymentReceived(address indexed payer, uint256 amount);
    event ExpenseSettled(uint256 indexed expenseId);
    event AutoDeducted(address indexed user, uint256 amount);

    modifier onlyGroupOwner() {
        require(groups[msg.sender].owner == msg.sender, "Only the group owner can access this function");
        _;
    }

    function registerUser(string memory username) public {
        require(bytes(username).length > 0, "Username cannot be empty");
        require(users[msg.sender].userAddress == address(0), "User already registered");
        
        users[msg.sender] = User("", username, msg.sender, 0);
        usernameToAddress[username] = msg.sender;
        emit UserRegistered(msg.sender, username);
    }

    function createGroup(string memory groupName) public {
        require(users[msg.sender].userAddress != address(0), "User must be registered");
        require(groups[msg.sender].owner == address(0), "Group already exists");
        
        groups[msg.sender] = Group(groupName, msg.sender, new address[](0), new uint256[](0) );
        emit GroupCreated(msg.sender, groupName);
    }

    function addMemberToGroup(address member) public onlyGroupOwner {
        require(users[member].userAddress != address(0), "User must be registered");
        
        for (uint i = 0; i < groups[msg.sender].members.length; i++) {
            require(groups[msg.sender].members[i] != member, "User already a member");
        }
        
        groups[msg.sender].members.push(member);
        emit MemberAdded(msg.sender, member);
    }

    function getGroupDetails(address groupOwner) public view returns (string memory, address[] memory, uint256[] memory) {
        Group storage group = groups[groupOwner];
        return (group.groupName, group.members, group.expenseIds);
    }

    function addExpense(uint256 totalAmount) public onlyGroupOwner {
        require(totalAmount > 0, "Amount must be greater than zero");
        require(groups[msg.sender].members.length > 0, "Group must have members to add an expense");
        
        uint256 expenseId = ++expenseCounter;
        Expense storage expense = expenses[expenseId];
        expense.id = expenseId;
        expense.totalAmount = totalAmount;
        expense.settled = false;
        expense.createdAt = block.timestamp;
        
        uint256 numMembers = 0;
        for (uint i = 0; i < groups[msg.sender].members.length; i++) {
            address member = groups[msg.sender].members[i];
            expense.payers.push(member);
            numMembers++;
        }
        
        require(numMembers > 0, "Group must have at least one member");
        expense.sharePerUser = totalAmount / numMembers;
        groups[msg.sender].expenseIds.push(expenseId);
        emit ExpenseAdded(expenseId, totalAmount);
    }

    function getTotalGroupBalance(address groupOwner) public view returns (uint256) {
        uint256 totalBalance = 0;
        for (uint i = 0; i < groups[groupOwner].members.length; i++) {
            totalBalance += users[groups[groupOwner].members[i]].balance;
        }
        return totalBalance;
    }

    function getIndividualBalances(address groupOwner) public view returns (address[] memory, uint256[] memory) {
        address[] memory members = groups[groupOwner].members;
        uint256[] memory balances = new uint256[](members.length);
        for (uint i = 0; i < members.length; i++) {
            balances[i] = users[members[i]].balance;
        }
        return (members, balances);
    }
}
