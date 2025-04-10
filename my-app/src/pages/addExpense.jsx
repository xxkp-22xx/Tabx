import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import web3 from '../utils/web3';
import contract from '../utils/contract';
import "../styles/styles.css";

const AddExpense = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [payerAddress, setPayerAddress] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchGroupMembers = async () => {
      try {
        setLoading(true);
        const members = await contract.methods.getGroupMembers(groupId).call();
        
        const membersWithDetails = await Promise.all(
          members.map(async (address) => {
            const user = await contract.methods.users(address).call();
            return {
              address,
              username: user.username || address.substring(0, 8) + '...'
            };
          })
        );
        setGroupMembers(membersWithDetails);
        
        // Set the first member as default payer and include in participants
        if (membersWithDetails.length > 0) {
          setPayerAddress(membersWithDetails[0].address);
          setParticipants([membersWithDetails[0].address]); // Include payer by default
        }
      } catch (err) {
        setError(`Failed to load group members: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupMembers();
  }, [groupId]);

  const handleAddParticipant = () => {
    if (selectedParticipant && !participants.includes(selectedParticipant)) {
      setParticipants([...participants, selectedParticipant]);
      setSelectedParticipant('');
    }
  };

  const handleRemoveParticipant = (index) => {
    const updated = [...participants];
    updated.splice(index, 1);
    setParticipants(updated);
  };

  const handlePayerChange = (address) => {
    setPayerAddress(address);
    // Ensure payer is always in participants
    if (!participants.includes(address)) {
      setParticipants([...participants, address]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || isNaN(amount)) {
      setError("Please enter a valid amount");
      return;
    }

    if (participants.length === 0) {
      setError("Please select at least one participant");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Convert amount to wei
      const amountInWei = web3.utils.toWei(amount, 'ether');
      console.log("Amount in Wei:", amountInWei);

      // Get usernames from addresses
      const participantUsernames = await Promise.all(
        participants.map(async (address) => {
          const user = await contract.methods.users(address).call();
          return user.username;
        })
      );

      await contract.methods
        .addExpense(
          groupId,
          amountInWei,
          participantUsernames
        )
        .send({ 
          from: payerAddress,
          gas: 3000000 
        });

      setSuccess("Expense added successfully!");
      setTimeout(() => navigate(`/groups/${groupId}`), 2000);
    } catch (err) {
      console.error("Error adding expense:", err);
      setError(`Failed to add expense: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tabx-container">
      <h1 className="tabx-heading">Add New Expense</h1>
      <h2 className="tabx-heading">Group ID: {groupId}</h2>

      {error && <div className="tabx-error">{error}</div>}
      {success && <div className="tabx-status">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="tabx-form-group">
          <label className="tabx-label">Payer:</label>
          <select
            value={payerAddress}
            onChange={(e) => handlePayerChange(e.target.value)}
            className="tabx-select"
          >
            {groupMembers.map((member, i) => (
              <option key={i} value={member.address}>
                {member.username} ({member.address.substring(0, 8)}...)
              </option>
            ))}
          </select>
        </div>

        <div className="tabx-form-group">
          <label className="tabx-label">Amount (ETH):</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tabx-input"
            placeholder="Enter amount"
          />
        </div>

        <div className="tabx-form-group">
          <label className="tabx-label">Participants (including payer):</label>
          <div className="tabx-member-selection">
            <select
              value={selectedParticipant}
              onChange={(e) => setSelectedParticipant(e.target.value)}
              className="tabx-select"
            >
              <option value="">Select participant</option>
              {groupMembers.map((member, i) => (
                <option 
                  key={i} 
                  value={member.address}
                  disabled={participants.includes(member.address)}
                >
                  {member.username} ({member.address.substring(0, 8)}...)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddParticipant}
              className="tabx-secondary-btn"
              disabled={!selectedParticipant}
            >
              Add
            </button>
          </div>
        </div>

        <div className="tabx-form-group">
          {participants.map((address, i) => {
            const member = groupMembers.find(m => m.address === address);
            const isPayer = address === payerAddress;
            return (
              <div key={i} className="tabx-member-item">
                <span>
                  {member?.username || address.substring(0, 8)}...
                  {isPayer && " (payer)"}
                </span>
                {!isPayer && (
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(i)}
                    className="tabx-small-btn"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          className="tabx-primary-btn"
          disabled={loading}
        >
          {loading ? "Processing..." : "Add Expense"}
        </button>
      </form>
    </div>
  );
};

export default AddExpense;