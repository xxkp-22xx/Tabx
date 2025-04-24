// src/pages/SettleDebtPage.jsx
import React, { useState, useEffect } from 'react';
import BN from 'bn.js';
import web3 from '../utils/web3';
import getContract from '../utils/contract';
import axios from 'axios';
import "../styles/styles.css";

export default function SettleDebtPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [owedSummaries, setOwedSummaries] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [settling, setSettling] = useState(false);

  const shortAddr = a => a.slice(0,8) + '…';
  const findUsername = addr => {
    const u = registeredUsers.find(u => u.address === addr);
    return u ? u.username : addr;
  };
  const formatEth = wei => {
    const cleanWei = String(wei).replace(/[^\d]/g, '') || '0';
    return `${Number(web3.utils.fromWei(cleanWei, 'ether')).toFixed(4)} ETH`;
  };
  

  useEffect(() => {
    web3.eth.getAccounts().then(accs => {
      setAccounts(accs);
      if (accs[0]) setSelectedAccount(accs[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    (async () => {
      const c = await getContract();
      const regs = [];
      for (let addr of accounts) {
        if (await c.methods.registered(addr).call({ from: selectedAccount })) {
          const username = await c.methods.usernameOf(addr).call({ from: selectedAccount });
          regs.push({ address: addr, username });
        }
      }
      setRegisteredUsers(regs);

      const cnt = Number(await c.methods.groupCount().call({ from: selectedAccount }));
      const gs = [];
      for (let i = 1; i <= cnt; i++) {
        const info = await c.methods.getGroupInfo(i).call({ from: selectedAccount });
        if (info.exists) gs.push({ id: i, name: info.name });
      }
      setGroups(gs);
    })();
  }, [selectedAccount, accounts]);

  useEffect(() => {
    if (!selectedAccount || !selectedGroup) {
      setOwedSummaries([]);
      return;
    }
    (async () => {
      try {
        const res = await axios.get(`http://localhost:4000/api/debts`, {
          params: {
            groupId: selectedGroup,
            creditor: selectedAccount,
            // ❌ remove `settled: false` to show all (optional)
          }
        });
  
        const raw = res.data.map(d => ({
          debtor: d.debtor,
          creditor: d.creditor,
          amountWei: d.amountWei,
          settled: d.settled
        }));
  
        setOwedSummaries(raw);
      } catch (e) {
        console.error('Failed to load debts', e);
        setErr('Could not fetch debts');
      }
    })();
  }, [selectedAccount, selectedGroup]);
  

  const handleSettleAll = async (debtor, creditor, amountWei) => {
    setErr('');
    setMsg('');
    setSettling(true);
  
    try {
      const c = await getContract();
  
      // ✅ Parse amount safely
      const totalWei = String(amountWei).replace(/[^\d]/g, '') || '0';
      const totalEthNum = parseFloat(web3.utils.fromWei(totalWei, 'ether'));
  
      if (!totalWei || totalEthNum <= 0) {
        throw new Error('Nothing to settle.');
      }
  
      const escrowRaw = await c.methods
        .groupEscrow(selectedGroup, debtor)
        .call({ from: creditor });
  
      const escrowEthNum = parseFloat(web3.utils.fromWei(escrowRaw, 'ether'));
      let txSuccessful = false;
  
      if (escrowEthNum >= totalEthNum) {
        await c.methods
          .settleFromEscrow(Number(selectedGroup), creditor, totalWei)
          .send({ from: debtor });
  
        setMsg(`Settled ${formatEth(totalWei)} from escrow`);
        txSuccessful = true;
      } else {
        const debtorUsername = findUsername(debtor);
        await c.methods
          .settleDebtByName(Number(selectedGroup), debtorUsername, totalWei)
          .send({ from: debtor, value: totalWei, gas: 500_000 });
  
        setMsg(`Paid ${formatEth(totalWei)} directly`);
        txSuccessful = true;
      }
  
      if (txSuccessful) {
        await axios.put("http://localhost:4000/api/settle", {
          groupId: Number(selectedGroup),
          debtor,
          creditor,
          amountWei: totalWei
        });
      }
    } catch (e) {
      console.error('Batch settlement failed', e);
      const reason = e.response?.data?.error || e.message;
      setErr('Settlement failed: ' + reason);
    } finally {
      setSettling(false);
      setSelectedGroup(g => g); // refresh
    }
  };
  
  
  
  

  return (
    <div className="settle-page">
      <h1>Settle Debts</h1>

      <div className="controls">
        <label>
          Account:
          <select
            value={selectedAccount}
            onChange={e => setSelectedAccount(e.target.value)}
          >
            {accounts.map(a => (
              <option key={a} value={a}>
                {shortAddr(a)} {findUsername(a)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Group:
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
          >
            <option value="">Select</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.id}: {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {owedSummaries.length > 0 && (
  <section>
    <h2>Outstanding Debts (Group {selectedGroup})</h2>
    <table>
      <thead>
        <tr>
          <th>Debtor</th>
          <th>Creditor</th>
          <th>Amount</th>
          <th>Settled</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {owedSummaries.map((d, i) => (
          <tr key={i}>
            <td>{findUsername(d.debtor)}</td>
            <td>{findUsername(d.creditor)}</td>
            <td>{formatEth(d.amountWei)}</td>
            <td>{d.settled ? '✅' : '❌'}</td>
            <td>
              {!d.settled && d.debtor === selectedAccount && (
                <button
                onClick={() => handleSettleAll(d.debtor, d.creditor, d.amountWei)}
                disabled={settling}
              >
                {settling ? 'Processing…' : 'Settle'}
              </button>
              )}
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
