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

    // user registry
    mapping(address => bool) public registered;
    mapping(address => string) public usernameOf;

    // groups
    mapping(uint256 => Group) private groups;
    uint256 public groupCount;

    // debt settlement flag: groupId → debtor → creditor → settled
    mapping(uint256 => mapping(address => mapping(address => bool))) public debtSettled;

    // events
    event UserRegistered(address indexed user, string username);
    event GroupCreated(uint256 indexed groupId, address indexed owner, string name);
    event GroupDeleted(uint256 indexed groupId);
    event MemberAdded(uint256 indexed groupId, address member);
    event MemberRemoved(uint256 indexed groupId, address member);
    event DebtSettled(uint256 indexed groupId, address indexed debtor, address indexed creditor, uint256 amount);

    // modifiers
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

    /// @notice Register yourself with a username
    function registerUser(string calldata username) external {
        require(!registered[msg.sender], "Already registered");
        require(bytes(username).length > 0, "Username cannot be empty");

        registered[msg.sender] = true;
        usernameOf[msg.sender] = username;
        emit UserRegistered(msg.sender, username);
    }

    /// @notice Create a new group
    function createGroup(string calldata name) external onlyRegistered {
        require(bytes(name).length > 0, "Group name cannot be empty");

        uint256 gid = ++groupCount;
        Group storage g = groups[gid];
        g.id = gid;
        g.name = name;
        g.owner = msg.sender;
        g.exists = true;

        // owner is first member
        g.isMember[msg.sender] = true;
        g.members.push(msg.sender);

        emit GroupCreated(gid, msg.sender, name);
    }

    /// @notice Delete a group (only owner)
    function deleteGroup(uint256 groupId)
        external
        onlyRegistered
        groupExists(groupId)
        onlyGroupOwner(groupId)
    {
        groups[groupId].exists = false;
        emit GroupDeleted(groupId);
    }

    /// @notice Add a member to a group (owner only)
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

    /// @notice Remove a member from a group (owner only)
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

        address[] storage mems = g.members;
        for (uint256 i = 0; i < mems.length; i++) {
            if (mems[i] == member) {
                mems[i] = mems[mems.length - 1];
                mems.pop();
                break;
            }
        }

        emit MemberRemoved(groupId, member);
    }

    /// @notice Settle the debt you owe to a creditor in a group
    /// @dev creditorUsername is unused on-chain; kept for off-chain alignment
    function settleDebtByName(
        uint256 groupId,
        string calldata debtorUsername,
        /*string calldata creditorUsername,*/
        uint256 paymentAmount
    ) external payable groupExists(groupId) {
        address debtor = msg.sender;
        require(registered[debtor], "Debtor not registered");
        require(paymentAmount > 0, "Amount must be positive");
        require(msg.value == paymentAmount, "Incorrect payment amount");

        // verify debtorUsername matches
        require(
            keccak256(bytes(usernameOf[debtor])) == keccak256(bytes(debtorUsername)),
            "Debtor username mismatch"
        );

        // ensure membership
        Group storage g = groups[groupId];
        require(g.isMember[debtor], "Debtor not in group");

        // here off-chain you would supply creditor address
        // for on-chain, we trust msg.value distribution and mark settled
        // (credential mapping not stored on-chain in this design)
        // thus we simply emit event and mark generic flag
        // NOTE: in real use, pass creditor address instead of username

        // mark debt settled for all creditor entries (simplified)
        // In a full design you'd specify creditorAddress
        // but here we mark all debts from debtor in group as settled
        for (uint i = 0; i < g.members.length; i++) {
            address cred = g.members[i];
            if (cred != debtor) {
                debtSettled[groupId][debtor][cred] = true;
                emit DebtSettled(groupId, debtor, cred, paymentAmount);
            }
        }

        // forward funds to group owner as placeholder
        payable(g.owner).transfer(paymentAmount);
    }

    /// @notice Get members of a group
    function getGroupMembers(uint256 groupId)
        external
        view
        groupExists(groupId)
        returns (address[] memory)
    {
        return groups[groupId].members;
    }

    /// @notice Check if a specific debt is settled
    function isSettled(uint256 groupId, address debtor, address creditor)
        external
        view
        returns (bool)
    {
        return debtSettled[groupId][debtor][creditor];
    }

        /// @notice Return the basic info for a group
    function getGroupInfo(uint256 groupId)
      external
      view
      groupExists(groupId)
      returns (
        uint256 id,
        string memory name,
        address owner,
        bool exists
      )
    {
      Group storage g = groups[groupId];
      return (g.id, g.name, g.owner, g.exists);
    }

}
