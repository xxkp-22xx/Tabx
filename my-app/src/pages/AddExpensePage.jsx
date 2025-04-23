import React, { useState, useEffect } from 'react';
import BN from 'bn.js';
import web3 from '../utils/web3';
import getContract from '../utils/contract'; // ✅ Fix: correct import
import "../styles/styles.css";

export default function AddExpensePage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);

  const [splitName, setSplitName] = useState('');
  const [payer, setPayer] = useState('');
  const [participants, setParticipants] = useState([]);
  const [logic, setLogic] = useState('Equal');
  const [currency, setCurrency] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [customShares, setCustomShares] = useState({});

  const [ethToCad, setEthToCad] = useState(0);
  const [debts, setDebts] = useState([]);
  const [history, setHistory] = useState([]);

  const [editingIdx, setEditingIdx] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLogic, setEditLogic] = useState('Equal');
  const [editCurrency, setEditCurrency] = useState('ETH');
  const [editAmount, setEditAmount] = useState('');
  const [editSplits, setEditSplits] = useState({});

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const storageKey = selectedAccount ? `debts:${selectedAccount}` : null;
  const historyKey = selectedAccount ? `history:${selectedAccount}` : null;

  const findUsername = addr => {
    const u = registeredUsers.find(u => u.address === addr);
    return u ? u.username : addr;
  };
  const formatEth = wei => `${Number(web3.utils.fromWei(wei, 'ether')).toFixed(4)} ETH`;
  const formatCad = cad => `${Number(cad).toFixed(2)} CAD`;

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=cad');
        const data = await res.json();
        setEthToCad(data.ethereum.cad || 0);
      } catch {
        console.error('Failed to fetch ETH->CAD');
      }
    };
    fetchRate();
    const id = setInterval(fetchRate, 300000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    web3.eth.getAccounts().then(accs => {
      setAccounts(accs);
      if (accs[0]) setSelectedAccount(accs[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    setDebts(JSON.parse(localStorage.getItem(storageKey)) || []);
    setHistory(JSON.parse(localStorage.getItem(historyKey)) || []);
    (async () => {
      const contract = await getContract(); // ✅ Fix here
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
    })();
  }, [selectedAccount, accounts, storageKey, historyKey]);

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(debts));
  }, [debts, storageKey]);

  useEffect(() => {
    if (historyKey) localStorage.setItem(historyKey, JSON.stringify(history));
  }, [history, historyKey]);

  useEffect(() => {
    if (!selectedGroup) return;
    (async () => {
      const contract = await getContract(); // ✅ Fix here too
      const members = await contract.methods.getGroupMembers(selectedGroup).call({ from: selectedAccount });
      setGroupMembers(members);
      setParticipants([]);
    })();
  }, [selectedGroup, selectedAccount]);

  const toggleParticipant = addr =>
    setParticipants(ps => (ps.includes(addr) ? ps.filter(a => a !== addr) : [...ps, addr]));
  const handleCustomChange = (addr, val) =>
    setCustomShares(cs => ({ ...cs, [addr]: val }));

  // Add new split
  const handleAdd = async e => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (!splitName || !payer || participants.length === 0 || !amount) {
      return setErr('Please complete the form');
    }

    const contract = await getContract();
    const ethVal = currency === 'CAD' ? (Number(amount) / ethToCad).toString() : amount;
    const raw = new BN(web3.utils.toWei(ethVal, 'ether'));
    let shares = [];

    if (logic === 'Equal') {
      const cnt = new BN(participants.length.toString());
      const each = raw.div(cnt);
      let acc = new BN('0');
      participants.forEach((_, i) => {
        let s = each;
        if (i === participants.length - 1) s = raw.sub(acc);
        else acc = acc.add(each);
        shares.push(s);
      });
    } else {
      let acc = new BN('0');
      participants.forEach(a => {
        const bn = new BN(web3.utils.toWei(customShares[a] || '0', 'ether'));
        acc = acc.add(bn);
        shares.push(bn);
      });
      if (!acc.eq(raw)) shares[shares.length - 1] = shares[shares.length - 1].add(raw.sub(acc));
    }

    try {
      const txns = participants.filter(d => d !== payer).map(async (d, i) => {
        const weiStr = shares[i].toString();
        return await contract.methods.addDebt(selectedGroup, payer, weiStr).send({ from: d });
      });
      await Promise.all(txns);
      setMsg('Expense submitted to chain for settlement');
    } catch (err) {
      console.error(err);
      setErr('Failed to submit on-chain debts');
    }
  };

  // Start edit
  const startEdit = idx => {
    const txn = history[idx]; if (txn.type !== 'create') return;
    setEditingIdx(idx);
    setEditName(txn.name);
    setEditLogic(txn.logic);
    setEditCurrency(txn.currency);
    setEditAmount(txn.amount);
    const init = {};
    txn.splits.forEach(s => init[s.debtor] = web3.utils.fromWei(s.amountWei, 'ether'));
    setEditSplits(init);
  };

  // Submit edit
  const submitEdit = idx => {
    const newSplits = Object.entries(editSplits).map(([deb, val]) => ({ debtor: deb, amountWei: web3.utils.toWei(val || '0', 'ether') }));
    const orig = history[idx];
    const prop = { type: 'edit', originalIdx: idx, name: editName, payer: orig.payer, splits: newSplits, approvals: [], logic: editLogic, currency: editCurrency, amount: editAmount, timestamp: new Date().toLocaleString(), groupId: selectedGroup };
    setHistory(h => [...h, prop]); setEditingIdx(null); setMsg('Edit proposed; awaiting approvals');
  };

  // Propose delete
  const proposeDelete = idx => {
    const txn = history[idx]; if (txn.type !== 'create') return;
    const prop = { type: 'delete', originalIdx: idx, splits: txn.splits, approvals: [], timestamp: new Date().toLocaleString(), groupId: selectedGroup };
    setHistory(h => [...h, prop]); setMsg('Delete proposed; awaiting approvals');
  };

  // Approve
  const handleApprove = async idx => {
    setErr(''); setMsg('');
    try {
      // prompt user with a zero-value transaction to get signature
      await web3.eth.sendTransaction({ from: selectedAccount, to: selectedAccount, value: '0' });
    } catch (e) {
      return setErr('Approval failed');
    }
    // update approvals
    const txn = history[idx];
    const prevApprovals = txn.approvals || [];
    const newApprovals = Array.from(new Set([...prevApprovals, selectedAccount]));
    const updatedTxn = { ...txn, approvals: newApprovals };
    const newHistory = [...history];
    newHistory[idx] = updatedTxn;

    // if all have approved, finalize and remove from history
    if (newApprovals.length === txn.splits.length) {
      // finalize into debts
      let updatedDebts = [...debts];
      if (txn.type === 'create') {
        updatedDebts = updatedDebts.concat(
          txn.splits.map(s => ({ groupId: txn.groupId, debtor: s.debtor, creditor: txn.payer, amountWei: s.amountWei }))
        );
        setMsg('Split executed');
      } else if (txn.type === 'edit') {
        const orig = history[txn.originalIdx];
        // remove old entries
        updatedDebts = updatedDebts.filter(d =>
          !orig.splits.some(s => s.debtor === d.debtor && s.amountWei === d.amountWei)
        );
        // add new ones
        updatedDebts = updatedDebts.concat(
          txn.splits.map(s => ({ groupId: txn.groupId, debtor: s.debtor, creditor: orig.payer, amountWei: s.amountWei }))
        );
        setMsg('Edit executed');
      } else if (txn.type === 'delete') {
        updatedDebts = updatedDebts.filter(d =>
          !txn.splits.some(s => s.debtor === d.debtor && s.amountWei === d.amountWei)
        );
        setMsg('Delete executed');
      }
      setDebts(updatedDebts);
      // remove transaction
      // newHistory.splice(idx, 1);
    }

    setHistory(newHistory);
  };

  // Compute totals
  const totals = {};
  debts
    .filter(d => d.groupId === selectedGroup)
    .forEach(d => {
      totals[d.debtor] = (totals[d.debtor] || new BN('0')).add(new BN(d.amountWei));
    });
  const ethToHuman = wei => web3.utils.fromWei(wei, 'ether');

  return (
    <div className="expense-container">
      <h1>Add Expense</h1>
      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}

      {/* Expense Form */}
      <form onSubmit={handleAdd}>
        <label>
          Group:
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            required
          >
            <option value="">Select</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.id}: {g.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Split Name:
          <input
            type="text"
            value={splitName}
            onChange={e => setSplitName(e.target.value)}
            required
          />
        </label>

        <label>
          Payer:
          <select
            value={payer}
            onChange={e => setPayer(e.target.value)}
            required
          >
            <option value="">Select</option>
            {groupMembers.map(m => (
              <option key={m} value={m}>
                {findUsername(m)}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p>Participants:</p>
          {groupMembers.map(m => (
            <label key={m} style={{ marginRight: '1rem' }}>
              <input
                type="checkbox"
                checked={participants.includes(m)}
                onChange={() => toggleParticipant(m)}
              />
              {findUsername(m)}
            </label>
          ))}
        </div>

        <label>
          Logic:
          <select value={logic} onChange={e => setLogic(e.target.value)}>
            <option>Equal</option>
            <option>Custom</option>
          </select>
        </label>

        {logic === 'Custom' && (
          <div className="full-width">
            <p>Custom Shares (ETH):</p>
            {participants.map(m => (
              <div key={m}>
                <label>
                  {findUsername(m)}:
                  <input
                    type="number"
                    step="0.01"
                    value={customShares[m] || ''}
                    onChange={e => handleCustomChange(m, e.target.value)}
                    required
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        <label>
          Currency:
          <select value={currency} onChange={e => setCurrency(e.target.value)}>
            <option>ETH</option>
            <option>CAD</option>
          </select>
        </label>

        <label>
          Amount ({currency}):
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
          {currency === 'CAD' && ethToCad > 0 && (
            <span> ≈ {formatEth(web3.utils.toWei((Number(amount) / ethToCad).toString(), 'ether'))}</span>
          )}
        </label>

        <button type="submit">Add Expense</button>
      </form>

      {/* Totals Table */}
      {selectedGroup && (
        <section>
          <h2>Totals in Group {selectedGroup}</h2>
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>ETH</th>
                <th>CAD</th>
              </tr>
            </thead>
            <tbody>
              {groupMembers.map(m => {
                const ethTotal = ethToHuman((totals[m] || new BN('0')).toString());
                const cadTotal = (Number(ethTotal) * ethToCad).toFixed(2);
                return (
                  <tr key={m}>
                    <td>{findUsername(m)}</td>
                    <td>{formatEth((totals[m] || new BN('0')).toString())}</td>
                    <td>{formatCad(cadTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* History & Approvals */}
      {selectedGroup && history.filter(tx => tx.groupId === selectedGroup).length > 0 && (
        <section>
          <h2>History & Approvals</h2>
          <ul>
            {history
              .filter(tx => tx.groupId === selectedGroup)
              .map((txn, idx) => (
                <li key={idx} style={{ marginBottom: '1em' }}>
                  <div>
                    <strong>{txn.name}</strong> by {findUsername(txn.payer)} on {txn.timestamp} —{' '}
                    {formatEth(
                      txn.splits
                        .reduce((sum, s) => sum.add(new BN(s.amountWei)), new BN('0'))
                        .toString()
                    )}{' '}
                    ({txn.amount}
                    {txn.currency})
                  </div>
                  <div>
                    Pending:{' '}
                    {(txn.splits || [])
                      .map(s => s.debtor)
                      .filter(d => !(txn.approvals || []).includes(d))
                      .map(d => findUsername(d))
                      .join(', ') || 'None'}
                    {txn.type === 'create' && (txn.approvals || []).length === 0 && (
                      <>
                        <button onClick={() => startEdit(idx)} style={{ marginLeft: '1em' }}>
                          Edit
                        </button>
                        <button onClick={() => proposeDelete(idx)} style={{ marginLeft: '0.5em' }}>
                          Delete
                        </button>
                      </>
                    )}
                    {(txn.splits || [])
                      .map(s => s.debtor)
                      .filter(d => !(txn.approvals || []).includes(d))
                      .includes(selectedAccount) && (
                      <button onClick={() => handleApprove(idx)} style={{ marginLeft: '1em' }}>
                        Approve
                      </button>
                    )}
                  </div>
                  {editingIdx === idx && (
                    <div style={{ padding: '1em', border: '1px solid #ccc', marginTop: '0.5em' }}>
                      <h3>Edit Split</h3>
                      <label>
                        Name: <input value={editName} onChange={e => setEditName(e.target.value)} />
                      </label>
                      <label>
                        Logic:{' '}
                        <select value={editLogic} onChange={e => setEditLogic(e.target.value)}>
                          <option>Equal</option>
                          <option>Custom</option>
                        </select>
                      </label>
                      <label>
                        Currency:{' '}
                        <select value={editCurrency} onChange={e => setEditCurrency(e.target.value)}>
                          <option>ETH</option>
                          <option>CAD</option>
                        </select>
                      </label>
                      <label>
                        Amount:{' '}
                        <input value={editAmount} onChange={e => setEditAmount(e.target.value)} />
                      </label>
                      {editLogic === 'Custom' &&
                        txn.splits.map((s, i) => (
                          <div key={i}>
                            <label>
                              {findUsername(s.debtor)}:{' '}
                              <input
                                value={editSplits[s.debtor] || ''}
                                onChange={e =>
                                  setEditSplits(es => ({
                                    ...es,
                                    [s.debtor]: e.target.value
                                  }))
                                }
                              />
                            </label>
                          </div>
                        ))}
                      <button onClick={() => submitEdit(idx)}>Submit Edit</button>
                      <button onClick={() => setEditingIdx(null)} style={{ marginLeft: '0.5em' }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Detailed Debts */}
      {selectedGroup && (
        <section>
          <h2>Detailed Debts for Group {selectedGroup}</h2>
          {debts.filter(d => d.groupId === selectedGroup).length === 0 ? (
            <p>No debts yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Debtor</th>
                  <th>Creditor</th>
                  <th>Amount (ETH)</th>
                </tr>
              </thead>
              <tbody>
                {debts
                  .filter(d => d.groupId === selectedGroup)
                  .map((d, i) => (
                    <tr key={i}>
                      <td>{findUsername(d.debtor)}</td>
                      <td>{findUsername(d.creditor)}</td>
                      <td>{formatEth(d.amountWei)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
