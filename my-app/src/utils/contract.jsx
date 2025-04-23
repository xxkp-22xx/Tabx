// src/utils/contract.js
import Web3 from "web3";
import ABI from "../abi/TabX.json"; // Ensure ABI is up-to-date from Truffle

let web3;

// Initialize Web3 from MetaMask
if (window.ethereum) {
  web3 = new Web3(window.ethereum);
} else {
  alert("Please install MetaMask");
  throw new Error("MetaMask not found");
}

// Define your known network IDs
const NETWORKS = {
  LOCAL: '5777',     // Default Ganache CLI/Ganache GUI
  SEPOLIA: '11155111' // Sepolia testnet
};

const getContract = async () => {
  try {
    // Request wallet connection
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Detect network
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = ABI.networks[networkId];

    if (!deployedNetwork) {
      let message = `⚠️ Smart contract not deployed on network ID ${networkId}.`;
      if (networkId.toString() === NETWORKS.LOCAL) {
        message += "\nTry running `truffle migrate --reset --network development`.";
      } else if (networkId.toString() === NETWORKS.SEPOLIA) {
        message += "\nTry running `truffle migrate --reset --network sepolia`.";
      }
      throw new Error(message);
    }

    const instance = new web3.eth.Contract(ABI.abi, deployedNetwork.address);

    console.log(`✅ Connected to contract on network ID: ${networkId}`);
    return instance;
  } catch (err) {
    console.error("❌ Contract loading failed:", err.message);
    throw err;
  }
};

export { web3 };
export default getContract;
