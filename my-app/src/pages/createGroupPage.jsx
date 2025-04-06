import React, { useState, useEffect } from "react";
import web3 from "../utils/web3";
import contract from "../utils/contract";

const GroupPage = () => {
  const [groupName, setGroupName] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [memberAddresses, setMemberAddresses] = useState([""]); // Initially one empty field
  const [txStatus, setTxStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAccounts = async () => {
      const accs = await web3.eth.getAccounts();
      setAccounts(accs);
      setSelectedAccount(accs[0]);
    };
    loadAccounts();
  }, []);

  const handleAddMemberField = () => {
    setMemberAddresses([...memberAddresses, ""]);
  };

  const handleMemberChange = (index, value) => {
    const updated = [...memberAddresses];
    updated[index] = value;
    setMemberAddresses(updated);
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    setLoading(true);
    setError("");
    setTxStatus("Creating group...");

    try {
      const tx = await contract.methods
        .createGroup(groupName)
        .send({ from: selectedAccount });

      const event = tx.events.GroupCreated;
      if (!event || !event.returnValues.groupId) {
        throw new Error("GroupCreated event not found");
      }

      const groupId = event.returnValues.groupId;
      setTxStatus(`Group "${groupName}" created with ID: ${groupId}`);

      // Add members
      for (const addr of memberAddresses) {
        if (web3.utils.isAddress(addr) && addr !== selectedAccount) {
          await contract.methods
            .addGroupMember(groupId, addr)
            .send({ from: selectedAccount });
          setTxStatus((prev) => `${prev}\nMember added: ${addr}`);
        }
      }

      setGroupName("");
      setMemberAddresses([""]);
    } catch (err) {
      console.error(err);
      setError(`Group creation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Create New Group</h2>

      {error && <div style={styles.error}>{error}</div>}
      {txStatus && <div style={styles.status}>{txStatus}</div>}

      <label style={styles.label}>Select Account:</label>
      <select
        value={selectedAccount}
        onChange={(e) => setSelectedAccount(e.target.value)}
        style={styles.select}
      >
        {accounts.map((acc) => (
          <option key={acc} value={acc}>
            {acc}
          </option>
        ))}
      </select>

      <label style={styles.label}>Group Name:</label>
      <input
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        style={styles.input}
        placeholder="Enter group name"
      />

      <label style={styles.label}>Add Members (addresses):</label>
      {memberAddresses.map((addr, i) => (
        <input
          key={i}
          type="text"
          value={addr}
          onChange={(e) => handleMemberChange(i, e.target.value)}
          style={{ ...styles.input, marginBottom: "10px" }}
          placeholder="0x..."
        />
      ))}

      <button onClick={handleAddMemberField} style={styles.secondaryButton}>
        + Add Another Member
      </button>

      <button
        onClick={createGroup}
        style={styles.primaryButton}
        disabled={loading}
      >
        {loading ? "Creating..." : "Create Group"}
      </button>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "600px",
    margin: "auto",
    padding: "20px",
    textAlign: "left",
  },
  heading: {
    fontSize: "24px",
    marginBottom: "20px",
    color: "#333",
  },
  label: {
    fontWeight: "600",
    marginTop: "15px",
    display: "block",
  },
  input: {
    width: "100%",
    padding: "10px",
    fontSize: "16px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    marginBottom: "10px",
  },
  select: {
    width: "100%",
    padding: "10px",
    fontSize: "16px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    marginBottom: "10px",
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
    color: "white",
    padding: "12px 20px",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "20px",
  },
  secondaryButton: {
    backgroundColor: "#eee",
    color: "#333",
    padding: "8px 14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "10px",
    marginBottom: "20px",
  },
  error: {
    color: "#d32f2f",
    backgroundColor: "#fde0e0",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "10px",
  },
  status: {
    color: "#1976d2",
    backgroundColor: "#e3f2fd",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "10px",
    whiteSpace: "pre-line",
  },
};

export default GroupPage;
