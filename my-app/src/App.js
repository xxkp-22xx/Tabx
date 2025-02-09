import React, { useState, useEffect } from "react";
import Web3 from "./utils/web3";
import contract from "./utils/contract";

const App = () => {
  const [message, setMessage] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [account, setAccount] = useState("");

  useEffect(() => {
    const init = async () => {
      try {

        //Set the account of Ganache to make further transections
        const accounts = await Web3.eth.getAccounts();
        setAccount(accounts[0]);

        // Fetch initial message from contract
        const currentMessage = await contract.methods.message().call();
        setMessage(currentMessage);
      } catch (error) {
        console.error("Error connecting to contract:", error);
      }
    };

    init();
  }, []);

  const updateMessage = async () => {
    if (contract && account) {
      await contract.methods.setMessage(newMessage).send({ from: account });
      const updatedMessage = await contract.methods.message().call();
      setMessage(updatedMessage);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>TABX - Simplify Expenses, Apmlify trust</h1>
      <p><strong>Progress:</strong> {message}</p>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Enter new message"
      />
      <button onClick={updateMessage}>Update Progress</button>
    </div>
  );
};

export default App;
