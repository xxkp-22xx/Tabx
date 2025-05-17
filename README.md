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

---
# CI/CD Pipeline using Github actions and AWS EC2 Instance.

## Github Actions and AWS EC2.
- The script is already there in Guthub/workflows folder, CI.yml and CD.yml. Change or update as per your comfigurations.
- CI.yml will contain DockerHub Credentials, It will build an Docker image and push it to Dockerhub with Latest tag.
- After CI pipeline succedded, we will add a github action Runner in linux, and start it on EC2 instance terminal.
- After successfull connection, we will install docker related dependancies on it.
- CD.yml will pull the Docker Image from DockerHub using credentials in Secrets. Then it will run the container on 3001 port on AWS EC2 (make sure the security group allows all traffic to the instance)

### This is the workflow of pipeline, We devided it into two sections, Continuss Integration (CI) and Continuos Deployment (CD)
