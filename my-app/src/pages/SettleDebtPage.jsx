import React, { useState, useEffect } from 'react';
import BN from 'bn.js';
import web3 from '../utils/web3';
import contract from '../utils/contract';
import "../styles/styles.css";

const STORAGE_KEY = 'debts';

export default function SettleDebtPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');

  const [debts, setDebts] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState('');
  const [creditorSelections, setCreditorSelections] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    web3.eth.getAccounts().then(accs => {
      setAccounts(accs);
      if (accs[0]) setSelectedAccount(accs[0]);
    });
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setDebts(saved ? JSON.parse(saved) : []);
    } catch {
      setDebts([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    fetchRegisteredUsers();
    fetchGroups();
  }, [selectedAccount]);

  useEffect(() => {
    setSelectedDebtor('');
    setCreditorSelections({});
  }, [selectedGroup]);

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

  const shortAddr    = a => a.slice(0,8)+'…';
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

  const groupDebts    = debts.filter(d=>d.groupId===selectedGroup);
  const uniqueDebtors = Array.from(new Set(groupDebts.map(d=>d.debtor)));

  // compute totals
  const totals = {};
  groupDebts.forEach(d => {
    totals[d.debtor] = (totals[d.debtor]||new BN('0')).add(new BN(d.amountWei));
  });

  useEffect(() => {
    if (!selectedDebtor) return setCreditorSelections({});
    const sel = {};
    groupDebts
      .filter(d=>d.debtor===selectedDebtor)
      .forEach(d => {
        sel[d.creditor] = { checked: false, paymentWei: d.amountWei };
      });
    setCreditorSelections(sel);
  }, [selectedDebtor, selectedGroup, debts]);

  const toggleCreditor = addr => {
    setCreditorSelections(cs => ({
      ...cs,
      [addr]: { ...cs[addr], checked: !cs[addr].checked }
    }));
  };
  const changePayment = (addr,valEth) => {
    const wei = web3.utils.toWei(valEth||'0','ether');
    setCreditorSelections(cs => ({
      ...cs,
      [addr]: { ...cs[addr], paymentWei: wei }
    }));
  };

  const handleSettle = async () => {
    setErr(''); setMsg(''); setSettling(true);
    try {
      for (const [cred,{checked,paymentWei}] of Object.entries(creditorSelections)) {
        if (!checked) continue;
        await contract.methods
          .settleDebtByName(
            selectedGroup,
            findUsername(selectedDebtor),
            paymentWei
          )
          .send({
            from: selectedAccount,
            value: paymentWei,
            gas: 300000
          });
        // update local debts
        setDebts(ds => ds.map(d=>{
          if (
            d.groupId===selectedGroup &&
            d.debtor===selectedDebtor &&
            d.creditor===cred
          ) {
            const owed = new BN(d.amountWei);
            const pay  = new BN(paymentWei);
            const rem  = owed.sub(pay);
            return { ...d, amountWei: rem.lt(new BN('0')) ? '0' : rem.toString() };
          }
          return d;
        }));
      }
      setMsg('Settlement successful');
    } catch {
      setErr('Settlement failed');
    }
    setSettling(false);
  };

  return (
    <div className="settle-page">
      <h1>Settle Debts</h1>

      <div className="controls">
        <label>
          Account:
          <select
            value={selectedAccount}
            onChange={e=>setSelectedAccount(e.target.value)}
          >
            {accounts.map(a=>(
              <option key={a} value={a}>{shortAddr(a)} {findUsername(a)}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label>
          Group:
          <select
            value={selectedGroup}
            onChange={e=>setSelectedGroup(e.target.value)}
          >
            <option value="">Select group</option>
            {groups.map(g=>(
              <option key={g.id} value={g.id}>
                {g.id}: {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Totals Table */}
      {selectedGroup && uniqueDebtors.length > 0 && (
        <section>
          <h2>Total Owed in Group {selectedGroup}</h2>
          <table>
            <thead>
              <tr><th>Debtor</th><th>Total Owed</th></tr>
            </thead>
            <tbody>
              {uniqueDebtors.map(d=>{
                const w = totals[d].toString();
                return (
                  <tr key={d}>
                    <td>{findUsername(d)}</td>
                    <td>{formatEthWei(w)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Debtor Selection */}
      {uniqueDebtors.length > 0 && (
        <div>
          <label>
            Debtor:
            <select
              value={selectedDebtor}
              onChange={e=>setSelectedDebtor(e.target.value)}
            >
              <option value="">Select debtor</option>
              {uniqueDebtors.map(d=>
                <option key={d} value={d}>{findUsername(d)}</option>
              )}
            </select>
          </label>
        </div>
      )}

      {/* Creditor List */}
      {selectedDebtor && (
        <div className="creditor-list">
          <h2>Creditors for {findUsername(selectedDebtor)}</h2>
          <table>
            <thead>
              <tr><th></th><th>Creditor</th><th>Owed</th><th>Pay (ETH)</th></tr>
            </thead>
            <tbody>
              {Object.entries(creditorSelections).map(([cred,{checked,paymentWei}])=>(
                <tr key={cred}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={()=>toggleCreditor(cred)}
                    />
                  </td>
                  <td>{findUsername(cred)}</td>
                  <td>{
                    formatEthWei(
                      groupDebts.find(d=>d.debtor===selectedDebtor&&d.creditor===cred).amountWei
                    )
                  }</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={web3.utils.fromWei(paymentWei,'ether')}
                      onChange={e=>changePayment(cred,e.target.value)}
                      disabled={!checked}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleSettle} disabled={settling}>
            {settling?'Processing…':'Settle Selected'}
          </button>
        </div>
      )}

      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
