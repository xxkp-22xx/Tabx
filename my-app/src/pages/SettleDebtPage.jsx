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
  const [debts, setDebts] = useState([]);
  const [creditorSelections, setCreditorSelections] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [settling, setSettling] = useState(false);
  const [escrowBalance, setEscrowBalance] = useState('0');

  const storageKey = selectedAccount ? `debts:${selectedAccount}` : null;
  const shortAddr = a => a.slice(0, 8) + '…';
  const findUsername = a => registeredUsers.find(u => u.address === a)?.username || a;
  const formatEthWei = rawWei => {
    const wei = rawWei.split('.')[0];
    const fullEth = web3.utils.fromWei(wei, 'ether');
    const [w, f = ''] = fullEth.split('.');
    return `${w}.${(f + '00').slice(0, 2)} ETH / ${wei} WEI`;
  };

  useEffect(() => {
    web3.eth.getAccounts().then(accs => {
      setAccounts(accs);
      if (accs[0]) setSelectedAccount(accs[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    try {
      const saved = localStorage.getItem(storageKey);
      setDebts(saved ? JSON.parse(saved) : []);
    } catch {
      setDebts([]);
    }
    fetchChainData();
    setSelectedGroup('');
    setCreditorSelections({});
    setMsg(''); setErr('');
  }, [selectedAccount]);

  useEffect(() => {
    if (!selectedGroup) {
      setCreditorSelections({});
      setEscrowBalance('0');
      return;
    }
    const myDebts = debts.filter(d => d.groupId === selectedGroup && d.debtor === selectedAccount);
    const sel = {};
    myDebts.forEach(d => {
      sel[d.creditor] = { checked: false, paymentWei: d.amountWei };
    });
    setCreditorSelections(sel);
    fetchEscrow();
  }, [selectedGroup, debts, selectedAccount]);

  const fetchEscrow = async () => {
    try {
      const contract = await getContract();
      const amount = await contract.methods.groupEscrow(selectedGroup, selectedAccount).call();
      setEscrowBalance(web3.utils.fromWei(amount, 'ether'));
    } catch (e) {
      console.error("Failed to fetch escrow:", e);
    }
  };

  const toggleCreditor = cred => {
    setCreditorSelections(cs => ({
      ...cs,
      [cred]: { ...cs[cred], checked: !cs[cred].checked }
    }));
  };

  const changePayment = (cred, valEth) => {
    const wei = web3.utils.toWei(valEth || '0', 'ether');
    setCreditorSelections(cs => ({
      ...cs,
      [cred]: { ...cs[cred], paymentWei: wei }
    }));
  };

  const handleSettle = async () => {
    setErr(''); setMsg(''); setSettling(true);
    try {
      const contract = await getContract();
      const debtorUsername = findUsername(selectedAccount);
      let updated = [...debts];

      for (const [cred, { checked, paymentWei }] of Object.entries(creditorSelections)) {
        if (!checked) continue;

        const balance = await contract.methods.groupEscrow(selectedGroup, selectedAccount).call();
        if (new BN(balance).lt(new BN(paymentWei))) {
          setErr(`Insufficient escrow for payment to ${findUsername(cred)}`);
          setSettling(false);
          return;
        }

        await contract.methods
          .settleDebtByName(Number(selectedGroup), debtorUsername, paymentWei)
          .send({ from: selectedAccount, value: paymentWei, gas: 300000 });

        updated = updated.map(d => {
          if (d.groupId === selectedGroup && d.debtor === selectedAccount && d.creditor === cred) {
            const owed = new BN(d.amountWei);
            const pay = new BN(paymentWei);
            const rem = owed.sub(pay);
            return { ...d, amountWei: rem.gte(new BN(0)) ? rem.toString() : '0' };
          }
          return d;
        });
      }

      setDebts(updated);
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
      setMsg('Settlement successful');
    } catch (e) {
      console.error(e);
      setErr('Settlement failed: ' + (e.message || e));
    }
    setSettling(false);
    await fetchEscrow();
  };

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

  const groupAllDebts = debts.filter(d => d.groupId === selectedGroup);
  const myGroupDebts = groupAllDebts.filter(d => d.debtor === selectedAccount);
  const totalOwed = myGroupDebts.reduce((sum, d) => sum.add(new BN(d.amountWei)), new BN(0));

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

      {selectedGroup && groupAllDebts.length > 0 && (
        <section>
          <h2>All Debts in Group {selectedGroup}</h2>
          <table>
            <thead><tr><th>Debtor</th><th>Creditor</th><th>Amount</th></tr></thead>
            <tbody>
              {groupAllDebts.map((d, i) => (
                <tr key={i}>
                  <td>{findUsername(d.debtor)}</td>
                  <td>{findUsername(d.creditor)}</td>
                  <td>{formatEthWei(d.amountWei)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {selectedGroup && myGroupDebts.length > 0 && (
        <section className="creditor-list">
          <h2>Your Debts: Total {formatEthWei(totalOwed.toString())}</h2>
          <table>
            <thead><tr><th></th><th>Creditor</th><th>Owed</th><th>Pay</th></tr></thead>
            <tbody>
              {Object.entries(creditorSelections).map(([cred, { checked, paymentWei }]) => (
                <tr key={cred}>
                  <td><input type="checkbox" checked={checked} onChange={() => toggleCreditor(cred)} /></td>
                  <td>{findUsername(cred)}</td>
                  <td>{formatEthWei(myGroupDebts.find(d => d.creditor === cred).amountWei)}</td>
                  <td><input type="number" step="0.01" disabled={!checked} value={web3.utils.fromWei(paymentWei, 'ether')} onChange={e => changePayment(cred, e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleSettle} disabled={settling}>{settling ? 'Processing…' : 'Settle Selected'}</button>
        </section>
      )}

      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
