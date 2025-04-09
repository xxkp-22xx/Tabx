import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import web3 from '../utils/web3';
import contract from '../utils/contract';
import "../styles/styles.css";

const GroupDebtsPage = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [memberDebts, setMemberDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settleModal, setSettleModal] = useState({
    show: false,
    debtor: '',
    creditor: '',
    amountWei: '',
    amountEth: '',
    groupId: null
  });
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState('');
  const [settleSuccess, setSettleSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const groupCount = await contract.methods.groupIdCounter().call();
        const loadedGroups = [];

        for (let i = 1; i <= groupCount; i++) {
          const group = await contract.methods.groups(i).call();
          const members = await contract.methods.getGroupMembers(i).call();
          const totalExpenses = await contract.methods.getGroupExpenses(i).call();

          loadedGroups.push({
            id: i,
            name: group.name,
            owner: group.owner,
            memberCount: members.length,
            totalExpenses: web3.utils.fromWei(totalExpenses, 'ether')
          });
        }
        setGroups(loadedGroups);
      } catch (err) {
        setError(`Failed to load groups: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const formatDebtAmount = (weiAmount) => {
    try {
      // Remove any decimal points from WEI amount (WEI should be integer)
      const cleanWei = weiAmount.toString().split('.')[0];
      const parsedWei = parseInt(cleanWei);
      
      // Convert to ETH with 2 decimal places
      const ethAmount = web3.utils.fromWei(parsedWei.toString(), 'ether');
      const formattedEth = parseFloat(ethAmount).toFixed(2);
      
      return `${formattedEth} ETH/${parsedWei} WEI`;
    } catch (error) {
      console.error('Error formatting debt amount:', error);
      return '0.00 ETH/0 WEI';
    }
  };

  const fetchMemberDebts = async (groupId) => {
    try {
      setLoading(true);
      setError('');

      const members = await contract.methods.getGroupMembers(groupId).call();
      const debts = [];

      for (const member of members) {
        const user = await contract.methods.users(member).call();
        const username = user.username || member.substring(0, 8) + '...';

        const formattedBalance = await contract.methods.getUserBalanceFormatted(
          user.username || member,
          groupId
        ).call();

        const debtData = await contract.methods.getUserDebts(member, groupId).call();
        const creditors = debtData[0] || [];
        const amounts = debtData[1] || [];
        const settledStatus = debtData[2] || [];

        const processedDebts = await Promise.all(
          creditors.map(async (creditor, index) => {
            const creditorUser = await contract.methods.users(creditor).call();
            const rawWeiAmount = amounts[index];
            
            // Format the display amount
            const displayAmount = formatDebtAmount(rawWeiAmount);
            const ethAmount = web3.utils.fromWei(
              parseInt(rawWeiAmount.toString().split('.')[0]).toString(), 
              'ether'
            );

            return {
              creditor,
              creditorName: creditorUser.username || creditor.substring(0, 6) + '...',
              debtor: member,
              debtorName: username,
              amount: displayAmount,
              amountWei: parseInt(rawWeiAmount.toString().split('.')[0]),
              amountEth: parseFloat(ethAmount).toFixed(2),
              settled: settledStatus[index]
            };
          })
        );

        debts.push({
          username,
          address: member,
          formattedBalance,
          debts: processedDebts
        });
      }

      setMemberDebts(debts);
      setSelectedGroup(groupId);
    } catch (err) {
      console.error('Error loading debts:', err);
      setError(`Failed to load member debts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openSettleModal = (debtor, creditor, amountWei, amountEth, groupId) => {
    setSettleModal({
      show: true,
      debtor,
      creditor,
      amountWei,
      amountEth,
      groupId
    });
  };

  const closeSettleModal = () => {
    setSettleModal({
      show: false,
      debtor: '',
      creditor: '',
      amountWei: '',
      amountEth: '',
      groupId: null
    });
    setSettleError('');
    setSettleSuccess('');
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    try {
      setSettleLoading(true);
      setSettleError('');
      setSettleSuccess('');

      const amount = Number(settleModal.amountWei);
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid positive amount');
      }

      const accounts = await web3.eth.getAccounts();
      const currentAccount = accounts[0];

      const balance = await web3.eth.getBalance(currentAccount);
      if (Number(balance) < amount) {
        throw new Error(`Insufficient balance. You need at least ${web3.utils.fromWei(settleModal.amountWei, 'ether')} ETH`);
      }

      const receipt = await contract.methods.settleDebtByName(
        settleModal.groupId,
        settleModal.debtor,
        settleModal.creditor,
        settleModal.amountWei
      ).send({ 
        from: currentAccount, 
        value: settleModal.amountWei,
        gas: 3000000
      });

      setSettleSuccess(`Debt settled successfully! Amount: ${web3.utils.fromWei(settleModal.amountWei, 'ether')} ETH`);
      
      // Immediately refresh the debts list
      await fetchMemberDebts(settleModal.groupId);
      
      // Close modal after short delay
      setTimeout(() => {
        closeSettleModal();
      }, 2000);

    } catch (err) {
      let errorMessage = err.message;
      
      if (errorMessage.includes("revert")) {
        if (errorMessage.includes("Debtor username not found")) errorMessage = "Debtor not found";
        else if (errorMessage.includes("Creditor username not found")) errorMessage = "Creditor not found";
        else if (errorMessage.includes("Debtor has no debt")) errorMessage = "You don't owe this amount";
        else if (errorMessage.includes("Creditor is not owed")) errorMessage = "Creditor can't receive this amount";
        else if (errorMessage.includes("Cannot pay yourself")) errorMessage = "Can't pay yourself";
      }
      
      setSettleError(`Transaction failed: ${errorMessage}`);
    } finally {
      setSettleLoading(false);
    }
  };

  const renderDebtItem = (debt, idx, groupId) => {
    if (debt.settled) {
      return <span className="settled">Settled</span>;
    }

    return (
      <>
        <span>
          Owes {debt.amount} to {debt.creditorName}
        </span>
        <button
          onClick={() => openSettleModal(
            debt.debtorName,
            debt.creditorName,
            debt.amountWei,
            debt.amountEth,
            groupId
          )}
          className="tabx-secondary-btn"
          style={{ marginLeft: '10px' }}
        >
          Settle
        </button>
      </>
    );
  };

  return (
    <div className="tabx-container">
      <h1 className="tabx-heading">Group Debts</h1>

      {error && <div className="tabx-error">{error}</div>}

      {loading ? (
        <div className="tabx-status">Loading...</div>
      ) : selectedGroup ? (
        <div>
          <button
            onClick={() => setSelectedGroup(null)}
            className="tabx-secondary-btn"
            style={{ marginBottom: '20px' }}
          >
            ← Back to Groups
          </button>

          <h2 className="tabx-heading">Member Debts for Group #{selectedGroup}</h2>

          <div className="tabx-table-container">
            <table className="tabx-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Address</th>
                  <th>Net Balance</th>
                  <th>Status</th>
                  <th>Detailed Debts</th>
                </tr>
              </thead>
              <tbody>
                {memberDebts.map((member, i) => (
                  <tr key={i}>
                    <td>{member.username}</td>
                    <td>{member.address.substring(0, 8)}...</td>
                    <td>{member.formattedBalance} ETH</td>
                    <td>
                      {member.formattedBalance.startsWith('-') ? (
                        <span style={{ color: 'red' }}>You owe</span>
                      ) : member.formattedBalance === '0.00' ? (
                        <span>Settled</span>
                      ) : (
                        <span style={{ color: 'green' }}>Owes you</span>
                      )}
                    </td>
                    <td>
                      <div className="debts-details">
                        {member.debts.map((debt, idx) => (
                          <div key={idx} className="debt-item">
                            {renderDebtItem(debt, idx, selectedGroup)}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="tabx-grid">
          {groups.map(group => (
            <div key={group.id} className="tabx-group-card">
              <h3>{group.name}</h3>
              <p>ID: {group.id}</p>
              <p>Members: {group.memberCount}</p>
              <p>Total Spent: {group.totalExpenses} ETH</p>
              <button
                onClick={() => fetchMemberDebts(group.id)}
                className="tabx-primary-btn"
              >
                View Debts
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Settlement Modal */}
      {settleModal.show && (
        <div className="settle-modal-overlay">
          <div className="settle-modal">
            <div className="settle-modal-header">
              <h2>Settle Debt</h2>
              <button onClick={closeSettleModal} className="close-button">&times;</button>
            </div>
            
            {settleError && <div className="error-message">{settleError}</div>}
            {settleSuccess && <div className="success-message">{settleSuccess}</div>}

            <div className="debt-info">
              <p><strong>Group:</strong> {settleModal.groupId}</p>
              <p><strong>You Owe To:</strong> {settleModal.creditor}</p>
              <p><strong>Total Debt:</strong> {settleModal.amountEth} ETH ({settleModal.amountWei} WEI)</p>
            </div>

            <form onSubmit={handleSettle} className="settle-form">
              <div className="form-group">
                <label>Amount to Pay (wei)</label>
                <input
                  type="text"
                  value={settleModal.amountWei}
                  onChange={(e) => setSettleModal({
                    ...settleModal,
                    amountWei: e.target.value
                  })}
                  placeholder={`Max: ${settleModal.amountWei} wei`}
                  required
                />
                <small className="eth-value">
                  ≈ {web3.utils.fromWei(settleModal.amountWei || '0', 'ether')} ETH
                </small>
              </div>

              <div className="modal-buttons">
                <button 
                  type="button" 
                  onClick={closeSettleModal}
                  className="tabx-secondary-btn"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="tabx-primary-btn"
                  disabled={settleLoading || !settleModal.amountWei}
                >
                  {settleLoading ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDebtsPage;