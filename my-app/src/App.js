import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GroupPage from './pages/group';
import AddExpense from './pages/addExpense';
import GroupDebts from './pages/groupDebts';
import NavBar from './pages/Navbar';
import SettleDebtPage from './pages/SettlementPage';

function App() {
  return (

    <BrowserRouter>
          <NavBar />
      <Routes>
        <Route path="/groups" element={<GroupPage />} />
        
        <Route path="/groups/:groupId/add-expense" element={<AddExpense />} />
        
        <Route path="/" element={<Navigate to="/groups" replace />} />

        <Route path="*" element={<Navigate to="/groups" replace />} />

        <Route path="/group-debts" element={<GroupDebts />} />

        <Route path="/groups/:groupId/settle" element={<SettleDebtPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;