import React, { useState, useEffect } from 'react';
import web3 from '../utils/web3';
import getContract from '../utils/contract'; // renamed import
import "../styles/styles.css";

export default function GroupHomePage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [groups, setGroups] = useState([]);

  const [addMemberGroupId, setAddMemberGroupId] = useState('');
  const [addMemberAddress, setAddMemberAddress] = useState('');

  const [removeMemberGroupId, setRemoveMemberGroupId] = useState('');
  const [removeMemberAddress, setRemoveMemberAddress] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const accs = await web3.eth.getAccounts();
      const contract = await getContract(); // initialize contract here

      setAccounts(accs);
      if (accs.length) {
        setSelectedAccount(accs[0]);
        await fetchGroups(accs[0], contract);
        await fetchRegisteredUsers(accs[0], accs, contract);
      }
    };
    init();
  }, []);

  const fetchGroups = async (from, contract) => {
    try {
      const count = Number((await contract.methods.groupCount().call({ from })).toString());
      const arr = [];
      for (let i = 1; i <= count; i++) {
        const info = await contract.methods.getGroupInfo(i).call({ from });
        if (!info.exists) continue;
        const members = await contract.methods.getGroupMembers(i).call({ from });
        arr.push({
          id: Number(info.id.toString()),
          name: info.name,
          owner: info.owner,
          members,
        });
      }
      setGroups(arr);
    } catch {
      setError('Failed to load groups');
    }
  };

  const fetchRegisteredUsers = async (from, accs, contract) => {
    const regs = [];
    for (const addr of accs) {
      const isReg = await contract.methods.registered(addr).call({ from });
      if (isReg) {
        const name = await contract.methods.usernameOf(addr).call({ from });
        regs.push({ address: addr, username: name });
      }
    }
    setRegisteredUsers(regs);
  };

  const handleAccountChange = async (e) => {
    const acct = e.target.value;
    setSelectedAccount(acct);
    setMessage(''); setError('');
    const contract = await getContract();
    await fetchGroups(acct, contract);
    await fetchRegisteredUsers(acct, accounts, contract);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const contract = await getContract();
      await contract.methods.registerUser(username)
        .send({ from: selectedAccount, gas: 3000000 });

      setMessage(`Registered as ${username}`);
      setUsername('');
      await fetchRegisteredUsers(selectedAccount, accounts, contract);
    } catch (e) {
      setError(e.message);
      console.error("Failed to register user:", e);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const contract = await getContract();
      await contract.methods.createGroup(newGroupName)
        .send({ from: selectedAccount, gas: 3000000 });

      await fetchGroups(selectedAccount, contract);
      const latestGroupId = groups.length + 1;
      const members = await contract.methods.getGroupMembers(latestGroupId).call({ from: selectedAccount });

      setMessage(`Group "${newGroupName}" created`);
      setNewGroupName('');
      await fetchGroups(selectedAccount, contract);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const contract = await getContract();
      await contract.methods.addMember(addMemberGroupId, addMemberAddress)
        .send({ from: selectedAccount, gas: 3000000 });

      setMessage(`Added ${addMemberAddress} to group ${addMemberGroupId}`);
      setAddMemberAddress('');
      await fetchGroups(selectedAccount, contract);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRemoveMember = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const contract = await getContract();
      await contract.methods.removeMember(removeMemberGroupId, removeMemberAddress)
        .send({ from: selectedAccount });
      setMessage(`Removed ${removeMemberAddress} from group ${removeMemberGroupId}`);
      setRemoveMemberAddress('');
      await fetchGroups(selectedAccount, contract);
    } catch (e) {
      setError(e.message);
    }
  };

  const shortAddr = addr => `${addr.slice(0,8)}…`;

  const findUsername = addr => {
    const u = registeredUsers.find(u => u.address === addr);
    return u ? u.username : '—';
  };

  return (
<div className="group-home-container">
      <h1>Group Management</h1>

      <label>
        Select Account:
        <select value={selectedAccount} onChange={handleAccountChange}>
          {accounts.map(a => <option key={a} value={a}>{shortAddr(a)}</option>)}
        </select>
      </label>

      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}

      {/* Registered Users */}
      <section className="card">
        <h2>Registered Users</h2>
        {registeredUsers.length === 0
          ? <p>No users registered yet.</p>
          : <ul>
              {registeredUsers.map(u => (
                <li key={u.address}>
                  {u.username} ({shortAddr(u.address)})
                </li>
              ))}
            </ul>
        }
      </section>

      {/* Register User */}
      <section className="card">
        <h2>Register User</h2>
        <form onSubmit={handleRegister}>
          <input
            type="text" placeholder="Username"
            value={username}
            onChange={e=>setUsername(e.target.value)}
            required
          />
          <button type="submit">Register</button>
        </form>
      </section>

      {/* Create Group */}
      <section className="card">
        <h2>Create Group</h2>
        <form onSubmit={handleCreateGroup}>
          <input
            type="text" placeholder="Group Name"
            value={newGroupName}
            onChange={e=>setNewGroupName(e.target.value)}
            required
          />
          <button type="submit">Create</button>
        </form>
      </section>

      {/* Existing Groups */}
      <section className="card">
        <h2>Existing Groups</h2>
        {groups.length === 0
          ? <p>No groups yet.</p>
          : <ul>
              {groups.map(g => (
                <li key={g.id}>
                  <strong>{g.id}: {g.name}</strong> (Owner: {findUsername(g.owner)})
                  <br/>
                  Members:
                  {g.members.map(m => (
                    <span key={m} className="member-chip">
                      {findUsername(m)} ({shortAddr(m)})
                    </span>
                  ))}
                </li>
              ))}
            </ul>
        }
      </section>

      {/* Add Member */}
      <section className="card">
        <h2>Add Member</h2>
        <form onSubmit={handleAddMember}>
          <select
            value={addMemberGroupId}
            onChange={e=>setAddMemberGroupId(e.target.value)}
            required
          >
            <option value="">Select Group</option>
            {groups.map(g=>(
              <option key={g.id} value={g.id}>{g.id}: {g.name}</option>
            ))}
          </select>

          <select
            value={addMemberAddress}
            onChange={e=>setAddMemberAddress(e.target.value)}
            required
          >
            <option value="">Select User</option>
            {registeredUsers.map(u=>(
              <option key={u.address} value={u.address}>
                {u.username} ({shortAddr(u.address)})
              </option>
            ))}
          </select>

          <button type="submit">Add</button>
        </form>
      </section>

      {/* Remove Member */}
      <section className="card">
        <h2>Remove Member</h2>
        <form onSubmit={handleRemoveMember}>
          <select
            value={removeMemberGroupId}
            onChange={e=>setRemoveMemberGroupId(e.target.value)}
            required
          >
            <option value="">Select Group</option>
            {groups.map(g=>(
              <option key={g.id} value={g.id}>{g.id}: {g.name}</option>
            ))}
          </select>

          <select
            value={removeMemberAddress}
            onChange={e=>setRemoveMemberAddress(e.target.value)}
            required
          >
            <option value="">Select Member</option>
            {(groups.find(g=>g.id===Number(removeMemberGroupId))?.members||[])
              .map(m=>(
                <option key={m} value={m}>
                  {findUsername(m)} ({shortAddr(m)})
                </option>
              ))
            }
          </select>

          <button type="submit">Remove</button>
        </form>
      </section>
    </div>
  );
}
