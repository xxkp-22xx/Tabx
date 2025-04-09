import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import web3 from '../utils/web3';
import contract from '../utils/contract';
import "../styles/styles.css";

const GroupDebts = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [memberDebts, setMemberDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const weiToEth = (weiValue, decimals = 2) => {
    try {
      if (weiValue === undefined || weiValue === null) return '0.00';
      const weiString = typeof weiValue === 'object' ? weiValue.toString() : String(weiValue);
      const cleanWei = weiString.split('.')[0];
      const ethValue = web3.utils.fromWei(cleanWei, 'ether');
      const parsed = parseFloat(ethValue);
      if (isNaN(parsed)) return '0.00';
      return parsed.toFixed(decimals);
    } catch (err) {
      console.error('Error converting wei to ETH:', err);
      return '0.00';
    }
  };

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const groupCount = await contract.methods.groupIdCounter().call();
        const loadedGroups = [];

        for (let i = 1; i <= groupCount; i++) {
          const group = await contract.methods.groups(i).call();
          const members = await contract.methods.getGroupMembers(i).call();
          const totalSpending = web3.utils.fromWei(group.totalExpenses, 'ether');

          loadedGroups.push({
            id: i,
            name: group.name,
            owner: group.owner,
            memberCount: members.length,
            totalSpending: totalSpending
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

        const userDebts = await contract.methods.getUserDebts(member, groupId).call();

        // Process each debt to get correct names
        const processedDebts = await Promise.all(
          userDebts.map(async (debt) => {
            // Get creditor user details
            const creditorUser = await contract.methods.users(debt.creditor).call();
            // Get debtor user details
            const debtorUser = await contract.methods.users(debt.debtor).call();
            
            return {
              ...debt,
              creditorName: creditorUser.username || debt.creditor.substring(0, 6) + '...',
              debtorName: debtorUser.username || debt.debtor.substring(0, 6) + '...',
              amountEth: web3.utils.fromWei(debt.amount, 'ether')
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
      setError(`Failed to load member debts: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
                  <th className="tabx-th">Member</th>
                  <th className="tabx-th">Address</th>
                  <th className="tabx-th">Net Balance</th>
                  <th className="tabx-th">Status</th>
                  <th className="tabx-th">Detailed Debts</th>
                </tr>
              </thead>
              <tbody>
                {memberDebts.map((member, i) => (
                  <tr key={i}>
                    <td className="tabx-td">{member.username}</td>
                    <td className="tabx-td">{member.address.substring(0, 8)}...</td>
                    <td className="tabx-td">{weiToEth(member.formattedBalance)} ETH</td>
                    <td className="tabx-td">
                      {member.formattedBalance.startsWith('-') ? (
                        <span style={{ color: 'red' }}>You owe</span>
                      ) : member.formattedBalance === '0.00' ? (
                        <span>Settled</span>
                      ) : (
                        <span style={{ color: 'green' }}>Owes you</span>
                      )}
                    </td>
                    <td className="tabx-td">
                      <div className="debts-details">
                        {member.debts.map((debt, idx) => (
                          <div key={idx} className="debt-item">
                            {debt.settled ? (
                              <span className="settled">Settled: </span>
                            ) : (
                              <>
                                {debt.debtor === member.address ? (
                                  <span>
                                    Owes {weiToEth(debt.amount)} ETH to {debt.creditorName}
                                  </span>
                                ) : (
                                  <span>
                                    Owed {weiToEth(debt.amount)} ETH by {debt.debtorName}
                                  </span>
                                )}
                                <Link
                                  to={`/groups/${selectedGroup}/settle`}
                                  state={{
                                    groupId: selectedGroup,
                                    debtor: debt.debtorName,
                                    creditor: debt.creditorName,
                                    amount: debt.amount,
                                    amountEth: debt.amountEth
                                  }}
                                  className="tabx-secondary-btn"
                                  style={{ marginLeft: '10px' }}
                                >
                                  Settle
                                </Link>
                              </>
                            )}
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
              <p>Total Spent: {group.totalSpending} ETH</p>
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
    </div>
  );
};

export default GroupDebts;