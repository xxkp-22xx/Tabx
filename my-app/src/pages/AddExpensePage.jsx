// src/pages/AddExpensePage.jsx
import React, { useState, useEffect } from 'react';
import BN from 'bn.js';
import web3 from '../utils/web3';
import contract from '../utils/contract';
import "../styles/styles.css";

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

  // Helpers
  const shortAddr   = addr => addr.slice(0,8)+'…';
  const findUsername = addr => {
    const u = registeredUsers.find(u=>u.address===addr);
    return u ? u.username : addr;
  };
  const formatEthWei = rawWei => {
    const wei = rawWei.split('.')[0];
    const fullEth = web3.utils.fromWei(wei,'ether');
    const [whole, frac=''] = fullEth.split('.');
    const twoDec = (frac+'00').slice(0,2);
    return `${whole}.${twoDec} ETH / ${wei} WEI`;
  };

  // Hydrate debts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('debts');
    if (saved) {
      try {
        setDebts(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Whenever debts change, write to localStorage
  useEffect(() => {
    localStorage.setItem('debts', JSON.stringify(debts));
  }, [debts]);

  // Fetch accounts, users, groups
  useEffect(() => {
    (async () => {
      const accs = await web3.eth.getAccounts();
      setAccounts(accs);
      if (accs[0]) setSelectedAccount(accs[0]);
    })();
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    fetchRegisteredUsers();
    fetchGroups();
  }, [selectedAccount]);

  // fetch registered users
  const fetchRegisteredUsers = async () => {
    const accs = await web3.eth.getAccounts();
    const regs = [];
    for (const addr of accs) {
      if (await contract.methods.registered(addr).call({ from: selectedAccount })) {
        const name = await contract.methods.usernameOf(addr).call({ from: selectedAccount });
        regs.push({ address: addr, username: name });
      }
    }
    setRegisteredUsers(regs);
  };

  // fetch groups
  const fetchGroups = async () => {
    const count = Number(await contract.methods.groupCount().call({ from: selectedAccount }));
    const arr = [];
    for (let i = 1; i <= count; i++) {
      const info = await contract.methods.getGroupInfo(i).call({ from: selectedAccount });
      if (!info.exists) continue;
      arr.push({ id: i, name: info.name });
    }
    setGroups(arr);
  };

  // fetch members when group changes
  useEffect(() => {
    if (!selectedGroup) return;
    (async () => {
      const mems = await contract.methods
        .getGroupMembers(selectedGroup)
        .call({ from: selectedAccount });
      setGroupMembers(mems);
      setParticipants([]);
      setPayer('');
      setCustomShares({});
    })();
  }, [selectedGroup]);

  // wallet approval
  const handleApprove = async () => {
    try {
      await web3.eth.sendTransaction({
        from: selectedAccount,
        to: selectedAccount,
        value: '0'
      });
      setApproved(true);
      setMsg('Wallet approved');
    } catch {
      setErr('Approval failed');
    }
  };

  const toggleParticipant = addr =>
    setParticipants(ps =>
      ps.includes(addr) ? ps.filter(a=>a!==addr) : [...ps, addr]
    );

  const handleCustomChange = (addr, val) =>
    setCustomShares(cs => ({ ...cs, [addr]: val }));

  // add expense
  const handleAddExpense = e => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (!approved)            return setErr('Approve wallet first');
    if (!selectedGroup)       return setErr('Select a group');
    if (!payer)               return setErr('Select a payer');
    if (participants.length===0) return setErr('Select participants');
    if (!amountEth)           return setErr('Enter amount');

    const rawWeiBN = new BN(web3.utils.toWei(amountEth.toString(),'ether'));
    let shares = [];

    if (logic==='Equal') {
      const cnt = new BN(participants.length.toString());
      const each = rawWeiBN.div(cnt);
      let dist = new BN('0');
      participants.forEach((_,i)=>{
        let share = each;
        if (i===participants.length-1) share = rawWeiBN.sub(dist);
        else dist = dist.add(each);
        shares.push(share);
      });
    } else {
      let dist = new BN('0');
      participants.forEach(addr=>{
        const bn = new BN(web3.utils.toWei((customShares[addr]||'0'),'ether'));
        dist = dist.add(bn);
        shares.push(bn);
      });
      if (!dist.eq(rawWeiBN)) {
        const last = rawWeiBN.sub(dist);
        shares[shares.length-1] = shares[shares.length-1].add(last);
      }
    }

    const newEntries = participants
      .filter(d=>d!==payer)
      .map((deb,idx)=>({
        groupId:   selectedGroup,
        debtor:    deb,
        creditor:  payer,
        amountWei: shares[idx].toString()
      }));

    setDebts(d=>[...d, ...newEntries]);
    setMsg('Expense added');
    setAmountEth(''); setLogic('Equal'); setCustomShares({});
  };

  // compute per-person totals
  const totals = {};
  debts
    .filter(d=>d.groupId===selectedGroup)
    .forEach(d=>{
      totals[d.debtor] = (totals[d.debtor]||new BN('0')).add(new BN(d.amountWei));
    });

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
            {accounts.map(a=>
              <option key={a} value={a}>
                {shortAddr(a)} {findUsername(a)}
              </option>
            )}
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
          <label>Group:
            <select
              value={selectedGroup}
              onChange={e=>setSelectedGroup(e.target.value)}
              required
            >
              <option value="">Select</option>
              {groups.map(g=>
                <option key={g.id} value={g.id}>
                  {g.id}: {g.name}
                </option>
              )}
            </select>
          </label>
        </div>

        {/* Payer */}
        <div>
          <label>Payer:
            <select
              value={payer}
              onChange={e=>setPayer(e.target.value)}
              required
            >
              <option value="">Select</option>
              {groupMembers.map(m=>
                <option key={m} value={m}>
                  {findUsername(m)}
                </option>
              )}
            </select>
          </label>
        </div>

        {/* Participants */}
        <div>
          <p>Participants:</p>
          {groupMembers.map(m=>(
            <label key={m} style={{ marginRight:'1rem' }}>
              <input
                type="checkbox"
                checked={participants.includes(m)}
                onChange={()=>toggleParticipant(m)}
              />
              {findUsername(m)}
            </label>
          ))}
        </div>

        {/* Logic */}
        <div>
          <label>Splitting Logic:
            <select
              value={logic}
              onChange={e=>setLogic(e.target.value)}
            >
              <option>Equal</option>
              <option>Custom</option>
            </select>
          </label>
        </div>

        {/* Custom shares */}
        {logic==='Custom' && (
          <div className="full-width">
            <p>Custom shares (ETH):</p>
            {participants.map(m=>(
              <div key={m}>
                <label>
                  {findUsername(m)}:
                  <input
                    type="number" step="0.01"
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
          <label>Amount (ETH):
            <input
              type="number" step="0.01"
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

      {/* Totals table */}
      {selectedGroup && (
        <section>
          <h2>Total Owed in Group {selectedGroup}</h2>
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Total Owed</th>
              </tr>
            </thead>
            <tbody>
              {groupMembers.map(m=>(
                <tr key={m}>
                  <td>{findUsername(m)}</td>
                  <td>{formatEthWei((totals[m]||new BN('0')).toString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Detailed debts */}
      <section>
        <h2>Detailed Debts</h2>
        {debts.filter(d=>d.groupId===selectedGroup).length===0 ? (
          <p>No debts yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Debtor</th>
                <th>Creditor</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {debts.filter(d=>d.groupId===selectedGroup).map((d,i)=>(
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
