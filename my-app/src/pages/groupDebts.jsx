import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import web3 from '../utils/web3';
import contract from '../utils/contract';
import "../styles/styles.css";


const GroupDebts = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [memberBalances, setMemberBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
          
          // Get total spending from the group's totalExpenses
          const totalSpending = parseFloat(web3.utils.fromWei(group.totalExpenses, 'ether'));
          
          loadedGroups.push({
            id: i,
            name: group.name,
            owner: group.owner,
            memberCount: members.length,
            totalSpending: totalSpending.toFixed(2)
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

  const fetchMemberBalances = async (groupId) => {
    try {
      setLoading(true);
      setError('');
      
      const members = await contract.methods.getGroupMembers(groupId).call();
      const balances = [];
      
      for (const member of members) {
        // Get user balance in the group
        const balanceWei = await contract.methods.getUserBalance(member, groupId).call();
        const balance = parseFloat(web3.utils.fromWei(balanceWei, 'ether')).toFixed(2);
        
        // Get user details
        const user = await contract.methods.users(member).call();
        
        balances.push({
          username: user.username || member.substring(0, 8) + '...',
          address: member,
          balance: balance
        });
      }
      
      setMemberBalances(balances);
      setSelectedGroup(groupId);
    } catch (err) {
      setError(`Failed to load member balances: ${err.message}`);
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
          
          <h2 className="tabx-heading">Member Balances for Group #{selectedGroup}</h2>
          
          <div className="tabx-table-container">
            <table className="tabx-table">
              <thead>
                <tr>
                  <th className="tabx-th">Member</th>
                  <th className="tabx-th">Address</th>
                  <th className="tabx-th">Balance (ETH)</th>
                  <th className="tabx-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {memberBalances.map((member, i) => (
                  <tr key={i}>
                    <td className="tabx-td">{member.username}</td>
                    <td className="tabx-td">{member.address.substring(0, 8)}...</td>
                    <td className="tabx-td">{member.balance}</td>
                    <td className="tabx-td">
                      {parseFloat(member.balance) > 0 ? (
                        <span style={{ color: 'green' }}>Owes you</span>
                      ) : parseFloat(member.balance) < 0 ? (
                        <span style={{ color: 'red' }}>You owe</span>
                      ) : (
                        <span>Settled</span>
                      )}
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
                onClick={() => fetchMemberBalances(group.id)}
                className="tabx-primary-btn"
              >
                View Balances
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupDebts;