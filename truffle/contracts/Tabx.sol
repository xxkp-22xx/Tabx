// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract TabX {
    using SafeMath for uint256;

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

    // Add this new struct to track debts between users
struct Debt {
    address creditor;
    address debtor;
    uint256 amount;
    uint256 groupId;
    bool settled;
}

    // Global mappings
    mapping(address => User) public users;
    mapping(string => address) private usernameToAddress;
    mapping(uint256 => Group) public groups;
    mapping(uint256 => Expense) public expenses;
    //mappings to track debts
mapping(uint256 => Debt[]) public groupDebts; // groupId => list of debts
mapping(address => Debt[]) public userDebts;   // user => list of debts

    
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
    event SettlementMade(uint256 indexed groupId, address indexed from, address indexed to, uint256 amount);
    event DebtSettled(uint256 indexed groupId, address indexed debtor, address indexed creditor, uint256 amount);
    //this event for debugging
    event DebugInfo(
        uint256 indexed groupId,
        address debtor,
        address creditor,
        int256 debtorBalance,
        int256 creditorBalance,
        uint256 paymentSent
    );

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

// Modified addExpense function with proper splitting logic
function addExpense(
    uint256 groupId,
    uint256 totalAmount,
    string[] memory participantUsernames
) external onlyGroupMember(groupId) {
    require(totalAmount > 0, "Invalid amount");
    require(participantUsernames.length > 0, "No participants");

    uint256 expenseId = ++expenseIdCounter;
    uint256 participantCount = participantUsernames.length;
    uint256 sharePerParticipantWei = (totalAmount * 1 ether) / participantCount;
    uint256 distributedTotal;

    // Initialize expense in storage
    Expense storage newExpense = expenses[expenseId];
    newExpense.id = expenseId;
    newExpense.totalAmount = totalAmount;
    newExpense.remainingAmount = totalAmount;
    newExpense.payer = msg.sender;
    newExpense.settled = false;
    newExpense.participants = new address[](participantCount);

    for (uint256 i = 0; i < participantCount; ) {
        address participant = getAddressFromUsername(participantUsernames[i]);
        require(groups[groupId].isMember[participant], "Not group member");
        newExpense.participants[i] = participant;

        uint256 shareWei = i == participantCount - 1 
            ? (totalAmount * 1 ether) - distributedTotal 
            : sharePerParticipantWei;
        
        distributedTotal += shareWei;
        newExpense.shares[participant] = shareWei;

        if (participant != msg.sender) {
            groupDebts[groupId].push(Debt({
                creditor: msg.sender,
                debtor: participant,
                amount: shareWei,
                groupId: groupId,
                settled: false
            }));
            userDebts[participant].push(Debt({
                creditor: msg.sender,
                debtor: participant,
                amount: shareWei,
                groupId: groupId,
                settled: false
            }));
            
            balances[participant][groupId] -= int256(shareWei);
            balances[msg.sender][groupId] += int256(shareWei);
        }

        unchecked { ++i; }
    }

    groups[groupId].expenseIds.push(expenseId);
    groups[groupId].totalExpenses += totalAmount;
    emit ExpenseAdded(groupId, expenseId, totalAmount);
}

// function to handle fractional amounts like 3.33333
function getPreciseShare(uint256 totalAmount, uint256 participantCount) public pure returns (uint256) {
    return (totalAmount * 1e18) / participantCount;
}

// New function to settle debts between two users in a group
function settleDebtByName(
    uint256 groupId,
    string memory debtorUsername,
    string memory creditorUsername
) external payable {
    // Get addresses from usernames
    address debtor = getAddressFromUsername(debtorUsername);
    address payable creditor = payable(getAddressFromUsername(creditorUsername));
    
    // Verify addresses exist
    require(debtor != address(0), "Debtor username not found");
    require(creditor != address(0), "Creditor username not found");
    
    // Verify both parties are group members
    require(groups[groupId].isMember[debtor], "Debtor not in this group");
    require(groups[groupId].isMember[creditor], "Creditor not in this group");
    
    // Get balances
    int256 debtorBalance = balances[debtor][groupId];
    int256 creditorBalance = balances[creditor][groupId];
    
    // Debug information (viewable in transaction details)
    emit DebugInfo(groupId, debtor, creditor, debtorBalance, creditorBalance, msg.value);
    
    // Check valid debt relationship
    require(debtorBalance < 0, string(abi.encodePacked(
        "Debtor balance: ", 
        uint256(debtorBalance >= 0 ? uint256(debtorBalance) : uint256(-debtorBalance)),
        debtorBalance >= 0 ? " (not negative)" : ""
    )));
    
    require(creditorBalance > 0, string(abi.encodePacked(
        "Creditor balance: ",
        uint256(creditorBalance),
        creditorBalance <= 0 ? " (not positive)" : ""
    )));
    
    require(creditor != debtor, "Cannot pay yourself");

    // Calculate maximum payable amount
    uint256 debtAmount = uint256(-debtorBalance);
    uint256 creditAmount = uint256(creditorBalance);
    uint256 maxPayment = debtAmount < creditAmount ? debtAmount : creditAmount;
    
    // Verify payment makes sense
    require(msg.value > 0, "Must send ETH to pay debt");
    require(maxPayment > 0, "No debt to settle between these users");
    
    // Determine actual payment amount
    uint256 paymentAmount = msg.value < maxPayment ? msg.value : maxPayment;

    // Update balances
    balances[debtor][groupId] += int256(paymentAmount);
    balances[creditor][groupId] -= int256(paymentAmount);

    // Transfer funds
    creditor.transfer(paymentAmount);
    
    // Refund any overpayment
    if (msg.value > paymentAmount) {
        payable(msg.sender).transfer(msg.value - paymentAmount);
    }

    emit DebtSettled(groupId, debtor, creditor, paymentAmount);
}

