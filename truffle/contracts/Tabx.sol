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
        uint256 timestamp;
    }

    mapping(address => User) public users;
    mapping(string => address) private usernameToAddress;
    mapping(uint256 => Group) public groups;
    mapping(uint256 => Expense) public expenses;
    mapping(uint256 => Debt[]) public groupDebts;
    mapping(address => Debt[]) public userDebts;
    mapping(address => mapping(uint256 => int256)) public balances;

    uint256 public groupIdCounter;
    uint256 public expenseIdCounter;

    // Events
    event UserRegistered(address indexed user, string username);
    event GroupCreated(uint256 indexed groupId, address indexed owner, string name);
    event MemberAdded(uint256 indexed groupId, address member);
    event ExpenseAdded(uint256 indexed groupId, uint256 expenseId, uint256 amount);
    event DebtSettled(uint256 indexed groupId, address indexed debtor, address indexed creditor, uint256 amount);
    event SettlementMade(uint256 indexed groupId, address indexed from, address indexed to, uint256 amount);

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
                    settled: false,
                    timestamp: block.timestamp
                }));
                userDebts[participant].push(Debt({
                    creditor: msg.sender,
                    debtor: participant,
                    amount: shareWei,
                    groupId: groupId,
                    settled: false,
                    timestamp: block.timestamp
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

        bool debtFound = false;
        uint256 remainingPayment = paymentAmount;

        // Process group debts
        Debt[] storage gDebts = groupDebts[groupId];
        for (uint i = 0; i < gDebts.length; i++) {
            if (gDebts[i].debtor == debtor &&
                gDebts[i].creditor == creditor &&
                !gDebts[i].settled) {

                if (remainingPayment >= gDebts[i].amount) {
                    remainingPayment -= gDebts[i].amount;
                    gDebts[i].settled = true;
                    debtFound = true;
                } else {
                    gDebts[i].amount -= remainingPayment;
                    remainingPayment = 0;
                    debtFound = true;
                    break;
                }
            }
        }

        // Process user debts
        Debt[] storage uDebts = userDebts[debtor];
        for (uint i = 0; i < uDebts.length; i++) {
            if (uDebts[i].groupId == groupId &&
                uDebts[i].creditor == creditor &&
                !uDebts[i].settled) {

                if (remainingPayment >= uDebts[i].amount) {
                    remainingPayment -= uDebts[i].amount;
                    uDebts[i].settled = true;
                } else {
                    uDebts[i].amount -= remainingPayment;
                    remainingPayment = 0;
                    break;
                }
            }
        }

        require(debtFound, "No active debt found");
        require(remainingPayment == 0, "Payment exceeds debt amount");

        // Update balances
        balances[debtor][groupId] += int256(paymentAmount);
        balances[creditor][groupId] -= int256(paymentAmount);

        // Ensure no rounding errors by storing exact wei amounts
        require(
            balances[debtor][groupId] <= type(int256).max &&
            balances[debtor][groupId] >= type(int256).min,
            "Balance overflow"
        );

        // Transfer the funds
        creditor.transfer(paymentAmount);

        emit DebtSettled(groupId, debtor, creditor, paymentAmount);
        emit SettlementMade(groupId, debtor, creditor, paymentAmount);
    }

    function getUserBalanceFormatted(address user, uint256 groupId) public view returns (string memory) {
        int256 balance = balances[user][groupId];
        bool isNegative = balance < 0;
        uint256 absValue = isNegative ? uint256(-balance) : uint256(balance);
        string memory formatted = formatAmount(absValue);
        return isNegative ? string(abi.encodePacked("-", formatted)) : formatted;
    }

    function formatAmount(uint256 amountWei) public pure returns (string memory) {
        uint256 whole = amountWei / 1 ether;
        uint256 fractional = (amountWei % 1 ether) * 100 / 1 ether;
        return string(abi.encodePacked(
            Strings.toString(whole), ".",
            fractional < 10 ? "0" : "",
            Strings.toString(fractional)
        ));
    }

    function getGroupMembers(uint256 groupId) public view returns (address[] memory) {
        return groups[groupId].members;
    }

    function getGroupExpenses(uint256 groupId) public view returns (uint256) {
        return groups[groupId].totalExpenses;
    }

    function getGroupExpenseIds(uint256 groupId) public view returns (uint256[] memory) {
        return groups[groupId].expenseIds;
    }

    function getUserBalance(address user, uint256 groupId) public view returns (int256) {
        return balances[user][groupId];
    }

    function getUserBalanceFormatted(string memory username, uint256 groupId) public view returns (string memory) {
        address userAddress = getAddressFromUsername(username);
        require(groups[groupId].isMember[userAddress], "User not in group");
        int256 balance = balances[userAddress][groupId];
        bool isNegative = balance < 0;
        uint256 absValue = isNegative ? uint256(-balance) : uint256(balance);
        string memory formatted = formatAmount(absValue);
        return isNegative ? string(abi.encodePacked("-", formatted)) : formatted;
    }

    function getUserDebts(address user, uint256 groupId) public view returns (
        address[] memory creditors,
        string[] memory amounts,
        bool[] memory settledStatus
    ) {
        Debt[] storage allDebts = groupDebts[groupId];
        uint256 count = 0;
        for (uint256 i = 0; i < allDebts.length; i++) {
            if (allDebts[i].debtor == user) {
                count++;
            }
        }

        creditors = new address[](count);
        amounts = new string[](count);
        settledStatus = new bool[](count);
        uint256 idx;
        for (uint256 i = 0; i < allDebts.length; i++) {
            if (allDebts[i].debtor == user) {
                creditors[idx] = allDebts[i].creditor;
                amounts[idx] = formatAmount(allDebts[i].amount);
                settledStatus[idx] = allDebts[i].settled;
                idx++;
            }
        }
    }

    function getUserAllDebts(address user, uint256 groupId) public view returns (
        address[] memory creditors,
        uint256[] memory amounts,
        bool[] memory settledStatus,
        uint256[] memory timestamps
    ) {
        Debt[] storage allDebts = groupDebts[groupId];
        uint256 count = 0;
        for (uint256 i = 0; i < allDebts.length; i++) {
            if (allDebts[i].debtor == user) {
                count++;
            }
        }

        creditors = new address[](count);
        amounts = new uint256[](count);
        settledStatus = new bool[](count);
        timestamps = new uint256[](count);

        uint256 idx;
        for (uint256 i = 0; i < allDebts.length; i++) {
            if (allDebts[i].debtor == user) {
                creditors[idx] = allDebts[i].creditor;
                amounts[idx] = allDebts[i].amount;
                settledStatus[idx] = allDebts[i].settled;
                timestamps[idx] = allDebts[i].timestamp;
                idx++;
            }
        }
    }

    function getUserDebtHistory(address user) public view returns (
        uint256[] memory groupIds,
        address[] memory counterparties,
        uint256[] memory amounts,
        bool[] memory isCreditor,
        bool[] memory settledStatus,
        uint256[] memory timestamps
    ) {
        uint256 totalDebts = 0;
        for (uint256 i = 1; i <= groupIdCounter; i++) {
            totalDebts += groupDebts[i].length;
        }

        groupIds = new uint256[](totalDebts);
        counterparties = new address[](totalDebts);
        amounts = new uint256[](totalDebts);
        isCreditor = new bool[](totalDebts);
        settledStatus = new bool[](totalDebts);
        timestamps = new uint256[](totalDebts);

        uint256 idx;
        for (uint256 i = 1; i <= groupIdCounter; i++) {
            for (uint256 j = 0; j < groupDebts[i].length; j++) {
                Debt storage debt = groupDebts[i][j];
                if (debt.debtor == user || debt.creditor == user) {
                    groupIds[idx] = i;
                    amounts[idx] = debt.amount;
                    settledStatus[idx] = debt.settled;
                    timestamps[idx] = debt.timestamp;
                    if (debt.debtor == user) {
                        counterparties[idx] = debt.creditor;
                        isCreditor[idx] = false;
                    } else {
                        counterparties[idx] = debt.debtor;
                        isCreditor[idx] = true;
                    }
                    idx++;
                }
            }
        }

        assembly {
            mstore(groupIds, idx)
            mstore(counterparties, idx)
            mstore(amounts, idx)
            mstore(isCreditor, idx)
            mstore(settledStatus, idx)
            mstore(timestamps, idx)
        }
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
        uint256[] memory groupIdsArr = new uint256[](groupCount);
        uint256 idx;
        for (uint256 i = 1; i <= groupIdCounter; i++) {
            if (groups[i].isMember[userAddress]) {
                balanceStrings[idx] = getUserBalanceFormatted(username, i);
                groupIdsArr[idx] = i;
                idx++;
            }
        }

        return (balanceStrings, groupIdsArr);
    }

    function getAddressFromUsername(string memory username) public view returns (address) {
        address userAddress = usernameToAddress[username];
        require(userAddress != address(0), "Username not registered");
        return userAddress;
    }

    /**
     * @notice Returns all debts for a user across all groups,
     *         giving both raw wei amounts and formatted ether strings,
     *         along with the group IDs and settlement status.
     */
    function getFormattedDebts(address user)
        external
        view
        returns (
            uint256[] memory amountsWei,
            string[] memory amountsFormatted,
            uint256[] memory groupIds,
            bool[] memory settledStatus
        )
    {
        // 1) Count total debts where user is debtor
        uint256 total = 0;
        for (uint256 g = 1; g <= groupIdCounter; g++) {
            for (uint i = 0; i < groupDebts[g].length; i++) {
                if (groupDebts[g][i].debtor == user) {
                    total++;
                }
            }
        }

        // 2) Allocate arrays
        amountsWei = new uint256[](total);
        amountsFormatted = new string[](total);
        groupIds = new uint256[](total);
        settledStatus = new bool[](total);

        // 3) Populate
        uint256 idx = 0;
        for (uint256 g = 1; g <= groupIdCounter; g++) {
            for (uint i = 0; i < groupDebts[g].length; i++) {
                Debt storage d = groupDebts[g][i];
                if (d.debtor == user) {
                    amountsWei[idx] = d.amount;
                    amountsFormatted[idx] = formatAmount(d.amount);
                    groupIds[idx] = g;
                    settledStatus[idx] = d.settled;
                    idx++;
                }
            }
        }
    }
}
