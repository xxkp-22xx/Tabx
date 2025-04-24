import React, { useState, useEffect } from "react";
import web3 from "../utils/web3";
import getContract from "../utils/contract";
import axios from "axios"; // Make sure this is imported at the top
import "../styles/styles.css";

export default function GroupHomePage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [groups, setGroups] = useState([]);

  const [addMemberGroupId, setAddMemberGroupId] = useState("");
  const [addMemberAddress, setAddMemberAddress] = useState("");
  const [removeMemberGroupId, setRemoveMemberGroupId] = useState("");
  const [removeMemberAddress, setRemoveMemberAddress] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [settlementDelay, setSettlementDelay] = useState("");
  const [autoTimes, setAutoTimes] = useState({});
  const [escrowAmounts, setEscrowAmounts] = useState({});
  const [depositAmount, setDepositAmount] = useState("");

  useEffect(() => {
    const init = async () => {
      const accs = await web3.eth.getAccounts();
      const contract = await getContract();
      setAccounts(accs);
      if (accs.length) {
        setSelectedAccount(accs[0]);
        await fetchGroups(accs[0], contract);
        await fetchRegisteredUsers(accs[0], accs, contract);
        await fetchAutoSettlementTimes(contract, accs[0]);
        await fetchEscrowAmounts(contract, accs[0]);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAutoTimes((prev) => ({ ...prev }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchGroups = async (from, contract) => {
    try {
      const count = Number(
        (await contract.methods.groupCount().call({ from })).toString()
      );
      const arr = [];
      for (let i = 1; i <= count; i++) {
        const info = await contract.methods.getGroupInfo(i).call({ from });
        if (!info.exists) continue;
        const members = await contract.methods
          .getGroupMembers(i)
          .call({ from });
        arr.push({
          id: Number(info.id.toString()),
          name: info.name,
          owner: info.owner,
          members,
        });
      }
      setGroups(arr);
    } catch {
      setError("Failed to load groups");
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

  const fetchAutoSettlementTimes = async (contract, from) => {
    const result = {};
    for (const g of groups) {
      const time = await contract.methods
        .autoSettlementTime(g.id)
        .call({ from });
      const enabled = await contract.methods
        .autoSettlementEnabled(g.id)
        .call({ from });
      if (enabled && time > 0) result[g.id] = Number(time);
    }
    setAutoTimes(result);
  };

  const fetchEscrowAmounts = async (contract, from) => {
    const result = {};
    for (const g of groups) {
      const amount = await contract.methods.groupEscrow(g.id, from).call();
      result[g.id] = web3.utils.fromWei(amount, "ether");
    }
    setEscrowAmounts(result);
  };

  const handleDepositToEscrow = async (groupId) => {
    try {
      const contract = await getContract();
      const value = web3.utils.toWei(depositAmount, "ether");
      await contract.methods
        .depositSecurity(groupId)
        .send({ from: selectedAccount, value });
      setMessage(`Deposited ${depositAmount} ETH to Group ${groupId}`);
      setDepositAmount("");
      await fetchEscrowAmounts(contract, selectedAccount);
    } catch (err) {
      console.error(err);
      setError("Failed to deposit to escrow");
    }
  };

  const handleAccountChange = async (e) => {
    const acct = e.target.value;
    setSelectedAccount(acct);
    setMessage("");
    setError("");
    const contract = await getContract();
    await fetchGroups(acct, contract);
    await fetchRegisteredUsers(acct, accounts, contract);
    await fetchAutoSettlementTimes(contract, acct);
    await fetchEscrowAmounts(contract, acct);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const contract = await getContract();
      await contract.methods
        .registerUser(username)
        .send({ from: selectedAccount, gas: 3000000 });
      setMessage(`Registered as ${username}`);
      setUsername("");
      await fetchRegisteredUsers(selectedAccount, accounts, contract);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const contract = await getContract();

      // 1. Create group on blockchain
      await contract.methods
        .createGroup(newGroupName)
        .send({ from: selectedAccount, gas: 3000000 });

      // 2. Refetch group list from contract
      await fetchGroups(selectedAccount, contract);

      // 3. Compute the latest groupId
      const latestGroupId = groups.length + 1;

      // 4. Get group members from contract (usually just the owner for now)
      const members = await contract.methods
        .getGroupMembers(latestGroupId)
        .call({ from: selectedAccount });

      // 5. Save group data in MongoDB
      await axios.post("http://localhost:4000/api/groups", {
        groupId: latestGroupId,
        name: newGroupName,
        owner: selectedAccount,
        members: members, // optional: include member list
      });

      // 6. Success UI update
      setMessage(`Group "${newGroupName}" created`);
      setNewGroupName("");
      await fetchGroups(selectedAccount, contract);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const contract = await getContract();

      // 1. Call smart contract to add member
      await contract.methods
        .addMember(addMemberGroupId, addMemberAddress)
        .send({ from: selectedAccount, gas: 3000000 });

      // 2. Patch call to MongoDB backend
      await axios.patch(
        `http://localhost:4000/api/groups/${addMemberGroupId}/members`,
        {
          member: addMemberAddress,
        }
      );

      // 3. UI updates
      setMessage(`Added ${addMemberAddress} to group ${addMemberGroupId}`);
      setAddMemberAddress("");
      await fetchGroups(selectedAccount, contract);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRemoveMember = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const contract = await getContract();
      await contract.methods
        .removeMember(removeMemberGroupId, removeMemberAddress)
        .send({ from: selectedAccount });
      setMessage(
        `Removed ${removeMemberAddress} from group ${removeMemberGroupId}`
      );
      setRemoveMemberAddress("");
      await fetchGroups(selectedAccount, contract);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleScheduleAutoSettlement = async (groupId) => {
    try {
      const contract = await getContract();
      const delay = parseInt(settlementDelay);
      if (isNaN(delay) || delay <= 0)
        return setError("Invalid delay in seconds");
      await contract.methods
        .scheduleAutoSettlement(groupId, delay)
        .send({ from: selectedAccount });
      setMessage(
        `Auto-settlement scheduled for Group ${groupId} in ${delay} seconds`
      );
      await fetchAutoSettlementTimes(contract, selectedAccount);
    } catch (err) {
      console.error(err);
      setError("Failed to schedule auto-settlement");
    }
  };

  const handleTriggerAutoSettlement = async (groupId) => {
    try {
      const contract = await getContract();
      await contract.methods
        .triggerAutoSettlement(groupId)
        .send({ from: selectedAccount });
      setMessage(`Auto-settlement triggered for Group ${groupId}`);
    } catch (err) {
      console.error(err);
      setError("Failed to trigger auto-settlement");
    }
  };

  const shortAddr = (addr) => `${addr.slice(0, 8)}…`;
  const findUsername = (addr) =>
    registeredUsers.find((u) => u.address === addr)?.username || "—";

  return (
    <div className="group-home-container">
      <h1>Group Management</h1>
      <label>
        Select Account:
        <select value={selectedAccount} onChange={handleAccountChange}>
          {accounts.map((a) => (
            <option key={a} value={a}>
              {shortAddr(a)}
            </option>
          ))}
        </select>
      </label>
      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}

      <section className="card">
        <h2>Registered Users</h2>
        {registeredUsers.length === 0 ? (
          <p>No users registered yet.</p>
        ) : (
          <ul>
            {registeredUsers.map((u) => (
              <li key={u.address}>
                {u.username} ({shortAddr(u.address)})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Register User</h2>
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <button type="submit">Register</button>
        </form>
      </section>

      <section className="card">
        <h2>Create Group</h2>
        <form onSubmit={handleCreateGroup}>
          <input
            type="text"
            placeholder="Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            required
          />
          <button type="submit">Create</button>
        </form>
      </section>

      <section className="card">
        <h2>Existing Groups</h2>
        {groups.length === 0 ? (
          <p>No groups yet.</p>
        ) : (
          <ul>
            {groups.map((g) => (
              <li key={g.id}>
                <strong>
                  {g.id}: {g.name}
                </strong>{" "}
                (Owner: {findUsername(g.owner)})<br />
                Members:{" "}
                {g.members.map((m) => (
                  <span key={m} className="member-chip">
                    {findUsername(m)} ({shortAddr(m)})
                  </span>
                ))}
                <br />
                <p>Escrow Balance: {escrowAmounts[g.id] || "0"} ETH</p>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Deposit (ETH)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <button onClick={() => handleDepositToEscrow(g.id)}>
                  Deposit
                </button>
                {g.owner === selectedAccount && (
                  <div className="auto-settle">
                    <input
                      type="number"
                      placeholder="Delay (sec)"
                      value={settlementDelay}
                      onChange={(e) => setSettlementDelay(e.target.value)}
                    />
                    <button onClick={() => handleScheduleAutoSettlement(g.id)}>
                      Schedule Auto-Settlement
                    </button>
                    <button onClick={() => handleTriggerAutoSettlement(g.id)}>
                      Trigger Now
                    </button>
                    {autoTimes[g.id] && (
                      <p>
                        Scheduled for:{" "}
                        {new Date(autoTimes[g.id] * 1000).toLocaleString()}
                        <br />
                        Time remaining:{" "}
                        {Math.max(
                          autoTimes[g.id] - Math.floor(Date.now() / 1000),
                          0
                        )}{" "}
                        sec
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Add Member</h2>
        <form onSubmit={handleAddMember}>
          <select
            value={addMemberGroupId}
            onChange={(e) => setAddMemberGroupId(e.target.value)}
            required
          >
            <option value="">Select Group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.id}: {g.name}
              </option>
            ))}
          </select>
          <select
            value={addMemberAddress}
            onChange={(e) => setAddMemberAddress(e.target.value)}
            required
          >
            <option value="">Select User</option>
            {registeredUsers.map((u) => (
              <option key={u.address} value={u.address}>
                {u.username} ({shortAddr(u.address)})
              </option>
            ))}
          </select>
          <button type="submit">Add</button>
        </form>
      </section>

      <section className="card">
        <h2>Remove Member</h2>
        <form onSubmit={handleRemoveMember}>
          <select
            value={removeMemberGroupId}
            onChange={(e) => setRemoveMemberGroupId(e.target.value)}
            required
          >
            <option value="">Select Group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.id}: {g.name}
              </option>
            ))}
          </select>
          <select
            value={removeMemberAddress}
            onChange={(e) => setRemoveMemberAddress(e.target.value)}
            required
          >
            <option value="">Select Member</option>
            {(
              groups.find((g) => g.id === Number(removeMemberGroupId))
                ?.members || []
            ).map((m) => (
              <option key={m} value={m}>
                {findUsername(m)} ({shortAddr(m)})
              </option>
            ))}
          </select>
          <button type="submit">Remove</button>
        </form>
      </section>
    </div>
  );
}
