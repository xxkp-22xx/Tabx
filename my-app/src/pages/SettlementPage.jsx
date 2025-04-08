import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import web3 from '../utils/web3';
import contract from '../utils/contract';
import "../styles/styles.css";

const SettlePage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [amountWei, setAmountWei] = useState(state?.amount || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSettle = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Basic validation
      if (!amountWei || isNaN(amountWei)) {
        throw new Error('Please enter a valid amount in wei');
      }

      const accounts = await web3.eth.getAccounts();
      const currentAccount = accounts[0];

      // Verify account has sufficient balance
      const balance = await web3.eth.getBalance(currentAccount);
      if (Number(balance) < Number(amountWei)) {
        throw new Error(`Insufficient balance. You need at least ${web3.utils.fromWei(amountWei, 'ether')} ETH`);
      }

      // Execute transaction with fixed gas
      const receipt = await contract.methods.settleDebtByName(
        state.groupId,
        state.debtor,
        state.creditor,
        amountWei
      ).send({ 
        from: currentAccount, 
        value: amountWei,
        gas: 3000000 // Fixed gas limit
      });
      console.log('Transaction receipt:', receipt);

      setSuccess(`
        Debt settled successfully!
        Amount: ${web3.utils.fromWei(amountWei, 'ether')} ETH
      `);
      
      // Refresh after 3 seconds
      setTimeout(() => {
        navigate(`/groups/${state.groupId}/debts`);
      }, 3000);

    } catch (err) {
      let errorMessage = err.message;
      
      // Simplify error parsing
      if (errorMessage.includes("revert")) {
        if (errorMessage.includes("Debtor username not found")) errorMessage = "Debtor not found";
        else if (errorMessage.includes("Creditor username not found")) errorMessage = "Creditor not found";
        else if (errorMessage.includes("Debtor balance")) errorMessage = "Debtor doesn't owe this amount";
        else if (errorMessage.includes("Creditor balance")) errorMessage = "Creditor can't receive this amount";
        else if (errorMessage.includes("Cannot pay yourself")) errorMessage = "Can't pay yourself";
      }
      
      setError(`Transaction failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settle-container">
      <h1>Settle Debt</h1>
      <button 
        onClick={() => navigate(`/groups/${state.groupId}/debts`)}
        className="back-button"
      >
        ← Back to Group
      </button>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="debt-info">
        <h2>Debt Details</h2>
        <p><strong>Group:</strong> {state.groupId}</p>
        <p><strong>You Owe To:</strong> {state.creditor}</p>
        <p><strong>Total Debt:</strong> {state.amountEth} ETH</p>
      </div>

      <form onSubmit={handleSettle} className="settle-form">
        <div className="form-group">
          <label>Amount to Pay (wei)</label>
          <input
            type="text"
            value={amountWei}
            onChange={(e) => setAmountWei(e.target.value)}
            placeholder={`Max: ${state.amount} wei`}
            required
          />
          <small className="eth-value">
            ≈ {web3.utils.fromWei(amountWei || '0', 'ether')} ETH
          </small>
        </div>

        <button 
          type="submit" 
          className="settle-button" 
          disabled={loading || !amountWei}
        >
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </div>
  );
};

export default SettlePage;