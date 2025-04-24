import React, { useState, useEffect, useRef } from "react";
import BN from "bn.js";
import web3 from "../utils/web3";
import getContract from "../utils/contract";
import "../styles/styles.css";
import axios from "axios";

export default function AddExpensePage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);

  const [splitName, setSplitName] = useState("");
  const [payer, setPayer] = useState("");
  const [participants, setParticipants] = useState([]);
  const [logic, setLogic] = useState("Equal");
  const [currency, setCurrency] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [customShares, setCustomShares] = useState({});

  const [ethToCad, setEthToCad] = useState(0);
  const [history, setHistory] = useState([]);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const contractRef = useRef(null);

  // Helpers
  const findUsername = (addr) => {
    const u = registeredUsers.find((u) => u.address === addr);
    return u ? u.username : addr;
  };
  const formatEth = (wei) =>
    `${Number(web3.utils.fromWei(wei, "ether")).toFixed(4)} ETH`;

  // 1) Load web3 accounts & contract
  useEffect(() => {
    (async () => {
      const accs = await web3.eth.getAccounts();
      setAccounts(accs);
      setSelectedAccount(accs[0] || "");
      contractRef.current = await getContract();
    })();
  }, []);

  // 2) Connect button
  const connectWallet = async () => {
    try {
      const accs = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccounts(accs);
      setSelectedAccount(accs[0]);
    } catch {
      setErr("Wallet authorization required");
    }
  };

  // 3) Fetch registered users
  useEffect(() => {
    if (!contractRef.current || !selectedAccount) return;
    (async () => {
      const c = contractRef.current;
      const regs = [];
      for (let a of accounts) {
        if (await c.methods.registered(a).call({ from: selectedAccount })) {
          regs.push({
            address: a,
            username: await c.methods
              .usernameOf(a)
              .call({ from: selectedAccount }),
          });
        }
      }
      setRegisteredUsers(regs);
    })();
  }, [selectedAccount, accounts]);

  // 4) Fetch groups
  useEffect(() => {
    if (!contractRef.current || !selectedAccount) return;
    (async () => {
      const c = contractRef.current;
      const cnt = Number(
        await c.methods.groupCount().call({ from: selectedAccount })
      );
      const gs = [];
      for (let i = 1; i <= cnt; i++) {
        const info = await c.methods
          .getGroupInfo(i)
          .call({ from: selectedAccount });
        if (!info.exists) continue;
        gs.push({ id: i, name: info.name });
      }
      setGroups(gs);
    })();
  }, [selectedAccount]);

  // 5) Fetch group members
  useEffect(() => {
    if (!contractRef.current || !selectedGroup) {
      setGroupMembers([]);
      return;
    }
    (async () => {
      const members = await contractRef.current.methods
        .getGroupMembers(selectedGroup)
        .call({ from: selectedAccount });
      setGroupMembers(members);
      setParticipants([]);
    })();
  }, [selectedGroup, selectedAccount]);

  // 6) Fetch split history from on-chain events
  useEffect(() => {
    if (!contractRef.current || !selectedGroup) {
      setHistory([]);
      return;
    }
    (async () => {
      const c = contractRef.current;
      const opts = {
        filter: { groupId: selectedGroup },
        fromBlock: 0,
        toBlock: "latest",
      };
      let events = [];
      try {
        const evts = await c.getPastEvents("SplitCreated", opts);
        events = evts.map((e) => ({
          name: e.returnValues.name,
          payer: e.returnValues.payer,
          debtors: e.returnValues.debtors, // array
          amounts: e.returnValues.amounts, // array
          timestamp: e.returnValues.timestamp, // unix seconds
        }));
        // sort by timestamp
        events.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
      } catch (e) {
        console.warn("No SplitCreated events or failed to fetch");
      }
      setHistory(events);
    })();
  }, [selectedGroup, selectedAccount]);

  // Helpers for form
  const toggleParticipant = (addr) =>
    setParticipants((ps) =>
      ps.includes(addr) ? ps.filter((x) => x !== addr) : [...ps, addr]
    );
  const handleCustomChange = (addr, v) =>
    setCustomShares((cs) => ({ ...cs, [addr]: v }));

  // 7) Propose & immediately execute on-chain
  const handleAdd = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
  
    if (!selectedAccount) {
      return setErr("Connect your wallet first");
    }
    if (!splitName || !payer || participants.length === 0 || !amount) {
      return setErr("Please complete the form");
    }
  
    // 1) CAD→ETH guard
    let ethVal;
    if (currency === "CAD") {
      if (!ethToCad || ethToCad === 0) {
        return setErr("ETH→CAD rate not loaded yet, please wait");
      }
      const conv = Number(amount) / ethToCad;
      if (!isFinite(conv)) {
        return setErr("Invalid CAD/ETH conversion");
      }
      ethVal = conv.toString();
    } else {
      ethVal = amount.toString();
    }
  
    try {
      // ensure wallet is unlocked
      await window.ethereum.request({ method: "eth_requestAccounts" });
  
      // 2) compute raw and shares
      const raw = new BN(web3.utils.toWei(ethVal, "ether"));
      const shareMap = {};
      let shares = [];
  
      if (logic === "Equal") {
        const cnt  = new BN(participants.length.toString());
        const each = raw.div(cnt);
        let acc = new BN("0");
        participants.forEach((name, i) => {
          let s = each;
          if (i === participants.length - 1) {
            s = raw.sub(acc);
          } else {
            acc = acc.add(each);
          }
          shares.push(s);
          shareMap[name] = s.toString();
        });
      } else {
        let acc = new BN("0");
        participants.forEach(name => {
          const bn = new BN(web3.utils.toWei(customShares[name]||"0","ether"));
          acc = acc.add(bn);
          shares.push(bn);
          shareMap[name] = bn.toString();
        });
        if (!acc.eq(raw)) {
          const last = participants[participants.length - 1];
          const adjust = raw.sub(acc);
          shares[shares.length - 1] = shares[shares.length - 1].add(adjust);
          shareMap[last] = shares[shares.length - 1].toString();
        }
      }
  
      const debtors = participants.filter(d => d !== payer);
      const amounts = debtors.map((_,i) => shares[i].toString());
  
      // 3) on-chain
      await contractRef.current.methods
        .createSplit(selectedGroup, splitName, debtors, amounts)
        .send({ from: selectedAccount });
  
      setMsg("Split created on-chain");
  
      // 4) record expense
      await axios.post("http://localhost:4000/api/expenses", {
        groupId:    Number(selectedGroup),
        totalWei:   raw.toString(),
        payer,
        participants,
        shares:     shareMap,
      });
  
      // 5) now create individual debts (settled:false)
      await Promise.all(
        debtors.map(debtor =>
          axios.post("http://localhost:4000/api/debts", {
            groupId:    Number(selectedGroup),
            debtor,
            creditor:   payer,
            amountWei:  shareMap[debtor],
            settled:    false,
            timestamp:  new Date()
          })
        )
      );
  
      setMsg("Expense and debts recorded successfully!");
    } catch (err) {
      console.error(err);
      setErr("Error occurred while adding expense");
    }
  };

  return (
    <div className="expense-container">
      <h1>Add Expense</h1>
      <button onClick={connectWallet}>Connect Wallet</button>
      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <form onSubmit={handleAdd}>
        <label>
          Group:
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            required
          >
            <option value="">Select</option>
            {groups.map((g) => (
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
            onChange={(e) => setSplitName(e.target.value)}
            required
          />
        </label>

        <label>
          Payer:
          <select
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
            required
          >
            <option value="">Select</option>
            {groupMembers.map((m) => (
              <option key={m} value={m}>
                {findUsername(m)}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p>Participants:</p>
          {groupMembers.map((m) => (
            <label key={m} style={{ marginRight: "1rem" }}>
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
          <select value={logic} onChange={(e) => setLogic(e.target.value)}>
            <option>Equal</option>
            <option>Custom</option>
          </select>
        </label>

        {logic === "Custom" && (
          <div>
            {participants.map((m) => (
              <div key={m}>
                <label>
                  {findUsername(m)}:
                  <input
                    type="number"
                    step="0.01"
                    value={customShares[m] || ""}
                    onChange={(e) => handleCustomChange(m, e.target.value)}
                    required
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        <label>
          Currency:
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
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
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <button type="submit">Create Split</button>
      </form>

      {selectedGroup && history.length > 0 && (
        <section>
          <h2>Split History for Group {selectedGroup}</h2>
          <ul>
            {history.map((txn, idx) => (
              <li key={idx} style={{ marginBottom: "1em" }}>
                <strong>{txn.name}</strong> by {findUsername(txn.payer)} @{" "}
                {new Date(Number(txn.timestamp) * 1000).toLocaleString()}
                <br />
                Total:{" "}
                {formatEth(
                  txn.amounts
                    .reduce((sum, a) => sum.add(new BN(a)), new BN("0"))
                    .toString()
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
