// ✅ Fully updated SettleDebtPage.jsx to fetch and settle on-chain debts using settleFromEscrow()
import React, { useState, useEffect } from 'react';
import BN from 'bn.js';
import web3 from '../utils/web3';
import getContract from '../utils/contract';
import "../styles/styles.css";

export default function SettleDebtPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupDebts, setGroupDebts] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [settling, setSettling] = useState(false);
  const [escrowBalance, setEscrowBalance] = useState('0');

  const shortAddr = a => a.slice(0, 8) + '…';
  const findUsername = a => registeredUsers.find(u => u.address === a)?.username || a;
  const formatEth = wei => `${Number(web3.utils.fromWei(wei, 'ether')).toFixed(4)} ETH`;

  useEffect(() => {
    web3.eth.getAccounts().then(accs => {
      setAccounts(accs);
      if (accs[0]) setSelectedAccount(accs[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    fetchChainData();
    setSelectedGroup('');
    setGroupDebts([]);
    setMsg('');
    setErr('');
  }, [selectedAccount]);

  useEffect(() => {
    if (!selectedGroup) return;
    fetchGroupDebts();
    fetchEscrow();
  }, [selectedGroup]);

  const fetchChainData = async () => {
    const contract = await getContract();
    const regs = [];
    for (const addr of accounts) {
      const isReg = await contract.methods.registered(addr).call({ from: selectedAccount });
      if (isReg) {
        const name = await contract.methods.usernameOf(addr).call({ from: selectedAccount });
        regs.push({ address: addr, username: name });
      }
    }
    setRegisteredUsers(regs);

    const cnt = Number(await contract.methods.groupCount().call({ from: selectedAccount }));
    const arr = [];
    for (let i = 1; i <= cnt; i++) {
      const info = await contract.methods.getGroupInfo(i).call({ from: selectedAccount });
      if (info.exists) arr.push({ id: i, name: info.name });
    }
    setGroups(arr);
  };

  const fetchGroupDebts = async () => {
    const contract = await getContract();
    const count = await contract.methods.getDebtCount(selectedGroup).call();
    const debts = [];
    for (let i = 0; i < count; i++) {
  const debt = await contract.methods.getDebt(selectedGroup, i).call(); // ✅
  debts.push({ index: i, ...debt });
}

    setGroupDebts(debts);
  };

  const fetchEscrow = async () => {
    try {
      const contract = await getContract();
      const amount = await contract.methods.groupEscrow(selectedGroup, selectedAccount).call();
      setEscrowBalance(web3.utils.fromWei(amount, 'ether'));
    } catch (e) {
      console.error("Failed to fetch escrow:", e);
    }
  };

  const handleSettle = async (debt) => {
    setErr('');
    setMsg('');
    setSettling(true);
    try {
      const contract = await getContract();
      await contract.methods
        .settleFromEscrow(Number(selectedGroup), debt.index)
        .send({ from: selectedAccount });
      setMsg(`Settled debt to ${findUsername(debt.creditor)}`);
      await fetchGroupDebts();
      await fetchEscrow();
    } catch (e) {
      console.error(e);
      setErr('Settlement failed: ' + (e.message || e));
    }
    setSettling(false);
  };

  return (
    <div className="settle-page">
      <h1>Settle Debts</h1>

      <div className="controls">
        <label>Account:
          <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
            {accounts.map(a => <option key={a} value={a}>{shortAddr(a)} {findUsername(a)}</option>)}
          </select>
        </label>
        <label>Group:
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
            <option value="">Select</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.id}: {g.name}</option>)}
          </select>
        </label>
      </div>

      {selectedGroup && <p>Your Escrow Balance: {escrowBalance} ETH</p>}

      {selectedGroup && groupDebts.length > 0 && (
        <section>
          <h2>Group Debts</h2>
          <table>
            <thead><tr><th>Debtor</th><th>Creditor</th><th>Amount</th><th>Action</th></tr></thead>
            <tbody>
              {groupDebts.map((d, i) => (
                <tr key={i}>
                  <td>{findUsername(d.debtor)}</td>
                  <td>{findUsername(d.creditor)}</td>
                  <td>{formatEth(d.amount)}</td>
                  <td>
                    {d.debtor === selectedAccount && !d.settled ? (
                      <button onClick={() => handleSettle(d)} disabled={settling}>Settle</button>
                    ) : d.settled ? 'Settled' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}