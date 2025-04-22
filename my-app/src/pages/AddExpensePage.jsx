import React, { useState, useEffect } from 'react';
import BN from 'bn.js';
import web3 from '../utils/web3';
import contract from '../utils/contract';
import "../styles/styles.css";
import api from '../utils/api';

const STORAGE_KEY = 'debts';

export default function AddExpensePage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);

  const [approved, setApproved] = useState(false);
  const [payer, setPayer] = useState('');
  const [participants, setParticipants] = useState([]);
  const [logic, setLogic] = useState('Equal');
  const [amountEth, setAmountEth] = useState('');
  const [customShares, setCustomShares] = useState({});

  const [debts, setDebts] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    // hydrate once on mount
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setDebts(saved ? JSON.parse(saved) : []);
    } catch {
      setDebts([]);
    }
    web3.eth.getAccounts().then(accs => {
      setAccounts(accs);
      if (accs[0]) setSelectedAccount(accs[0]);
    });
  }, []);

  useEffect(() => {
    // persist whenever debts change
    localStorage.setItem(STORAGE_KEY, JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    if (!selectedAccount) return;
    fetchRegisteredUsers();
    fetchGroups();
  }, [selectedAccount]);

  const fetchRegisteredUsers = async () => {
    const regs = [];
    for (const addr of accounts) {
      if (await contract.methods.registered(addr).call({ from: selectedAccount })) {
        const name = await contract.methods.usernameOf(addr).call({ from: selectedAccount });
        regs.push({ address: addr, username: name });
      }
    }
    setRegisteredUsers(regs);
  };

  const fetchGroups = async () => {
    const cnt = Number(await contract.methods.groupCount().call({ from: selectedAccount }));
    const arr = [];
    for (let i = 1; i <= cnt; i++) {
      const info = await contract.methods.getGroupInfo(i).call({ from: selectedAccount });
      if (!info.exists) continue;
      arr.push({ id: i, name: info.name });
    }
    setGroups(arr);
  };

  useEffect(() => {
    if (!selectedGroup) return;
    contract.methods.getGroupMembers(selectedGroup)
      .call({ from: selectedAccount })
      .then(mems => {
        setGroupMembers(mems);
        setParticipants([]);
        setPayer('');
        setCustomShares({});
      })
      .catch(console.error);
  }, [selectedGroup, selectedAccount]);

  const shortAddr    = a => a.slice(0,8) + '…';
  const findUsername = a => {
    const u = registeredUsers.find(u=>u.address===a);
    return u ? u.username : a;
  };
  const formatEthWei = rawWei => {
    const wei = rawWei.split('.')[0];
    const fullEth = web3.utils.fromWei(wei,'ether');
    const [w,f=''] = fullEth.split('.');
    return `${w}.${(f+'00').slice(0,2)} ETH / ${wei} WEI`;
  };

  const handleApprove = async () => {
    try {
      await web3.eth.sendTransaction({ from: selectedAccount, to: selectedAccount, value: '0' });
      setApproved(true);
      setMsg('Wallet approved');
    } catch {
      setErr('Approval failed');
    }
  };

  const toggleParticipant = addr =>
    setParticipants(ps => ps.includes(addr) ? ps.filter(a=>a!==addr) : [...ps, addr]);

  const handleCustomChange = (addr,val) =>
    setCustomShares(cs => ({ ...cs, [addr]: val }));

  const handleAddExpense = e => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!approved)              return setErr('Approve wallet first');
    if (!selectedGroup)         return setErr('Select a group');
    if (!payer)                 return setErr('Select a payer');
    if (participants.length===0) return setErr('Select participants');
    if (!amountEth)             return setErr('Enter amount');

    const rawWeiBN = new BN(web3.utils.toWei(amountEth,'ether'));
    let shares = [];

    if (logic==='Equal') {
      const cnt  = new BN(participants.length.toString());
      const each = rawWeiBN.div(cnt);
      let acc = new BN('0');
      participants.forEach((_,i)=>{
        let s = each;
        if (i===participants.length-1) s = rawWeiBN.sub(acc);
        else acc = acc.add(each);
        shares.push(s);
      });
    } else {
      let acc = new BN('0');
      participants.forEach(addr=>{
        const bn = new BN(web3.utils.toWei((customShares[addr]||'0'),'ether'));
        acc = acc.add(bn);
        shares.push(bn);
      });
      if (!acc.eq(rawWeiBN)) {
        const rem = rawWeiBN.sub(acc);
        shares[shares.length-1] = shares[shares.length-1].add(rem);
      }
    }

    const newEntries = participants
      .filter(d=>d!==payer)
      .map((deb,i)=>({
        groupId:   selectedGroup,
        debtor:    deb,
        creditor:  payer,
        amountWei: shares[i].toString()
      }));

    setDebts(d => [...d, ...newEntries]);
    setMsg('Expense added');
    setAmountEth('');
    setLogic('Equal');
    setCustomShares({});
  };

  // build totals only for those who owe
  const groupDebts    = debts.filter(d=>d.groupId===selectedGroup);
  const uniqueDebtors = Array.from(new Set(groupDebts.map(d=>d.debtor)));

  return (
    <div className="expense-container">
      <h1>Add Expense</h1>

      <div className="controls">
        <label>
          Account:
          <select
            value={selectedAccount}
            onChange={e=>{ setSelectedAccount(e.target.value); setApproved(false); }}
          >
            {accounts.map(a=>(
              <option key={a} value={a}>
                {shortAddr(a)} {findUsername(a)}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleApprove} disabled={approved}>
          {approved?'Approved':'Approve Wallet'}
        </button>
      </div>

      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <form onSubmit={handleAddExpense}>
        {/* Group */}
        <div>
          <label>
            Group:
            <select
              value={selectedGroup}
              onChange={e=>setSelectedGroup(e.target.value)}
              required
            >
              <option value="">--Select--</option>
              {groups.map(g=>(
                <option key={g.id} value={g.id}>
                  {g.id}: {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {/* Payer */}
        <div>
          <label>
            Payer:
            <select
              value={payer}
              onChange={e=>setPayer(e.target.value)}
              required
            >
              <option value="">--Select--</option>
              {groupMembers.map(m=>(
                <option key={m} value={m}>
                  {findUsername(m)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {/* Participants */}
        <div>
          <p>Participants:</p>
          {groupMembers.map(m=>(
            <label key={m} style={{marginRight:'1rem'}}>
              <input
                type="checkbox"
                checked={participants.includes(m)}
                onChange={()=>toggleParticipant(m)}
              />
              {findUsername(m)}
            </label>
          ))}
        </div>
        {/* Splitting Logic */}
        <div>
          <label>
            Splitting Logic:
            <select
              value={logic}
              onChange={e=>setLogic(e.target.value)}
            >
              <option>Equal</option>
              <option>Custom</option>
            </select>
          </label>
        </div>
        {/* Custom Shares */}
        {logic==='Custom' && (
          <div className="full-width">
            <p>Custom shares (ETH):</p>
            {participants.map(m=>(
              <div key={m}>
                <label>
                  {findUsername(m)}:
                  <input
                    type="number"
                    step="0.01"
                    value={customShares[m]||''}
                    onChange={e=>handleCustomChange(m,e.target.value)}
                    required
                  />
                </label>
              </div>
            ))}
          </div>
        )}
        {/* Amount */}
        <div>
          <label>
            Amount (ETH):
            <input
              type="number"
              step="0.01"
              value={amountEth}
              onChange={e=>setAmountEth(e.target.value)}
              required
            />
          </label>
        </div>
        <button type="submit" disabled={!approved}>
          Add Expense
        </button>
      </form>

      {/* Totals Table */}
      {selectedGroup && uniqueDebtors.length > 0 && (
        <section>
          <h2>Total Owed in Group {selectedGroup}</h2>
          <table>
            <thead>
              <tr><th>Member</th><th>Total Owed</th></tr>
            </thead>
            <tbody>
              {uniqueDebtors.map(deb => {
                const totalWei = groupDebts
                  .filter(d=>d.debtor===deb)
                  .reduce((acc,d)=>acc.add(new BN(d.amountWei)), new BN('0'))
                  .toString();
                return (
                  <tr key={deb}>
                    <td>{findUsername(deb)}</td>
                    <td>{formatEthWei(totalWei)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Detailed Debts */}
      <section>
        <h2>Detailed Debts</h2>
        {groupDebts.length === 0 ? (
          <p>No debts in this group yet.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Debtor</th><th>Creditor</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {groupDebts.map((d,i)=>(
                <tr key={i}>
                  <td>{findUsername(d.debtor)}</td>
                  <td>{findUsername(d.creditor)}</td>
                  <td>{formatEthWei(d.amountWei)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