//Automatic debt settle for all
function settleAllDebts(uint256 groupId) external payable {
    require(msg.value > 0, "Must send payment");
    require(balances[msg.sender][groupId] < 0, "No debts to settle");
    
    uint256 remainingAmount = msg.value;
    
    // Get all group members
    address[] memory members = groups[groupId].members;
    
    for (uint256 i = 0; i < members.length && remainingAmount > 0; i++) {
        address creditor = members[i];
        
        // Skip self and members who aren't owed money
        if (creditor == msg.sender || balances[creditor][groupId] <= 0) {
            continue;
        }
        
        uint256 debtAmount = uint256(-balances[msg.sender][groupId]);
        uint256 creditAmount = uint256(balances[creditor][groupId]);
        uint256 paymentAmount = remainingAmount;
        
        // Pay either the full debt, the creditor's credit, or remaining payment
        paymentAmount = min(min(debtAmount, creditAmount), paymentAmount);
        
        if (paymentAmount == 0) {
            continue;
        }
        
        // Update balances
        balances[msg.sender][groupId] += int256(paymentAmount);
        balances[creditor][groupId] -= int256(paymentAmount);
        
        // Transfer funds
        payable(creditor).transfer(paymentAmount);
        
        remainingAmount -= paymentAmount;
        
        emit DebtSettled(groupId, msg.sender, creditor, paymentAmount);
    }
    
    // Return any remaining funds
    if (remainingAmount > 0) {
        payable(msg.sender).transfer(remainingAmount);
    }
}

function min(uint256 a, uint256 b) private pure returns (uint256) {
    return a < b ? a : b;
}

// Helper function to get debts for a user in a group
function getUserDebts(address user, uint256 groupId) public view returns (Debt[] memory) {
    Debt[] storage allDebts = groupDebts[groupId];
    Debt[] memory result = new Debt[](allDebts.length);
    uint256 counter = 0;
    
    for (uint256 i = 0; i < allDebts.length; i++) {
        if (allDebts[i].debtor == user && !allDebts[i].settled) {
            result[counter] = allDebts[i];
            counter++;
        }
    }
    
    // Resize array to actual length
    assembly {
        mstore(result, counter)
    }
    
    return result;
}
 
    //Getter function for retriving user balances 
    /**
     * @dev Get user's balance in decimal string format (e.g. "3.33")
     * @param username The username to lookup
     * @param groupId The group ID to check
     * @return balanceStr Formatted balance string with 2 decimal places
     */
    function getUserBalanceFormatted(string memory username, uint256 groupId) 
        public 
        view 
        returns (string memory balanceStr) 
    {
        address userAddress = getAddressFromUsername(username);
        require(groups[groupId].isMember[userAddress], "User not in group");
        
        int256 balance = balances[userAddress][groupId];
        
        // Convert to absolute value for formatting
        bool isNegative = balance < 0;
        uint256 absoluteValue = isNegative ? uint256(-balance) : uint256(balance);
        
        // Calculate whole and fractional parts
        uint256 whole = absoluteValue / 1 ether;
        uint256 fractional = (absoluteValue % 1 ether) * 100 / 1 ether;
        
        // Format as string (e.g. "-3.33" or "5.00")
        if (isNegative) {
            return string(abi.encodePacked(
                "-",
                Strings.toString(whole),
                ".",
                fractional < 10 ? "0" : "",
                Strings.toString(fractional)
            ));
        } else {
            return string(abi.encodePacked(
                Strings.toString(whole),
                ".",
                fractional < 10 ? "0" : "",
                Strings.toString(fractional)
            ));
        }
    }

    /**
     * @dev Get all user balances in decimal format
     * @param username The username to lookup
     * @return balanceStrings Array of formatted balance strings
     * @return groupIds Corresponding group IDs
     */
    function getAllUserBalancesFormatted(string memory username)
        public
        view
        returns (string[] memory balanceStrings, uint256[] memory groupIds)
    {
        address userAddress = getAddressFromUsername(username);
        
        // Count groups user is in
        uint256 groupCount = 0;
        for (uint256 i = 1; i <= groupIdCounter; i++) {
            if (groups[i].isMember[userAddress]) {
                groupCount++;
            }
        }
        
        // Initialize arrays
        balanceStrings = new string[](groupCount);
        groupIds = new uint256[](groupCount);
        uint256 index = 0;
        
        // Populate arrays
        for (uint256 i = 1; i <= groupIdCounter; i++) {
            if (groups[i].isMember[userAddress]) {
                balanceStrings[index] = getUserBalanceFormatted(username, i);
                groupIds[index] = i;
                index++;
            }
        }
        
        return (balanceStrings, groupIds);
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

    function getUserBalance(address user, uint256 groupId) public view returns (int256) {
        return balances[user][groupId];
    }

    function getGroupExpenseIds(uint256 groupId) public view returns (uint256[] memory) {
        return groups[groupId].expenseIds;
    }

    // function getUsername(address user) public view returns (string memory) {
    //     return users[user].username;
    // }

   // Helper function to get address from username
function getAddressFromUsername(string memory username) public view returns (address) {
    address userAddress = usernameToAddress[username];
    require(userAddress != address(0), "Username not registered");
    return userAddress;
}
}