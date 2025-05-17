# TabX – Blockchain-Based Expense Sharing App

**TabX** is a decentralized application (DApp) designed to simplify group expense tracking and settlements using Ethereum smart contracts. Built as a final project, it integrates a React frontend, Node.js backend, and Solidity smart contracts to provide a seamless experience for managing shared expenses.

---

## 🚀 Features

- **Smart Contracts**: Manage groups, expenses, and settlements on the Ethereum blockchain.
- **Frontend**: User-friendly interface built with React.
- **Backend**: RESTful API using Node.js and Express.js.
- **Database**: MongoDB for storing user and group data.
- **DevOps**: Dockerized setup with CI/CD pipelines using GitHub Actions.

---

## 🛠️ Tech Stack

- **Frontend**: React, JavaScript, CSS
- **Backend**: Node.js, Express.js
- **Smart Contracts**: Solidity, Truffle
- **Database**: MongoDB
- **DevOps**: Docker, GitHub Actions

---


## 📦 Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/)
- [Truffle](https://www.trufflesuite.com/truffle)
- [Ganache](https://www.trufflesuite.com/ganache) (for local blockchain testing)
- [Docker](https://www.docker.com/) (optional, for containerization)
- We will use Docker fully in AWS EC2 Instance.

---

## 🧑‍💻 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/xxkp-22xx/Tabx.git
cd Tabx
```

### 2. Install Dependencies
### Backend
```
cd backend
npm install
```

### 3. Install Frontend dependencies
```
cd ../frontend
npm install
```

### 4. Setting up .env file
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

### 5. Deploying the smart contract
```
cd ../truffle
npm install
truffle compile
truffle migrate --network development
```
## Make sure to change the latest deployed contract address in Utils/contract.js

### 6. Starting the server and frontend.
```
cd ../backend
npm start
```

```
cd ../my-app
npm start
```
