import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import web3 from '../utils/web3';
import contract from '../utils/contract';
import "../styles/styles.css";

const SettlePage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [amountWei, setAmountWei] = useState('');
  const [maxDebtWei, setMaxDebtWei] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bal, setBal] = useState('');

  useEffect(() => {
    const fetchDebtAmount = async () => {
      try {
        console.log("Debtor address:", state.debtor);
        const balance = await contract.methods.getUserBalanceFormatted(state.debtor, state.groupId).call();
        const ParsedBalWei = parseInt(balance)
        const bal = web3.utils.fromWei(parseInt(balance), 'ether');
        console.log("Fetched balance:", ParsedBalWei);
        console.log("Converted balance ETH:", bal);
        
        // Convert negative balance (debt) to positive wei amount
        setMaxDebtWei(ParsedBalWei);
        setBal(bal);
        
        // Set default amount to full debt (or empty if no debt)
        // setAmountWei(debtWei === '0' ? '' : debtWei);
      } catch (err) {
        console.error("Failed to fetch debt amount:", err);
      }
    };

    fetchDebtAmount();
  }, [state.debtor, state.groupId]);

  const handleSettle = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Convert amount to number for validation
      const amount = Number(amountWei);
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid positive amount');
      }

      // Validate against max debt
      if (amount > Number(maxDebtWei)) {
        throw new Error(`Amount exceeds your debt of ${web3.utils.fromWei(maxDebtWei, 'ether')} ETH`);
      }

      const accounts = await web3.eth.getAccounts();
      const currentAccount = accounts[0];

      // Verify account has sufficient balance
      const balance = await web3.eth.getBalance(currentAccount);
      if (Number(balance) < amount) {
        throw new Error(`Insufficient balance. You need at least ${web3.utils.fromWei(amountWei, 'ether')} ETH`);
      }

      // Execute transaction
      const receipt = await contract.methods.settleDebtByName(
        state.groupId,
        state.debtor,
        state.creditor,
        amountWei
      ).send({ 
        from: currentAccount, 
        value: amountWei,
        gas: 3000000
      });

      setSuccess(`
        Debt settled successfully!
        Amount: ${web3.utils.fromWei(amountWei, 'ether')} ETH
      `);
      
      setTimeout(() => {
        navigate(`/groups/${state.groupId}/debts`);
      }, 3000);

    } catch (err) {
      let errorMessage = err.message;
      
      if (errorMessage.includes("revert")) {
        if (errorMessage.includes("Debtor username not found")) errorMessage = "Debtor not found";
        else if (errorMessage.includes("Creditor username not found")) errorMessage = "Creditor not found";
        else if (errorMessage.includes("Debtor has no debt")) errorMessage = "You don't owe this amount";
        else if (errorMessage.includes("Creditor is not owed")) errorMessage = "Creditor can't receive this amount";
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
        <p><strong>Total Debt:</strong> {maxDebtWei} WEI,  {bal} ETH</p>
      </div>

      <form onSubmit={handleSettle} className="settle-form">
        <div className="form-group">
          <label>Amount to Pay (wei)</label>
          <input
            type="text"
            value={amountWei}
            onChange={(e) => setAmountWei(e.target.value)}
            placeholder={`Max: ${maxDebtWei} wei`}
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