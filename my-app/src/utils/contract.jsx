import web3 from "./web3";

// deployed contract's ABI
const abi = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "Users",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "userName",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "contributor",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
      },
      {
        "inputs": [],
        "name": "message",
        "outputs": [
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
      },
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "newMessage",
            "type": "string"
          }
        ],
        "name": "setMessage",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
];


// our contract's deployed address
const address = "0xe71350C8d11d61F4eb7C06fE243b3FBf0E3fDA48";

const contract = new web3.eth.Contract(abi, address);

export default contract;
