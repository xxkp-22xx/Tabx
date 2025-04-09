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
    mapping(uint256 => Debt[]) public groupDebts;
    mapping(address => Debt[]) public userDebts;
    
    // Balance tracking
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
        
        Group storage newGroup = groups[groupId];
        newGroup.id = groupId;
        newGroup.name = name;
        newGroup.owner = msg.sender;
        newGroup.totalExpenses = 0;
        newGroup.memberCount = 1;
        newGroup.members = new address[](0);
        newGroup.expenseIds = new uint256[](0);
        
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
        string[] memory participantUsernames
    ) external onlyGroupMember(groupId) {
        require(totalAmount > 0, "Invalid amount");
        require(participantUsernames.length > 0, "No participants");

        uint256 expenseId = ++expenseIdCounter;
        uint256 participantCount = participantUsernames.length;
        uint256 sharePerParticipantWei = (totalAmount * 1 ether) / participantCount;
        uint256 distributedTotal;

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

    function getPreciseShare(uint256 totalAmount, uint256 participantCount) public pure returns (uint256) {
        return (totalAmount * 1e18) / participantCount;
    }

    function settleDebtByName(
        uint256 groupId,
        string memory debtorUsername,
        string memory creditorUsername,
        uint256 paymentAmount
    ) external payable {
        address debtor = getAddressFromUsername(debtorUsername);
        address payable creditor = payable(getAddressFromUsername(creditorUsername));
        
        require(debtor != address(0), "Debtor not found");
        require(creditor != address(0), "Creditor not found");
        require(msg.sender == debtor, "Only debtor can settle");
        require(groups[groupId].isMember[debtor] && groups[groupId].isMember[creditor], "Not group members");
        require(creditor != debtor, "Cannot pay yourself");
        require(paymentAmount > 0, "Amount must be positive");
        require(msg.value == paymentAmount, "Incorrect payment amount");

        // Find the specific debt
        bool debtFound = false;
        uint256 debtAmount;
        
        Debt[] storage gDebts = groupDebts[groupId];
        for (uint i = 0; i < gDebts.length; i++) {
            if (gDebts[i].debtor == debtor && 
                gDebts[i].creditor == creditor && 
                !gDebts[i].settled) {
                debtFound = true;
                debtAmount = gDebts[i].amount;
                break;
            }
        }
        
        require(debtFound, "No active debt found");
        require(paymentAmount <= debtAmount, "Payment exceeds debt");

        // Update debt records
        for (uint i = 0; i < gDebts.length; i++) {
            if (gDebts[i].debtor == debtor && 
                gDebts[i].creditor == creditor && 
                !gDebts[i].settled) {
                if (paymentAmount == gDebts[i].amount) {
                    gDebts[i].settled = true;
                } else {
                    gDebts[i].amount -= paymentAmount;
                }
                break;
            }
        }

        // Update user debts
        Debt[] storage uDebts = userDebts[debtor];
        for (uint i = 0; i < uDebts.length; i++) {
            if (uDebts[i].groupId == groupId && 
                uDebts[i].creditor == creditor && 
                !uDebts[i].settled) {
                if (paymentAmount == uDebts[i].amount) {
                    uDebts[i].settled = true;
                } else {
                    uDebts[i].amount -= paymentAmount;
                }
                break;
            }
        }

        // Update balances and transfer
        balances[debtor][groupId] += int256(paymentAmount);
        balances[creditor][groupId] -= int256(paymentAmount);
        creditor.transfer(paymentAmount);

        emit DebtSettled(groupId, debtor, creditor, paymentAmount);
        emit SettlementMade(groupId, debtor, creditor, paymentAmount);
    }

    function settleAllDebts(uint256 groupId) external payable {
        require(msg.value > 0, "Must send payment");
        require(balances[msg.sender][groupId] < 0, "No debts to settle");
        
        uint256 remainingAmount = msg.value;
        address[] memory members = groups[groupId].members;
        
        for (uint256 i = 0; i < members.length && remainingAmount > 0; i++) {
            address creditor = members[i];
            
            if (creditor == msg.sender || balances[creditor][groupId] <= 0) {
                continue;
            }
            
            uint256 debtAmount = uint256(-balances[msg.sender][groupId]);
            uint256 creditAmount = uint256(balances[creditor][groupId]);
            uint256 paymentAmount = min(min(debtAmount, creditAmount), remainingAmount);
            
            if (paymentAmount == 0) {
                continue;
            }
            
            // Update balances and transfer
            balances[msg.sender][groupId] += int256(paymentAmount);
            balances[creditor][groupId] -= int256(paymentAmount);
            payable(creditor).transfer(paymentAmount);
            
            remainingAmount -= paymentAmount;
            emit DebtSettled(groupId, msg.sender, creditor, paymentAmount);
        }
        
        if (remainingAmount > 0) {
            payable(msg.sender).transfer(remainingAmount);
        }
    }

    function min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }

    function formatAmount(uint256 amountWei) public pure returns (string memory) {
        uint256 whole = amountWei / 1 ether;
        uint256 fractional = (amountWei % 1 ether) * 100 / 1 ether;
        
        return string(abi.encodePacked(
            Strings.toString(whole),
            ".",
            fractional < 10 ? "0" : "",
            Strings.toString(fractional)
        ));
    }

    function getUserDebts(address user, uint256 groupId) public view returns (
        address[] memory creditors,
        string[] memory amounts,
        bool[] memory settledStatus
    ) {
        Debt[] storage allDebts = groupDebts[groupId];
        
        uint256 debtCount = 0;
        for (uint256 i = 0; i < allDebts.length; i++) {
            if (allDebts[i].debtor == user && !allDebts[i].settled) {
                debtCount++;
            }
        }
        
        creditors = new address[](debtCount);
        amounts = new string[](debtCount);
        settledStatus = new bool[](debtCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < allDebts.length; i++) {
            if (allDebts[i].debtor == user && !allDebts[i].settled) {
                creditors[index] = allDebts[i].creditor;
                amounts[index] = formatAmount(allDebts[i].amount);
                settledStatus[index] = allDebts[i].settled;
                index++;
            }
        }
        
        return (creditors, amounts, settledStatus);
    }

    function getUserBalanceFormatted(string memory username, uint256 groupId) 
        public view returns (string memory) 
    {
        address userAddress = getAddressFromUsername(username);
        require(groups[groupId].isMember[userAddress], "User not in group");
        
        int256 balance = balances[userAddress][groupId];
        bool isNegative = balance < 0;
        uint256 absoluteValue = isNegative ? uint256(-balance) : uint256(balance);
        
        string memory formattedAmount = formatAmount(absoluteValue);
        return isNegative ? string(abi.encodePacked("-", formattedAmount)) : formattedAmount;
    }

    function getAllUserBalancesFormatted(string memory username)
        public view returns (string[] memory, uint256[] memory)
    {
        address userAddress = getAddressFromUsername(username);
        uint256 groupCount = 0;
        
        for (uint256 i = 1; i <= groupIdCounter; i++) {
            if (groups[i].isMember[userAddress]) {
                groupCount++;
            }
        }
        
        string[] memory balanceStrings = new string[](groupCount);
        uint256[] memory groupIds = new uint256[](groupCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= groupIdCounter; i++) {
            if (groups[i].isMember[userAddress]) {
                balanceStrings[index] = getUserBalanceFormatted(username, i);
                groupIds[index] = i;
                index++;
            }
        }
        
        return (balanceStrings, groupIds);
    }

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

    function getAddressFromUsername(string memory username) public view returns (address) {
        address userAddress = usernameToAddress[username];
        require(userAddress != address(0), "Username not registered");
        return userAddress;
    }
}