import React, { useState, useEffect } from "react";
import web3 from "../utils/web3";
import contract from "../utils/contract";
import "../styles/styles.css";
import { Link } from 'react-router-dom';


const GroupPage = () => {
  const [groupName, setGroupName] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [memberUsernames, setMemberUsernames] = useState([]);
  const [selectedUsername, setSelectedUsername] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [username, setUsername] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState([]);

  useEffect(() => {
    const loadAccounts = async () => {
      const accs = await web3.eth.getAccounts();
      setAccounts(accs);
      if (accs.length > 0) setSelectedAccount(accs[0]);
    };
    loadAccounts();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch groups
        const groupCount = await contract.methods.groupIdCounter().call();
        const loadedGroups = [];
        
        for (let i = 1; i <= groupCount; i++) {
          const group = await contract.methods.groups(i).call();
          const members = await contract.methods.getGroupMembers(i).call();
          loadedGroups.push({
            id: i,
            name: group.name,
            owner: group.owner,
            members: members
          });
        }
        setGroups(loadedGroups);

        // Fetch registered users
        const loadedUsers = [];
        for (const account of accounts) {
          try {
            const user = await contract.methods.users(account).call();
            if (user.userAddress !== "0x0000000000000000000000000000000000000000") {
              loadedUsers.push({
                username: user.username,
                address: user.userAddress
              });
            }
          } catch (err) {
            console.log(`Account ${account} not registered`);
          }
        }
        setRegisteredUsers(loadedUsers);
      } catch (err) {
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (accounts.length > 0) fetchData();
  }, [accounts]);

  const registerUser = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      setLoading(true);
      setTxStatus('Processing registration...');
      setError('');

      await contract.methods.registerUser(username).send({ 
        from: selectedAccount,
        gas: 300000 
      });

      // Update users list
      setRegisteredUsers([...registeredUsers, {
        username: username,
        address: selectedAccount
      }]);

      setTxStatus('Registration successful!');
      setUsername('');
    } catch (err) {
      setError(`Registration failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    try {
      setLoading(true);
      setTxStatus("Creating group...");
      setError("");

      const tx = await contract.methods
        .createGroup(groupName)
        .send({ from: selectedAccount, gas: 500000 });

      const groupId = tx.events.GroupCreated.returnValues.groupId;
      
      // Add members
      for (const username of memberUsernames) {
        if (username.trim()) {
          try {
            await contract.methods
              .addGroupMember(groupId, username)
              .send({ from: selectedAccount, gas: 300000 });
          } catch (err) {
            console.error(`Failed to add member ${username}:`, err);
          }
        }
      }

      // Refresh groups list
      const members = [selectedAccount, ...memberUsernames.filter(u => u.trim())];
      setGroups([...groups, {
        id: groupId,
        name: groupName,
        owner: selectedAccount,
        members: members
      }]);

      setTxStatus(`Group "${groupName}" created successfully!`);
      setGroupName("");
      setMemberUsernames([]);
    } catch (err) {
      setError(`Group creation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addMember = () => {
    if (selectedUsername && !memberUsernames.includes(selectedUsername)) {
      setMemberUsernames([...memberUsernames, selectedUsername]);
      setSelectedUsername("");
    }
  };

  const removeMember = (index) => {
    const updated = [...memberUsernames];
    updated.splice(index, 1);
    setMemberUsernames(updated);
  };

  return (
    <div className="tabx-container">
      <h2 className="tabx-heading">User Registration</h2>
      
      <div className="tabx-form-group">
        <label className="tabx-label">Account:</label>
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="tabx-select"
        >
          {accounts.map((acc) => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>
      </div>

      <div className="tabx-form-group">
        <label className="tabx-label">Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="tabx-input"
          placeholder="Enter your username"
        />
      </div>

      <button
        onClick={registerUser}
        className="tabx-primary-btn"
        disabled={loading}
      >
        {loading ? "Registering..." : "Register User"}
      </button>

      <h2 className="tabx-heading">Registered Users</h2>
      {registeredUsers.length > 0 ? (
        <div>
          {registeredUsers.map((user, i) => (
            <div key={i} className="tabx-user-address-pair">
              <div>
                <strong>Username:</strong> <span>{user.username}</span>
              </div>
              <div>
                <strong>Address:</strong> <span>{user.address}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="tabx-status">No registered users found</p>
      )}

      <h2 className="tabx-heading">Create New Group</h2>

      {error && <div className="tabx-error">{error}</div>}
      {txStatus && <div className="tabx-status">{txStatus}</div>}

      <div className="tabx-form-group">
        <label className="tabx-label">Group Name:</label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="tabx-input"
          placeholder="Enter group name"
        />
      </div>

      <div className="tabx-form-group">
        <label className="tabx-label">Add Members:</label>
        <div className="tabx-member-selection">
          <select
            value={selectedUsername}
            onChange={(e) => setSelectedUsername(e.target.value)}
            className="tabx-select"
          >
            <option value="">Select a user</option>
            {registeredUsers
              .filter(user => !memberUsernames.includes(user.address))
              .map((user, i) => (
                <option key={i} value={user.address}>{user.address}</option>
              ))}
          </select>
          <button
            onClick={addMember}
            className="tabx-secondary-btn"
            disabled={!selectedUsername}
          >
            Add
          </button>
        </div>
      </div>

      {memberUsernames.map((username, i) => (
        <div key={i} className="tabx-member-item">
          <span>{username}</span>
          <button
            onClick={() => removeMember(i)}
            className="tabx-small-btn"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        onClick={createGroup}
        className="tabx-primary-btn"
        disabled={loading || !groupName.trim()}
      >
        {loading ? "Creating..." : "Create Group"}
      </button>

      <h2 className="tabx-heading">Your Groups</h2>
      {groups.length > 0 ? (
        groups.map(group => (
          <div key={group.id} className="tabx-group-card">
            <h3>{group.name}</h3>
            <p>ID: {group.id}</p>
            <p>Owner: {group.owner}</p>
            <p>Members:</p>
            <ul>
              {group.members.map((member, i) => (
                <li key={i}>
                  {registeredUsers.find(u => u.address === member)?.address || member}
                </li>
              ))}
            </ul>
            <Link 
              to={`/groups/${group.id}/add-expense`}
              className="tabx-secondary-btn"
              style={{ display: 'inline-block', marginTop: '10px' }}
            >
              Add Expense
            </Link>
          </div>
        ))
      ) : (
        <p className="tabx-status">No groups found</p>
      )}
    </div>
  );
};

export default GroupPage;