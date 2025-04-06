import React, { useState, useEffect } from "react";
import web3 from "../utils/web3";
import contract from "../utils/contract";

const AccountOption = ({ account }) => {
  const [balance, setBalance] = useState('');

  useEffect(() => {
    const loadBalance = async () => {
      const accountBalance = await web3.eth.getBalance(account);
      setBalance(web3.utils.fromWei(accountBalance, 'ether'));
    };
    loadBalance();
  }, [account]);

  return (
    <option value={account}>
      {account} ({balance} ETH)
    </option>
  );
};

const RegisterUserPage = () => {
  const [username, setUsername] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null); // NEW: optional

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const availableAccounts = await web3.eth.getAccounts();
        setAccounts(availableAccounts);
        if (availableAccounts.length > 0) {
          setSelectedAccount(availableAccounts[0]);
        }
      } catch (err) {
        setError('Failed to load accounts: ' + err.message);
      }
    };
    loadAccounts();
  }, []);

  const registerUser = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      setLoading(true);
      setTxStatus('Processing registration...');
      setError('');

      await contract.methods.registerUser(username).send({ 
        from: selectedAccount,
        gas: 300000 
      });

      // Optional: Save user locally
      setRegisteredUser({
        address: selectedAccount,
        username: username
      });

      setTxStatus('Registration successful!');
      setUsername('');
    } catch (err) {
      setError(`Registration failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Register New User</h2>

      {error && <div style={styles.errorMessage}>{error}</div>}
      {txStatus && <div style={styles.statusMessage}>{txStatus}</div>}

      <div style={styles.formGroup}>
        <label style={styles.label}>
          Select Account:
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            style={styles.select}
          >
            {accounts.map((account) => (
              <AccountOption key={account} account={account} />
            ))}
          </select>
        </label>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>
          Username:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            placeholder="Enter your username"
          />
        </label>
      </div>

      <button
        onClick={registerUser}
        style={styles.registerButton}
        disabled={!username || !selectedAccount || loading}
      >
        {loading ? 'Registering...' : 'Register'}
      </button>
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    maxWidth: "600px",
    margin: "0 auto",
    textAlign: "center",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "20px",
    color: "#333",
  },
  formGroup: {
    marginBottom: "20px",
    textAlign: "left",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "500",
  },
  select: {
    width: "100%",
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "white",
    marginBottom: "15px",
  },
  input: {
    width: "100%",
    padding: "10px",
    fontSize: "16px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxSizing: "border-box",
  },
  registerButton: {
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    padding: "12px 24px",
    fontSize: "16px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  errorMessage: {
    color: "#d32f2f",
    backgroundColor: "#fde0e0",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "20px",
  },
  statusMessage: {
    color: "#1976d2",
    backgroundColor: "#e3f2fd",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "20px",
  },
};

export default RegisterUserPage;
